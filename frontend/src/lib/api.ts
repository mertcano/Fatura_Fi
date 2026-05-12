/**
 * FaturaFi API client.
 *
 * Set NEXT_PUBLIC_API_URL in .env.local to point at your backend.
 * Defaults to http://localhost:8000 for local development.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type InvoiceGrade = "A" | "B" | "C" | "D" | "E";
export type InvoiceStatus = "listed" | "funded" | "settled" | "defaulted";
export type Sector =
  | "textile" | "construction" | "food_beverage" | "automotive"
  | "electronics" | "logistics" | "retail" | "agriculture" | "services";
export type BuyerTier = "enterprise" | "mid_market" | "small_business" | "micro";

export interface RiskDriver {
  feature: string;
  impact: number;
  direction: "increases_risk" | "reduces_risk";
  human_label: string;
}

export interface Invoice {
  id: string;
  sme_wallet: string;
  sme_name: string;
  buyer_name: string;
  sector: Sector;
  buyer_tier: BuyerTier;
  amount_try: number;
  amount_usdc: number;
  term_days: number;
  risk_score: number;
  grade: InvoiceGrade;
  default_probability: number;
  suggested_discount_rate: number;
  risk_drivers: RiskDriver[] | null;
  status: InvoiceStatus;
  nft_mint_address: string | null;
  investor_wallet: string | null;
  due_date: string;
  created_at: string;
}

export interface CreateInvoicePayload {
  sme_wallet: string;
  sme_name: string;
  buyer_name: string;
  sector: Sector;
  buyer_tier: BuyerTier;
  macro_scenario?: "stable" | "high_inflation" | "currency_shock";
  amount_try: number;
  term_days: number;
  sme_age_months?: number;
  sme_prior_invoices?: number;
  sme_ontime_ratio?: number;
  buyer_repeat_count?: number;
  buyer_avg_days_late?: number;
}

export interface PortfolioSummary {
  wallet: string;
  active_positions: number;
  total_invested_usdc: number;
  expected_returns_usdc: number;
  settled_count: number;
  realized_returns_usdc: number;
  invoices: Invoice[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createInvoice: (payload: CreateInvoicePayload) =>
    request<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(payload) }),

  listInvoices: (filters?: {
    status?: InvoiceStatus;
    sector?: Sector;
    max_risk_score?: number;
    min_amount_usdc?: number;
    max_amount_usdc?: number;
  }) => {
    const qs = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.append(k, String(v));
      });
    }
    return request<Invoice[]>(`/api/invoices${qs.toString() ? "?" + qs.toString() : ""}`);
  },

  getInvoice: (id: string) => request<Invoice>(`/api/invoices/${id}`),

  fundInvoice: (id: string, investor_wallet: string, nft_mint_address: string) =>
    request<Invoice>(`/api/invoices/${id}/fund`, {
      method: "POST",
      body: JSON.stringify({ investor_wallet, nft_mint_address }),
    }),

  settleInvoice: (id: string) =>
    request<Invoice>(`/api/invoices/${id}/settle`, { method: "POST" }),

  portfolio: (wallet: string) => request<PortfolioSummary>(`/api/portfolio/${wallet}`),

  seed: () => request<{ status: string; count?: number }>(`/api/seed`, { method: "POST" }),
};
