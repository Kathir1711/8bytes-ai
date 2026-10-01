interface StatusBarProps {
  fetchedAt: string | undefined;
  partialFailure: boolean | undefined;
  fetchError: string | null;
  totals: { totalInvestment: number; totalPresentValue: number | null; totalGainLoss: number | null } | undefined;
}

export function StatusBar({ fetchedAt, partialFailure, fetchError, totals }: StatusBarProps) {
  const time = fetchedAt ? new Date(fetchedAt).toLocaleTimeString("en-IN") : "—";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Last updated: <span className="font-medium text-slate-700 dark:text-slate-200">{time}</span>{" "}
        · refreshes every 15s
      </div>

      {totals && (
        <div className="flex gap-6 text-sm">
          <span>
            Total Investment:{" "}
            <span className="font-semibold">
              ₹{totals.totalInvestment.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </span>
          <span>
            Total Present Value:{" "}
            <span className="font-semibold">
              {totals.totalPresentValue !== null
                ? `₹${totals.totalPresentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                : "—"}
            </span>
          </span>
          <span className={totals.totalGainLoss !== null && totals.totalGainLoss >= 0 ? "text-gain font-semibold" : "text-loss font-semibold"}>
            Gain/Loss:{" "}
            {totals.totalGainLoss !== null
              ? `₹${totals.totalGainLoss.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
              : "—"}
          </span>
        </div>
      )}

      {(partialFailure || fetchError) && (
        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          {fetchError
            ? `Refresh error: ${fetchError} (showing last successful data)`
            : "Some symbols failed to update this cycle — showing last known values for those rows."}
        </div>
      )}
    </div>
  );
}
