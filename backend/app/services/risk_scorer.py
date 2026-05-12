"""
Risk scoring service. Loads the trained XGBoost model and returns:
  - risk_score (0-100, higher = riskier)
  - default_probability
  - suggested_interest_rate (annualized, based on risk + term)
  - top_drivers (SHAP-based feature attributions for explainability)
  - grade (A/B/C/D letter rating)
"""

import json
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from pydantic import BaseModel, Field

ML_DIR = Path(__file__).parent.parent.parent / "ml"


class InvoiceInput(BaseModel):
    sector: Literal[
        "textile", "construction", "food_beverage", "automotive",
        "electronics", "logistics", "retail", "agriculture", "services",
    ]
    buyer_tier: Literal["enterprise", "mid_market", "small_business", "micro"]
    macro_scenario: Literal["stable", "high_inflation", "currency_shock"] = "stable"
    amount_try: float = Field(gt=0)
    term_days: int = Field(ge=15, le=180)
    sme_age_months: int = Field(ge=0)
    sme_prior_invoices: int = Field(ge=0)
    sme_ontime_ratio: float = Field(ge=0, le=1)
    buyer_repeat_count: int = Field(ge=0)
    buyer_avg_days_late: float = Field(ge=0)


class RiskDriver(BaseModel):
    feature: str
    impact: float  # SHAP value; positive = increases risk
    direction: Literal["increases_risk", "reduces_risk"]
    human_label: str


class RiskAssessment(BaseModel):
    risk_score: int  # 0-100, higher = riskier
    grade: Literal["A", "B", "C", "D", "E"]
    default_probability: float
    suggested_interest_rate_annual: float  # decimal, e.g. 0.18 = 18%
    suggested_discount_rate: float  # decimal discount on face value
    top_drivers: list[RiskDriver]
    model_version: str = "xgb-v1"


FEATURE_LABELS = {
    "amount_try": "Invoice amount",
    "term_days": "Payment term length",
    "sme_age_months": "SME business age",
    "sme_prior_invoices": "SME track record",
    "sme_ontime_ratio": "SME on-time payment ratio",
    "buyer_repeat_count": "Buyer repeat history",
    "buyer_avg_days_late": "Buyer payment delays",
    "sector__textile": "Sector: Textile",
    "sector__construction": "Sector: Construction",
    "sector__food_beverage": "Sector: Food & beverage",
    "sector__automotive": "Sector: Automotive",
    "sector__electronics": "Sector: Electronics",
    "sector__logistics": "Sector: Logistics",
    "sector__retail": "Sector: Retail",
    "sector__agriculture": "Sector: Agriculture",
    "sector__services": "Sector: Services",
    "buyer_tier__enterprise": "Buyer size: Enterprise",
    "buyer_tier__mid_market": "Buyer size: Mid-market",
    "buyer_tier__small_business": "Buyer size: Small business",
    "buyer_tier__micro": "Buyer size: Micro-business",
    "macro_scenario__stable": "Macro: Stable economy",
    "macro_scenario__high_inflation": "Macro: High inflation",
    "macro_scenario__currency_shock": "Macro: Currency shock",
}


class RiskScorer:
    def __init__(self):
        self.model = xgb.XGBClassifier()
        self.model.load_model(ML_DIR / "model.json")
        with open(ML_DIR / "feature_encoder.json") as f:
            self.encoder = json.load(f)
        self.explainer = shap.TreeExplainer(self.model)

    def _encode(self, inv: InvoiceInput) -> pd.DataFrame:
        row = {col: getattr(inv, col) for col in self.encoder["numerical"]}
        for cat_col, levels in self.encoder["categorical"].items():
            for lv in levels:
                row[f"{cat_col}__{lv}"] = int(getattr(inv, cat_col) == lv)
        return pd.DataFrame([row])[self.encoder["feature_order"]]

    @staticmethod
    def _grade(score: int) -> str:
        if score <= 20: return "A"
        if score <= 40: return "B"
        if score <= 60: return "C"
        if score <= 80: return "D"
        return "E"

    @staticmethod
    def _suggested_rate(prob: float, term_days: int) -> tuple[float, float]:
        """Risk-adjusted annual interest rate and per-invoice discount."""
        # Base TRY risk-free rate (~CBRT policy rate proxy)
        base_rate = 0.42
        # Risk premium scales with default probability
        risk_premium = prob * 2.5
        annual_rate = float(np.clip(base_rate + risk_premium, 0.45, 1.20))
        # Convert to per-invoice discount on face value
        discount = annual_rate * (term_days / 365.0)
        discount = float(np.clip(discount, 0.01, 0.40))
        return annual_rate, discount

    def score(self, inv: InvoiceInput) -> RiskAssessment:
        X = self._encode(inv)
        prob = float(self.model.predict_proba(X)[0, 1])
        risk_score = int(round(prob * 100))

        # SHAP attributions for THIS invoice
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        contributions = list(zip(X.columns.tolist(), shap_values[0]))
        contributions.sort(key=lambda x: -abs(x[1]))

        drivers = []
        for feat, val in contributions[:5]:
            drivers.append(RiskDriver(
                feature=feat,
                impact=float(val),
                direction="increases_risk" if val > 0 else "reduces_risk",
                human_label=FEATURE_LABELS.get(feat, feat),
            ))

        annual, discount = self._suggested_rate(prob, inv.term_days)

        return RiskAssessment(
            risk_score=risk_score,
            grade=self._grade(risk_score),
            default_probability=round(prob, 4),
            suggested_interest_rate_annual=round(annual, 4),
            suggested_discount_rate=round(discount, 4),
            top_drivers=drivers,
        )
