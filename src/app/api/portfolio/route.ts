import { NextResponse } from "next/server";
import { PORTFOLIO_HOLDINGS } from "@/lib/portfolioData";
import { fetchCmp } from "@/lib/yahooFinance";
import { fetchGoogleFinanceStats } from "@/lib/googleFinance";
import { PortfolioRow, SectorSummary, PortfolioApiResponse } from "@/lib/types";

/**
 * This route IS the "Node.js backend" the assignment asks for — a Next.js
 * API route runs as a serverless/Node function, not in the browser. We
 * deliberately did not stand up a second, separate Express server, since
 * that would duplicate what Next.js already provides. This trade-off is
 * explained in TECHNICAL_DOCUMENT.md under "Architecture decisions".
 *
 * WHY COMPUTATION HAPPENS HERE, NOT ON THE CLIENT:
 * - Keeps API keys/scraping logic off the client entirely (the brief's
 *   security requirement: "Do not expose API keys or sensitive data in
 *   client-side code" — here there's no key, but the same principle
 *   applies to scraping logic, which we don't want exposed either).
 * - Every consumer of this endpoint (web, a future mobile app, etc.)
 *   gets identical, pre-computed numbers — no risk of the frontend
 *   recomputing Gain/Loss slightly differently in two places.
 */

export const dynamic = "force-dynamic"; // never statically cache this route itself

export async function GET() {
  const totalInvestmentAcrossPortfolio = PORTFOLIO_HOLDINGS.reduce(
    (sum, h) => sum + h.purchasePrice * h.qty,
    0
  );

  let partialFailure = false;

  // Fetch all symbols in parallel rather than sequentially — with 25+
  // holdings, sequential fetching at ~500ms each would take over 10
  // seconds and make the "refresh every 15s" requirement nearly impossible
  // to hit reliably. Promise.all bounds this to the slowest single call.
  const rows: PortfolioRow[] = await Promise.all(
    PORTFOLIO_HOLDINGS.map(async (holding) => {
      const [yahooResult, googleResult] = await Promise.all([
        fetchCmp(holding.exchangeCode, holding.exchange),
        fetchGoogleFinanceStats(holding.exchangeCode, holding.exchange),
      ]);

      if (yahooResult.error || googleResult.error) {
        partialFailure = true;
      }

      const investment = holding.purchasePrice * holding.qty;
      const cmp = yahooResult.cmp;
      const presentValue = cmp !== null ? cmp * holding.qty : null;
      const gainLoss = presentValue !== null ? presentValue - investment : null;
      const gainLossPercent =
        gainLoss !== null && investment !== 0 ? (gainLoss / investment) * 100 : null;
      const portfolioPercent =
        totalInvestmentAcrossPortfolio > 0
          ? (investment / totalInvestmentAcrossPortfolio) * 100
          : 0;

      const combinedError = [yahooResult.error, googleResult.error]
        .filter(Boolean)
        .join(" | ") || undefined;

      return {
        ...holding,
        cmp,
        peRatio: googleResult.peRatio,
        latestEarnings: googleResult.latestEarnings,
        stale: yahooResult.stale || googleResult.stale,
        error: combinedError,
        investment,
        presentValue,
        gainLoss,
        gainLossPercent,
        portfolioPercent,
      };
    })
  );

  // Group into sectors, preserving the order sectors first appear in the data.
  const sectorOrder: string[] = [];
  const sectorMap = new Map<string, PortfolioRow[]>();
  for (const row of rows) {
    if (!sectorMap.has(row.sector)) {
      sectorMap.set(row.sector, []);
      sectorOrder.push(row.sector);
    }
    sectorMap.get(row.sector)!.push(row);
  }

  const sectors: SectorSummary[] = sectorOrder.map((sector) => {
    const sectorRows = sectorMap.get(sector)!;
    const totalInvestment = sectorRows.reduce((sum, r) => sum + r.investment, 0);
    const presentValues = sectorRows.map((r) => r.presentValue);
    const totalPresentValue = presentValues.every((v) => v !== null)
      ? (presentValues as number[]).reduce((sum, v) => sum + v, 0)
      : null;
    const totalGainLoss = totalPresentValue !== null ? totalPresentValue - totalInvestment : null;

    return { sector, totalInvestment, totalPresentValue, totalGainLoss, rows: sectorRows };
  });

  const totalPresentValue = rows.every((r) => r.presentValue !== null)
    ? rows.reduce((sum, r) => sum + (r.presentValue as number), 0)
    : null;
  const totalGainLoss =
    totalPresentValue !== null ? totalPresentValue - totalInvestmentAcrossPortfolio : null;

  const payload: PortfolioApiResponse = {
    sectors,
    totals: {
      totalInvestment: totalInvestmentAcrossPortfolio,
      totalPresentValue,
      totalGainLoss,
    },
    fetchedAt: new Date().toISOString(),
    partialFailure,
  };

  return NextResponse.json(payload);
}
