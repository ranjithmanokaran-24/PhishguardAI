"""Train the URL-text classifier from the PhiUSIIL CSV or ZIP dataset.

The source dataset labels are 1 = legitimate and 0 = phishing. This script
maps them to the backend's string labels: legitimate and scam.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import zipfile
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit


DEFAULT_DATASET = Path(
    r"C:\Users\RANJITH M\Downloads\phiusiil+phishing+url+dataset.zip"
)
DEFAULT_OUTPUT = (
    Path(__file__).resolve().parent / "models" / "URL Classifier" / "trained"
)
LABEL_ORDER = ["legitimate", "scam"]


def open_csv(dataset: Path):
    if dataset.suffix.lower() == ".zip":
        archive = zipfile.ZipFile(dataset)
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(csv_names) != 1:
            archive.close()
            raise ValueError(f"Expected one CSV in {dataset}, found {len(csv_names)}")
        raw_file = archive.open(csv_names[0])
        text_file = io.TextIOWrapper(raw_file, encoding="utf-8-sig", newline="")
        return archive, text_file

    return None, dataset.open("r", encoding="utf-8-sig", newline="")


def read_dataset(dataset: Path):
    archive, csv_file = open_csv(dataset)
    records: dict[str, tuple[str, str, str]] = {}
    conflicts: set[str] = set()
    try:
        reader = csv.DictReader(csv_file)
        if not reader.fieldnames:
            raise ValueError("Dataset CSV is empty or has no header row")
        columns = {name.strip().lower(): name for name in reader.fieldnames}
        for required in ("url", "label"):
            if required not in columns:
                raise ValueError(f"Dataset must contain a '{required}' column")

        for row in reader:
            url = (row.get(columns["url"]) or "").strip()
            raw_label = (row.get(columns["label"]) or "").strip()
            if not url or raw_label not in {"0", "1"}:
                continue

            # UCI PhiUSIIL convention: 1 = legitimate, 0 = phishing.
            label = "legitimate" if raw_label == "1" else "scam"
            domain_column = columns.get("domain")
            domain = (row.get(domain_column) or "").strip() if domain_column else ""
            domain = domain.lower() or url.lower()

            previous = records.get(url)
            if previous and previous[1] != label:
                conflicts.add(url)
            else:
                records[url] = (url, label, domain)
    finally:
        csv_file.close()
        if archive is not None:
            archive.close()

    for url in conflicts:
        records.pop(url, None)

    if not records:
        raise ValueError("No valid URL rows were found in the dataset")

    urls = [record[0] for record in records.values()]
    labels = np.asarray([record[1] for record in records.values()])
    # Object dtype avoids allocating a fixed-width Unicode slot as wide as the
    # longest fallback URL for every row in large datasets.
    domains = np.asarray([record[2] for record in records.values()], dtype=object)
    if len(set(labels)) != 2:
        raise ValueError("Dataset must contain both legitimate and phishing labels")
    return urls, labels, domains, len(conflicts)


def make_vectorizer():
    return TfidfVectorizer(
        analyzer="char",
        ngram_range=(3, 5),
        min_df=2,
        max_features=300_000,
        sublinear_tf=True,
        dtype=np.float32,
    )


def make_model():
    return LogisticRegression(max_iter=1000, solver="liblinear", random_state=42)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", nargs="?", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    urls, labels, domains, conflicts = read_dataset(args.dataset)
    print(f"Loaded {len(urls):,} unique URLs; dropped {conflicts:,} conflicting URLs.")
    print(
        "Labels after mapping: "
        f"legitimate={(labels == 'legitimate').sum():,}, "
        f"scam={(labels == 'scam').sum():,}"
    )

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_indices, test_indices = next(splitter.split(urls, labels, groups=domains))
    vectorizer = make_vectorizer()
    train_features = vectorizer.fit_transform([urls[i] for i in train_indices])
    test_features = vectorizer.transform([urls[i] for i in test_indices])
    model = make_model()
    model.fit(train_features, labels[train_indices])
    predictions = model.predict(test_features)

    print("\nHeld-out-domain evaluation (test domains were not in training):")
    print(
        classification_report(
            labels[test_indices], predictions, labels=LABEL_ORDER,
            target_names=LABEL_ORDER, digits=4, zero_division=0
        )
    )
    print("Confusion matrix (rows=true, columns=predicted; legitimate, scam):")
    print(confusion_matrix(labels[test_indices], predictions, labels=LABEL_ORDER))

    # Refit on all labeled URLs after evaluation for the model used by the API.
    final_vectorizer = make_vectorizer()
    all_features = final_vectorizer.fit_transform(urls)
    final_model = make_model()
    final_model.fit(all_features, labels)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_vectorizer, args.output_dir / "vectorizer.pkl", compress=3)
    joblib.dump(final_model, args.output_dir / "model.pkl", compress=3)
    metadata = {
        "dataset": args.dataset.name,
        "rows_used": len(urls),
        "conflicting_urls_dropped": conflicts,
        "input_feature": "URL text only",
        "source_label_mapping": {"1": "legitimate", "0": "scam"},
        "held_out_test_rows": int(len(test_indices)),
        "held_out_test_domains": int(len(set(domains[test_indices]))),
        "scikit_learn_version": __import__("sklearn").__version__,
    }
    (args.output_dir / "training_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(f"\nSaved trained artifacts to: {args.output_dir.resolve()}")


if __name__ == "__main__":
    main()
