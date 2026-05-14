"""
FaturaFi API - main FastAPI application.

Endpoints:
  POST /api/invoices              Create + score a new invoice
  GET  /api/invoices              List all invoices (marketplace)
  GET  /api/invoices/{id}         Get invoice details
  POST /api/invoices/{id}/fund    Mark invoice as funded by an investor
  POST /api/invoices/{id}/settle  Mark invoice as settled (buyer paid)
  GET  /api/portfolio/{wallet}    Get investor portfolio
  GET  /api/health                Health check
"""

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, JSON
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from app.services.risk_scorer import RiskScorer, InvoiceInput, RiskAssessment

# Database setup (SQLite for dev, swap to Postgres in prod)
DB_PATH = Path(__file__).parent.parent / "faturafi.db"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String, primary_key=True)
    sme_wallet = Column(String, nullable=False, index=True)
    sme_name = Column(String, nullable=False)
    buyer_name = Column(String, nullable=False)
    sector = Column(String, nullable=False)
    buyer_tier = Column(String, nullable=False)
    macro_scenario = Column(String, default="stable")
    amount_try = Column(Float, nullable=False)
    amount_usdc = Column(Float, nullable=False)  # Tokenized in USDC
    term_days = Column(Integer, nullable=False)
    sme_age_months = Column(Integer, nullable=False)
    sme_prior_invoices = Column(Integer, default=0)
    sme_ontime_ratio = Column(Float, default=0.85)
    buyer_repeat_count = Column(Integer, default=0)
    buyer_avg_days_late = Column(Float, default=0)

    risk_score = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    default_probability = Column(Float, nullable=False)
    suggested_discount_rate = Column(Float, nullable=False)
    risk_drivers = Column(JSON)

    status = Column(String, default="listed")  # listed | funded | settled | defaulted
    nft_mint_address = Column(String, nullable=True)
    investor_wallet = Column(String, nullable=True)
    funded_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=False)
    settled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(engine)


# Pydantic schemas
class InvoiceCreate(BaseModel):
    sme_wallet: str
    sme_name: str
    buyer_name: str
    sector: Literal[
        "textile", "construction", "food_beverage", "automotive",
        "electronics", "logistics", "retail", "agriculture", "services",
    ]
    buyer_tier: Literal["enterprise", "mid_market", "small_business", "micro"]
    macro_scenario: Literal["stable", "high_inflation", "currency_shock"] = "stable"
    amount_try: float = Field(gt=0)
    term_days: int = Field(ge=15, le=180)
    sme_age_months: int = Field(ge=0, default=24)
    sme_prior_invoices: int = Field(ge=0, default=0)
    sme_ontime_ratio: float = Field(ge=0, le=1, default=0.85)
    buyer_repeat_count: int = Field(ge=0, default=0)
    buyer_avg_days_late: float = Field(ge=0, default=0)


class InvoiceResponse(BaseModel):
    id: str
    sme_wallet: str
    sme_name: str
    buyer_name: str
    sector: str
    buyer_tier: str
    amount_try: float
    amount_usdc: float
    term_days: int
    risk_score: int
    grade: str
    default_probability: float
    suggested_discount_rate: float
    risk_drivers: list[dict] | None
    status: str
    nft_mint_address: str | None
    investor_wallet: str | None
    due_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class FundRequest(BaseModel):
    investor_wallet: str
    nft_mint_address: str  # The on-chain NFT representing this invoice


class PortfolioSummary(BaseModel):
    wallet: str
    active_positions: int
    total_invested_usdc: float
    expected_returns_usdc: float
    settled_count: int
    realized_returns_usdc: float
    invoices: list[InvoiceResponse]


# App + middleware
app = FastAPI(
    title="FaturaFi API",
    description="AI-powered supply chain finance protocol on Solana for Turkish SMEs",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy load scorer (cold-start optimization)
_scorer: RiskScorer | None = None
def get_scorer() -> RiskScorer:
    global _scorer
    if _scorer is None:
        _scorer = RiskScorer()
    return _scorer


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# TRY -> USDC conversion (in production: pull from Pyth or Switchboard oracle)
TRY_PER_USD = 34.50  # placeholder; replace with oracle feed


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "faturafi-api", "version": "0.1.0"}


