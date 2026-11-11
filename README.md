# PhishguardAI

PhishguardAI is a small web application that checks URLs and text messages for patterns associated with phishing or scams. It uses a FastAPI backend, scikit-learn models, and an HTML/CSS/JavaScript frontend served by Vite.

> **Use results as a warning signal, not a guarantee.** A model prediction does not prove that a URL or message is safe or malicious. The URL classifier analyzes the URL text; it does not open the site or inspect its live webpage.

## Features

- Check a URL in the browser interface.
- Classify a text message using a separate message model.
- Use the JSON API or its interactive `/docs` page.
- Retrain the URL model from the PhiUSIIL dataset.

## How it works

For URL checks, the backend transforms the URL with a saved TF-IDF vectorizer and sends the resulting features to a logistic-regression classifier. The selected model artifacts are loaded from `backend/models/URL Classifier/trained/` when both files are present; otherwise the backend falls back to the original files in `backend/models/URL Classifier/`.

Message checks use their own saved vectorizer and classifier from `backend/models/Message Classifier/`. The app maps common model labels such as `ham` and `spam` to `legitimate` and `scam`.

The current URL model uses URL text only. Although the PhiUSIIL dataset includes additional webpage-derived features, this app does not fetch pages to calculate those features.

## Project files

```text
PhishguardAI/
├── backend/
│   ├── main.py                     # FastAPI routes, model loading, and SQLite history
│   ├── train_model.py              # Train and evaluate the URL classifier
│   ├── requirements.txt            # Python dependencies
│   ├── data/                       # Local SQLite history (created at runtime)
│   └── models/
│       ├── URL Classifier/         # URL model artifacts and training metadata
│       └── Message Classifier/     # Message model artifacts
├── frontend/
│   ├── app/                        # Vite frontend (index.html, style.css, script.js)
│   └── legacy-static/              # Standalone HTML frontend
├── .gitignore                      # Excludes local environments and databases
└── README.md
```

The active Vite page uses the standalone files in `frontend/app/`. The earlier React implementation remains in `frontend/app/src/` but is not currently loaded by `index.html`.

Keep each model beside the vectorizer it was trained with. The message endpoint expects both files in `backend/models/Message Classifier/`.

## Requirements

- Python 3.14 (the dependency file pins scikit-learn 1.9.1 for this runtime)
- Windows, macOS, or Linux

## Run locally on Windows

Open PowerShell in the project folder and run:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Then open:

- Website: <http://127.0.0.1:8000/>
- API documentation and manual testing: <http://127.0.0.1:8000/docs>

The app creates `backend/data/phishguard.db` on startup. You do not need to create the SQLite database manually.

Open a second VS Code terminal to start the website:

```powershell
cd frontend\app
npm install
npm run dev
```

Open the local URL printed by Vite, usually <http://localhost:5173/>. Keep both the backend and frontend terminals running. The frontend sends URL and message scans to the backend at `http://127.0.0.1:8000`.

## API endpoints

### `POST /predict`

Classifies a URL.

Request:

```json
{
  "url": "https://example.com"
}
```

The response includes the submitted URL, predicted label, and class probabilities when supported by the model.

### `POST /predict-message`

Classifies text with the message model. Message checks are not currently added to the URL scan history.

Request:

```json
{
  "message": "Your account is locked. Click here immediately to verify."
}
```

That sentence is a synthetic test example, not a real account notice or a link to follow.

The response contains the model's predicted label and class probabilities when supported by the model.

## Retrain the URL classifier

The trainer accepts either the PhiUSIIL CSV file or a ZIP containing exactly one CSV. The CSV must include `URL` and `label`; if a `Domain` column is present, it is used to keep domains separate between the training and evaluation groups. The trainer uses only `URL` and `label` for model input.

The source dataset uses `1 = legitimate` and `0 = phishing`; the training script maps these to `legitimate` and `scam`. See the [UCI PhiUSIIL dataset page](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) for the source and dataset details.

Run the trainer with the path to your downloaded dataset:

```powershell
.\.venv\Scripts\python.exe backend\train_model.py "C:\path\to\phiusiil+phishing+url+dataset.zip"
```

The script reports metrics on domains held out from training, then retrains on all valid unique URLs and saves new artifacts into `backend/models/URL Classifier/trained/`. Restart the app after training so it loads the updated artifacts. Do not use the reported benchmark as a promise of accuracy on new, live URLs.

The current URL model was trained from 640,052 unique URLs in the supplied archive after normalizing 651,191 rows and dropping conflicting duplicate URLs. On the held-out-domain evaluation, accuracy was 93.37% and scam recall was 86.09%. These scores describe this dataset split only; they do not guarantee performance on new URLs.

## Message model notebook

The message model was prepared with the [Scam Message Classifier Colab notebook](https://colab.research.google.com/drive/17t07gN2BxJ0v_ZWMnkV6C7b9KV_AiLEb?usp=sharing). The notebook’s data uses a `message` column and labels that are normalized to `legitimate` and `scam`. Export the trained `model.pkl` and `vectorizer.pkl` together into `backend/models/Message Classifier/` when replacing those artifacts.

## Deploy on Render using GitHub

1. In GitHub Desktop, review the changes, commit them to `main`, and push to the linked GitHub repository. Include the model files under both classifier folders; `.gitignore` excludes virtual environments and the local database.
2. In Render, create a **Web Service** and connect the GitHub repository and `main` branch.
3. Set the build command to:

   ```text
   pip install -r backend/requirements.txt
   ```

4. Set the start command to:

   ```text
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```

5. Deploy, wait for the service to become live, then open the `onrender.com` URL.

Render’s default service filesystem is temporary. The URL scan history in `backend/data/phishguard.db` can be lost after a restart or redeploy unless you move history storage to a persistent disk or hosted database. See [Render’s filesystem and storage notes](https://render.com/docs/faq).

## Limitations and safety

- Predictions and probabilities are model outputs, not verified threat-intelligence results.
- The URL model checks URL text and does not inspect the live website, redirects, certificates, or page content.
- The message model’s results depend on the training data and may not generalize to every language, message style, or current scam.
- Do not open suspicious links as a way to test the classifier.
- Pickle/joblib model files can execute code when loaded. Only deploy model artifacts you trust.
- The SQLite file is local development data; `.gitignore` prevents it from being committed.
