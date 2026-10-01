import { SectorSummary as SectorSummaryType } from "@/lib/types";

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function gainLossClass(value: number | null): string {
  if (value === null) return "text-gray-400";
  return value >= 0 ? "text-gain" : "text-loss";
}

export function SectorSummaryBar({ summary }: { summary: SectorSummaryType }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-md my-2 text-sm font-medium">
      <span className="text-slate-700 dark:text-slate-200 font-semibold">{summary.sector}</span>
      <div className="flex gap-6">
        <span>
          Investment: <span className="font-semibold">₹{formatCurrency(summary.totalInvestment)}</span>
        </span>
        <span>
          Present Value:{" "}
          <span className="font-semibold">₹{formatCurrency(summary.totalPresentValue)}</span>
        </span>
        <span className={gainLossClass(summary.totalGainLoss)}>
          Gain/Loss: ₹{formatCurrency(summary.totalGainLoss)}
        </span>
      </div>
    </div>
  );
}