@app.post("/api/invoices", response_model=InvoiceResponse)
def create_invoice(payload: InvoiceCreate):
    """Score and create a new invoice listing."""
    scorer = get_scorer()
    assessment = scorer.score(InvoiceInput(
        sector=payload.sector,
        buyer_tier=payload.buyer_tier,
        macro_scenario=payload.macro_scenario,
        amount_try=payload.amount_try,
        term_days=payload.term_days,
        sme_age_months=payload.sme_age_months,
        sme_prior_invoices=payload.sme_prior_invoices,
        sme_ontime_ratio=payload.sme_ontime_ratio,
        buyer_repeat_count=payload.buyer_repeat_count,
        buyer_avg_days_late=payload.buyer_avg_days_late,
    ))

    inv = Invoice(
        id=str(uuid.uuid4()),
        sme_wallet=payload.sme_wallet,
        sme_name=payload.sme_name,
        buyer_name=payload.buyer_name,
        sector=payload.sector,
        buyer_tier=payload.buyer_tier,
        macro_scenario=payload.macro_scenario,
        amount_try=payload.amount_try,
        amount_usdc=round(payload.amount_try / TRY_PER_USD, 2),
        term_days=payload.term_days,
        sme_age_months=payload.sme_age_months,
        sme_prior_invoices=payload.sme_prior_invoices,
        sme_ontime_ratio=payload.sme_ontime_ratio,
        buyer_repeat_count=payload.buyer_repeat_count,
        buyer_avg_days_late=payload.buyer_avg_days_late,
        risk_score=assessment.risk_score,
        grade=assessment.grade,
        default_probability=assessment.default_probability,
        suggested_discount_rate=assessment.suggested_discount_rate,
        risk_drivers=[d.model_dump() for d in assessment.top_drivers],
        due_date=datetime.now(timezone.utc) + timedelta(days=payload.term_days),
    )
    db = SessionLocal()
    try:
        db.add(inv)
        db.commit()
        db.refresh(inv)
        return InvoiceResponse.model_validate(inv)
    finally:
        db.close()


@app.get("/api/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    status: str | None = None,
    sector: str | None = None,
    max_risk_score: int | None = None,
    min_amount_usdc: float | None = None,
    max_amount_usdc: float | None = None,
    sme_wallet: str | None = None,
):
    """Marketplace listing with filters."""
    db = SessionLocal()
    try:
        q = db.query(Invoice)
        if status:
            q = q.filter(Invoice.status == status)
        if sector:
            q = q.filter(Invoice.sector == sector)
        if max_risk_score is not None:
            q = q.filter(Invoice.risk_score <= max_risk_score)
        if min_amount_usdc is not None:
            q = q.filter(Invoice.amount_usdc >= min_amount_usdc)
        if max_amount_usdc is not None:
            q = q.filter(Invoice.amount_usdc <= max_amount_usdc)
        if sme_wallet:
            q = q.filter(Invoice.sme_wallet == sme_wallet)
        return [InvoiceResponse.model_validate(i) for i in q.order_by(Invoice.created_at.desc()).all()]
    finally:
        db.close()


