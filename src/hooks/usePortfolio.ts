"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PortfolioApiResponse } from "@/lib/types";

const REFRESH_INTERVAL_MS = 15_000;

interface UsePortfolioState {
  data: PortfolioApiResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * WHY setInterval + fetch, and not WebSockets:
 * The brief explicitly lists WebSockets as "Optional: ... for more advanced,
 * efficient updates" and setInterval as the baseline approach. Our data
 * source (scraped Yahoo/Google pages) is itself pull-based — there is no
 * push feed to subscribe to upstream — so a WebSocket here would only move
 * the *polling* from client-to-server to server-to-client, without removing
 * the underlying polling against Yahoo/Google. Given that, plain polling
 * is the simpler design that fits the actual data source; WebSockets would
 * add real complexity (a persistent connection, reconnect logic) for a
 * benefit that doesn't materialize until you have a genuinely push-based
 * upstream feed. This trade-off is discussed further in TECHNICAL_DOCUMENT.md.
 */
export function usePortfolio(): UsePortfolioState & { refresh: () => void } {
  const [data, setData] = useState<PortfolioApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
      const json: PortfolioApiResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      // Deliberately do NOT clear `data` on a failed refresh — the UI should
      // keep showing the last good snapshot rather than blanking out, with
      // the error surfaced separately (see StatusBar component).
      setError(err instanceof Error ? err.message : "Failed to fetch portfolio data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
