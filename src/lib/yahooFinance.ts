import YahooFinance from "yahoo-finance2";
import { Exchange } from "./types";
import { getCached, setCached, getStale, setStaleFallback } from "./cache";

/**
 * yahoo-finance2 v3+ switched from a default singleton export to an
 * instantiable class (so multiple independent rate-limit/concurrency
 * queues can coexist in one process). One shared instance module-wide
 * is correct here — we want ONE concurrency queue for the whole app,
 * not one per request, otherwise the library's built-in rate-limiting
 * (see UPGRADING.md) wouldn't actually protect us against bursts.
 */
const yahooFinance = new YahooFinance();

/**
 * ACKNOWLEDGMENT (required by the assignment brief):
 * Yahoo Finance has no official public API. We use `yahoo-finance2`, a
 * widely-used open-source library that calls Yahoo's *internal* endpoints
 * (the same ones Yahoo's own website uses). This is unofficial: Yahoo can
 * change or block these endpoints at any time without notice. We treat
 * every call as something that can fail, and never let a failure here
 * crash the whole dashboard (see the try/catch below and the cache
 * fallback in cache.ts).
 */

function toYahooSymbol(code: string, exchange: Exchange): string {
  // Yahoo's suffix convention for Indian exchanges: NSE = .NS, BSE = .BO
  return exchange === "NSE" ? `${code}.NS` : `${code}.BO`;
}

export interface YahooQuoteResult {
  cmp: number | null;
  stale: boolean;
  error?: string;
}

export async function fetchCmp(code: string, exchange: Exchange): Promise<YahooQuoteResult> {
  const cacheKey = `yahoo:${code}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined) {
    return { cmp: cached, stale: false };
  }

  const symbol = toYahooSymbol(code, exchange);

  try {
    const quote = await yahooFinance.quote(symbol);
    const price = quote.regularMarketPrice;

    if (typeof price !== "number") {
      throw new Error(`No regularMarketPrice in response for ${symbol}`);
    }

    setCached(cacheKey, price);
    setStaleFallback(cacheKey, price);
    return { cmp: price, stale: false };
  } catch (err) {
    // Fall back to the last known good value rather than showing nothing.
    const stale = getStale<number>(cacheKey);
    return {
      cmp: stale ?? null,
      stale: stale !== undefined,
      error: err instanceof Error ? err.message : "Unknown Yahoo Finance error",
    };
  }
}
