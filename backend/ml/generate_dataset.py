"""
Synthetic invoice dataset generator for FaturaFi risk scoring model.

Models the Turkish SME (KOBİ) factoring market with realistic distributions
across sectors, payment terms, and historical default patterns.

Run: python generate_dataset.py
Output: data/invoices.csv (10,000 rows)
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

# Turkish SME sector distribution (TÜİK 2024 approximation)
SECTORS = {
    "textile": {"weight": 0.18, "base_default_rate": 0.08, "avg_term_days": 90},
    "construction": {"weight": 0.15, "base_default_rate": 0.14, "avg_term_days": 120},
    "food_beverage": {"weight": 0.14, "base_default_rate": 0.05, "avg_term_days": 60},
    "automotive": {"weight": 0.10, "base_default_rate": 0.06, "avg_term_days": 75},
    "electronics": {"weight": 0.09, "base_default_rate": 0.07, "avg_term_days": 60},
    "logistics": {"weight": 0.08, "base_default_rate": 0.09, "avg_term_days": 45},
    "retail": {"weight": 0.10, "base_default_rate": 0.06, "avg_term_days": 30},
    "agriculture": {"weight": 0.07, "base_default_rate": 0.11, "avg_term_days": 90},
    "services": {"weight": 0.09, "base_default_rate": 0.05, "avg_term_days": 30},
}

# Buyer company size tiers (larger = more reliable)
BUYER_TIERS = {
    "enterprise": {"weight": 0.15, "default_multiplier": 0.3},   # BIST-listed, multinationals
    "mid_market": {"weight": 0.35, "default_multiplier": 0.7},   # Mid-size corporates
    "small_business": {"weight": 0.40, "default_multiplier": 1.4},
    "micro": {"weight": 0.10, "default_multiplier": 2.1},
}

# Macro indicators (Turkish economy proxies)
MACRO_SCENARIOS = {
    "stable": {"weight": 0.5, "stress": 1.0},
    "high_inflation": {"weight": 0.3, "stress": 1.4},
    "currency_shock": {"weight": 0.2, "stress": 1.8},
}


def sample_weighted(d: dict) -> str:
    keys = list(d.keys())
    weights = [d[k]["weight"] for k in keys]
    return np.random.choice(keys, p=np.array(weights) / sum(weights))


def generate_invoice() -> dict:
    sector = sample_weighted(SECTORS)
    buyer_tier = sample_weighted(BUYER_TIERS)
    macro = sample_weighted(MACRO_SCENARIOS)

    sector_data = SECTORS[sector]
    tier_data = BUYER_TIERS[buyer_tier]
    macro_data = MACRO_SCENARIOS[macro]

    # Invoice amount (TRY) - log-normal distribution
    amount_try = float(np.random.lognormal(mean=10.8, sigma=1.1))
    amount_try = float(np.clip(amount_try, 5_000, 5_000_000))

    # Payment terms
    term_days = int(np.clip(
        np.random.normal(sector_data["avg_term_days"], 20),
        15, 180
    ))

    # SME history (months in business, prior on-time payments)
    sme_age_months = int(np.clip(np.random.exponential(48), 6, 360))
    sme_prior_invoices = int(np.random.poisson(min(sme_age_months / 2, 50)))
    sme_ontime_ratio = float(np.clip(np.random.beta(8, 2), 0.4, 1.0))

    # Buyer history (concentration risk indicator)
    buyer_repeat_count = int(np.random.poisson(3))
    buyer_avg_days_late = float(np.clip(np.random.exponential(5), 0, 60))

    # Compute realistic default probability
    base_p = sector_data["base_default_rate"]
    p_default = base_p * tier_data["default_multiplier"] * macro_data["stress"]
    # Term length penalty
    p_default *= 1.0 + (term_days - 60) / 200
    # SME history adjustment
    p_default *= 1.0 - 0.4 * (sme_ontime_ratio - 0.7)
    # Buyer payment behavior
    p_default *= 1.0 + buyer_avg_days_late / 30
    # Amount risk (very large invoices on small buyers = risky)
    if buyer_tier in ("small_business", "micro") and amount_try > 500_000:
        p_default *= 1.5
    p_default = float(np.clip(p_default, 0.005, 0.85))

    # Realized outcome (with some noise so model has signal but not deterministic)
    defaulted = int(np.random.random() < p_default)
    days_late = 0
    if defaulted:
        days_late = int(np.random.exponential(45)) + 10
    elif np.random.random() < 0.25:
        days_late = int(np.random.exponential(8))

    return {
        "sector": sector,
        "buyer_tier": buyer_tier,
        "macro_scenario": macro,
        "amount_try": round(amount_try, 2),
        "term_days": term_days,
        "sme_age_months": sme_age_months,
        "sme_prior_invoices": sme_prior_invoices,
        "sme_ontime_ratio": round(sme_ontime_ratio, 3),
        "buyer_repeat_count": buyer_repeat_count,
        "buyer_avg_days_late": round(buyer_avg_days_late, 1),
        "true_default_prob": round(p_default, 4),
        "defaulted": defaulted,
        "days_late": days_late,
    }


def main(n: int = 10_000):
    rows = [generate_invoice() for _ in range(n)]
    df = pd.DataFrame(rows)
    out = Path(__file__).parent.parent / "data" / "invoices.csv"
    out.parent.mkdir(exist_ok=True)
    df.to_csv(out, index=False)
    print(f"Generated {len(df)} synthetic invoices -> {out}")
    print(f"Default rate: {df['defaulted'].mean():.2%}")
    print(f"Sector distribution:\n{df['sector'].value_counts(normalize=True)}")


if __name__ == "__main__":
    main()
