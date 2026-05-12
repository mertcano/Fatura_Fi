"""
Train an XGBoost risk scoring model on the synthetic invoice dataset.

The model predicts probability of default within the invoice's payment term.
Output: a calibrated risk score (0-100) plus SHAP-based feature attributions
so investors can see WHY a specific invoice received its score.

Run: python train_model.py
Output: ml/model.json, ml/feature_encoder.json, ml/metrics.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss, classification_report

BASE = Path(__file__).parent.parent
DATA = BASE / "data" / "invoices.csv"
ML = BASE / "ml"

CATEGORICAL = ["sector", "buyer_tier", "macro_scenario"]
NUMERICAL = [
    "amount_try", "term_days", "sme_age_months", "sme_prior_invoices",
    "sme_ontime_ratio", "buyer_repeat_count", "buyer_avg_days_late",
]


def encode(df: pd.DataFrame, encoder: dict | None = None) -> tuple[pd.DataFrame, dict]:
    """One-hot encode categoricals. Returns encoded df and the encoder spec."""
    if encoder is None:
        encoder = {col: sorted(df[col].unique().tolist()) for col in CATEGORICAL}
    pieces = [df[NUMERICAL].copy()]
    for col, levels in encoder.items():
        for lv in levels:
            pieces.append(pd.Series((df[col] == lv).astype(int), name=f"{col}__{lv}"))
    return pd.concat(pieces, axis=1), encoder


def main():
    df = pd.read_csv(DATA)
    y = df["defaulted"].astype(int)
    X_full, encoder = encode(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X_full, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba)
    brier = brier_score_loss(y_test, proba)

    print(f"Test AUC: {auc:.4f}")
    print(f"Brier score: {brier:.4f}  (lower is better, 0 = perfect)")
    print(f"\nClassification report (threshold=0.5):")
    print(classification_report(y_test, (proba > 0.5).astype(int)))

    # Persist model + encoder
    ML.mkdir(exist_ok=True)
    model.save_model(ML / "model.json")
    with open(ML / "feature_encoder.json", "w") as f:
        json.dump({
            "categorical": encoder,
            "numerical": NUMERICAL,
            "feature_order": X_full.columns.tolist(),
        }, f, indent=2)

    metrics = {
        "test_auc": float(auc),
        "brier_score": float(brier),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "default_rate_train": float(y_train.mean()),
        "feature_importance_top_10": [
            {"feature": f, "importance": float(i)}
            for f, i in sorted(
                zip(X_full.columns, model.feature_importances_),
                key=lambda x: -x[1],
            )[:10]
        ],
    }
    with open(ML / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nTop features driving predictions:")
    for item in metrics["feature_importance_top_10"]:
        print(f"  {item['feature']:35s} {item['importance']:.4f}")
    print(f"\nSaved to {ML}/")


if __name__ == "__main__":
    main()