@app.get("/api/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str):
    db = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise HTTPException(404, "Invoice not found")
        return InvoiceResponse.model_validate(inv)
    finally:
        db.close()


@app.post("/api/invoices/{invoice_id}/fund", response_model=InvoiceResponse)
def fund_invoice(invoice_id: str, req: FundRequest):
    """Called after on-chain NFT transfer to investor completes."""
    db = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise HTTPException(404, "Invoice not found")
        if inv.status != "listed":
            raise HTTPException(400, f"Invoice is {inv.status}, cannot be funded")
        inv.status = "funded"
        inv.investor_wallet = req.investor_wallet
        inv.nft_mint_address = req.nft_mint_address
        inv.funded_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(inv)
        return InvoiceResponse.model_validate(inv)
    finally:
        db.close()


@app.post("/api/invoices/{invoice_id}/settle", response_model=InvoiceResponse)
def settle_invoice(invoice_id: str):
    db = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise HTTPException(404, "Invoice not found")
        if inv.status != "funded":
            raise HTTPException(400, f"Invoice is {inv.status}, cannot be settled")
        inv.status = "settled"
        inv.settled_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(inv)
        return InvoiceResponse.model_validate(inv)
    finally:
        db.close()


@app.get("/api/portfolio/{wallet}", response_model=PortfolioSummary)
def portfolio(wallet: str):
    db = SessionLocal()
    try:
        all_invs = db.query(Invoice).filter(Invoice.investor_wallet == wallet).all()
        active = [i for i in all_invs if i.status == "funded"]
        settled = [i for i in all_invs if i.status == "settled"]
        total_invested = sum(i.amount_usdc * (1 - i.suggested_discount_rate) for i in active)
        expected = sum(i.amount_usdc for i in active)
        realized = sum(i.amount_usdc - i.amount_usdc * (1 - i.suggested_discount_rate) for i in settled)
        return PortfolioSummary(
            wallet=wallet,
            active_positions=len(active),
            total_invested_usdc=round(total_invested, 2),
            expected_returns_usdc=round(expected, 2),
            settled_count=len(settled),
            realized_returns_usdc=round(realized, 2),
            invoices=[InvoiceResponse.model_validate(i) for i in all_invs],
        )
    finally:
        db.close()


@app.post("/api/seed")
def seed_demo_data(force: bool = False):
    """Populate database with realistic demo invoices for the pitch.

    If force=true is passed, ALL invoices are deleted first and the database
    is fully reseeded. Use this when the marketplace has stale or test data.
    """
    import random
    random.seed(7)

    # Demo SME wallets are prefixed so we can detect / clean them up cleanly
    DEMO_WALLET_PREFIX = "DEMOsme"

    db = SessionLocal()
    try:
        if force:
            # Nuke everything and start fresh
            db.query(Invoice).delete()
            db.commit()
        else:
            # Only skip if all 8 demo invoices are already present
            demo_count = db.query(Invoice).filter(
                Invoice.sme_wallet.like(f"{DEMO_WALLET_PREFIX}%")
            ).count()
            if demo_count >= 8:
                return {"status": "already_seeded", "demo_count": demo_count}
            # Otherwise wipe just the demo invoices so we can recreate them
            db.query(Invoice).filter(
                Invoice.sme_wallet.like(f"{DEMO_WALLET_PREFIX}%")
            ).delete(synchronize_session=False)
            db.commit()
    finally:
        db.close()

    demo_smes = [
        ("Anadolu Tekstil Ltd.", "textile", "DEMOsmeTextile111111111111111111111111111"),
        ("Marmara Lojistik", "logistics", "DEMOsmeLogistic1111111111111111111111111111"),
        ("Ege Gıda San.", "food_beverage", "DEMOsmeFood1111111111111111111111111111111"),
        ("İzmir Elektronik", "electronics", "DEMOsmeElec1111111111111111111111111111111"),
        ("Konya İnşaat", "construction", "DEMOsmeConst11111111111111111111111111111"),
    ]
    demo_buyers = [
        ("Migros Ticaret A.Ş.", "enterprise"),
        ("LC Waikiki Mağazacılık", "enterprise"),
        ("Şok Marketler", "mid_market"),
        ("Yerel Zincir Market", "small_business"),
        ("Mahalle Bakkal Birliği", "micro"),
    ]
    scorer = get_scorer()
    created = []
    for i in range(8):
        sme = random.choice(demo_smes)
        buyer = random.choice(demo_buyers)
        amount = random.choice([45_000, 120_000, 350_000, 80_000, 220_000, 600_000])
        term = random.choice([30, 45, 60, 90])
        payload = InvoiceCreate(
            sme_wallet=sme[2],
            sme_name=sme[0],
            buyer_name=buyer[0],
            sector=sme[1],
            buyer_tier=buyer[1],
            amount_try=float(amount),
            term_days=term,
            sme_age_months=random.randint(12, 120),
            sme_prior_invoices=random.randint(0, 40),
            sme_ontime_ratio=round(random.uniform(0.7, 0.98), 2),
            buyer_repeat_count=random.randint(0, 8),
            buyer_avg_days_late=round(random.uniform(0, 15), 1),
        )
        created.append(create_invoice(payload))
    return {"status": "seeded", "count": len(created), "force": force}
