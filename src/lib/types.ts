/**
 * Which exchange a stock's code refers to.
 * NSE symbols are alphabetic (e.g. "HDFCBANK").
 * BSE codes are 6-digit numeric strings (e.g. "532174").
 * We store both explicitly rather than inferring at render time everywhere,
 * because the inference logic (numeric vs alphabetic) only needs to run once,
 * at data-load time — see lib/portfolioData.ts.
 */
export type Exchange = "NSE" | "BSE";

/**
 * A holding as originally entered by the investor (the "static" half of a row).
 * This data does NOT change on refresh — only price-derived fields do.
 */
export interface HoldingInput {
  particulars: string;
  purchasePrice: number;
  qty: number;
  exchangeCode: string; // raw code from the sheet, e.g. "HDFCBANK" or "532174"
  exchange: Exchange;
  sector: string;
}

/**
 * Live/derived fields fetched from Yahoo Finance (CMP) and Google Finance
 * (P/E Ratio, Latest Earnings). These are allowed to be null — a failed
 * fetch must not crash the row, it should degrade gracefully.
 */
export interface LiveQuote {
  cmp: number | null;
  peRatio: number | null;
  latestEarnings: number | null; // EPS, in the currency/unit the source reports
  /** True if this value came from cache rather than a fresh fetch this cycle. */
  stale: boolean;
  /** Present if the last fetch attempt for this symbol failed. */
  error?: string;
}

/**
 * A fully computed row, ready for the table. Investment, Present Value,
 * Gain/Loss, and Portfolio(%) are all *derived* — we never store them,
 * we recompute them every time from HoldingInput + LiveQuote, because
 * they must never drift out of sync with their inputs.
 */
export interface PortfolioRow extends HoldingInput, LiveQuote {
  investment: number;
  presentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  portfolioPercent: number; // share of total investment, computed across the whole portfolio
}

export interface SectorSummary {
  sector: string;
  totalInvestment: number;
  totalPresentValue: number | null;
  totalGainLoss: number | null;
  rows: PortfolioRow[];
}

export interface PortfolioApiResponse {
  sectors: SectorSummary[];
  totals: {
    totalInvestment: number;
    totalPresentValue: number | null;
    totalGainLoss: number | null;
  };
  fetchedAt: string; // ISO timestamp — lets the UI show "as of HH:MM:SS"
  partialFailure: boolean; // true if one or more symbols failed to fetch
}
