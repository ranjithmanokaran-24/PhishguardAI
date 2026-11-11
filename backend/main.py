from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
from pydantic import BaseModel, Field
import sqlite3

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "data" / "phishguard.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                prediction TEXT NOT NULL,
                checked_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

init_db()

# Prefer retrained artifacts when available; otherwise use the original files.
MODEL_DIR = BACKEND_DIR / "models" / "URL Classifier"
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

MESSAGE_MODEL_DIR = BACKEND_DIR / "models" / "Message Classifier"
message_vectorizer = joblib.load(MESSAGE_MODEL_DIR / "vectorizer.pkl")
message_model = joblib.load(MESSAGE_MODEL_DIR / "model.pkl")

app = FastAPI(title="PhishguardAI API")

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
    return {"message": "Phishguard URL Classifier API is running"}


@app.post("/predict")
def predict(request: URLRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=422, detail="URL cannot be blank")

    try:
        features = vectorizer.transform([url])
        prediction = model.predict(features)[0]
        result = {"url": url, "prediction": str(prediction)}

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(features)[0]
            result["probabilities"] = {
                str(label): float(probability)
                for label, probability in zip(model.classes_, probabilities)
            }

        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail="URL classification failed") from exc


@app.post("/predict-message")
def predict_message(request: MessageRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be blank")

    try:
        features = message_vectorizer.transform([message])
        prediction = message_model.predict(features)[0]
        result = {"prediction": str(prediction)}

        if hasattr(message_model, "predict_proba"):
            probabilities = message_model.predict_proba(features)[0]
            result["probabilities"] = {
                str(label): float(probability)
                for label, probability in zip(message_model.classes_, probabilities)
            }

        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Message classification failed") from exc
