"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { PortfolioTable } from "@/components/PortfolioTable";
import { StatusBar } from "@/components/StatusBar";

export default function DashboardPage() {
  const { data, loading, error } = usePortfolio();

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Portfolio Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
        Live CMP via Yahoo Finance · P/E Ratio &amp; Latest Earnings via Google Finance
      </p>

      <StatusBar
        fetchedAt={data?.fetchedAt}
        partialFailure={data?.partialFailure}
        fetchError={error}
        totals={data?.totals}
      />

      {loading && !data && (
        <div className="text-slate-500 dark:text-slate-400 py-12 text-center">
          Loading portfolio…
        </div>
      )}

      {data && <PortfolioTable data={data} />}
    </main>
  );
}
