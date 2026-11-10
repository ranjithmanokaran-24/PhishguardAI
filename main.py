from pathlib import Path
import sqlite3
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse
from fastapi import Query


# Prefer retrained artifacts when available; otherwise use the original files.
MODEL_DIR = Path(__file__).resolve().parent / "URL Classifier"
TRAINED_DIR = MODEL_DIR / "trained"
ARTIFACTS_DIR = (
    TRAINED_DIR
    if (TRAINED_DIR / "model.pkl").is_file()
    and (TRAINED_DIR / "vectorizer.pkl").is_file()
    else MODEL_DIR
)


def load_artifact(filename: str):
    path = ARTIFACTS_DIR / filename
    if not path.is_file():
        raise RuntimeError(f"Model file not found: {path}")
    return joblib.load(path)


vectorizer = load_artifact("vectorizer.pkl")
model = load_artifact("model.pkl")

app = FastAPI(title="Phishguard URL Classifier")
DB_PATH = Path(__file__).resolve().parent / "phishguard.db"


def init_db():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                prediction TEXT NOT NULL,
                legitimate_probability REAL,
                scam_probability REAL,
                checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def save_scan(url: str, prediction: str, probabilities: dict[str, float]):
    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            INSERT INTO scans
                (url, prediction, legitimate_probability, scam_probability)
            VALUES (?, ?, ?, ?)
            """,
            (
                url,
                prediction,
                probabilities.get("legitimate"),
                probabilities.get("scam"),
            ),
        )
        return cursor.lastrowid


init_db()

# Allows a local web frontend to call this API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class URLRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class MessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)


@app.get("/")
def home():
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")


@app.post("/predict")
def predict(request: URLRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=422, detail="URL cannot be blank")

    try:
        features = vectorizer.transform([url])
        prediction = model.predict(features)[0]
        prediction = str(prediction)
        probabilities = {}

        if hasattr(model, "predict_proba"):
            scores = model.predict_proba(features)[0]
            probabilities = {
                str(label): float(score)
                for label, score in zip(model.classes_, scores)
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="URL classification failed") from exc

    try:
        scan_id = save_scan(url, prediction, probabilities)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail="Could not save scan history") from exc

    result = {"id": scan_id, "url": url, "prediction": prediction}
    if probabilities:
        result["probabilities"] = probabilities
    return result


@app.get("/history")
def history(limit: int = Query(default=20, ge=1, le=100)):
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, url, prediction, legitimate_probability,
                   scam_probability, checked_at
            FROM scans
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return {"scans": [dict(row) for row in rows]}


MESSAGE_MODEL_DIR = Path(__file__).resolve().parent / "Message Classifier"


@lru_cache(maxsize=1)
def load_message_artifacts():
    model_path = MESSAGE_MODEL_DIR / "model.pkl"
    vectorizer_path = MESSAGE_MODEL_DIR / "vectorizer.pkl"
    if not model_path.is_file() or not vectorizer_path.is_file():
        raise HTTPException(
            status_code=503,
            detail=(
                "Message model files are missing. Add model.pkl and vectorizer.pkl "
                "to the 'Message Classifier' folder."
            ),
        )
    return joblib.load(model_path), joblib.load(vectorizer_path)


def normalize_message_label(label: str) -> str:
    normalized = label.strip().lower()
    if normalized in {"spam", "scam", "phishing", "fraud"}:
        return "scam"
    if normalized in {"ham", "legitimate", "legit", "safe"}:
        return "legitimate"
    return label


@app.post("/predict-message")
def predict_message(request: MessageRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be blank")

    message_model, message_vectorizer = load_message_artifacts()
    try:
        features = message_vectorizer.transform([message])
        raw_prediction = str(message_model.predict(features)[0])
        prediction = normalize_message_label(raw_prediction)
        result = {"prediction": prediction}

        if hasattr(message_model, "predict_proba"):
            scores = message_model.predict_proba(features)[0]
            result["probabilities"] = {
                normalize_message_label(str(label)): float(score)
                for label, score in zip(message_model.classes_, scores)
            }
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail="Message classification failed"
        ) from exc
