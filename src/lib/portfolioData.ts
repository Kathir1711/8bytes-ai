import { HoldingInput, Exchange } from "./types";

/**
 * A BSE code is always a 6-digit number (as a string in the sheet).
 * An NSE symbol is alphabetic. We detect this once here, at load time,
 * rather than re-checking it in every component that touches a row.
 */
function detectExchange(code: string): Exchange {
  return /^\d+$/.test(code) ? "BSE" : "NSE";
}

/**
 * Raw holdings exactly as they appear in the provided portfolio sheet.
 * NOTE: In a real product this would live in a database (one row per
 * user holding, editable via a "buy/add" form), not a hardcoded file.
 * It's hardcoded here because the assignment is scoped around the
 * fetch/display/compute pipeline, not a persistence layer — see
 * TECHNICAL_DOCUMENT.md, "Scope decisions", for why.
 */
const RAW_HOLDINGS: Array<{
  particulars: string;
  purchasePrice: number;
  qty: number;
  exchangeCode: string;
  sector: string;
}> = [
  // Financial Sector
  { particulars: "HDFC Bank", purchasePrice: 1490, qty: 50, exchangeCode: "HDFCBANK", sector: "Financial Sector" },
  { particulars: "Bajaj Finance", purchasePrice: 6466, qty: 15, exchangeCode: "BAJFINANCE", sector: "Financial Sector" },
  { particulars: "ICICI Bank", purchasePrice: 780, qty: 84, exchangeCode: "532174", sector: "Financial Sector" },
  { particulars: "Bajaj Housing", purchasePrice: 130, qty: 504, exchangeCode: "544252", sector: "Financial Sector" },
  { particulars: "Savani Financials", purchasePrice: 24, qty: 1080, exchangeCode: "511577", sector: "Financial Sector" },

  // Tech Sector
  { particulars: "Affle India", purchasePrice: 1151, qty: 50, exchangeCode: "AFFLE", sector: "Tech Sector" },
  { particulars: "LTI Mindtree", purchasePrice: 4775, qty: 16, exchangeCode: "LTIM", sector: "Tech Sector" },
  { particulars: "KPIT Tech", purchasePrice: 672, qty: 61, exchangeCode: "542651", sector: "Tech Sector" },
  { particulars: "Tata Tech", purchasePrice: 1072, qty: 63, exchangeCode: "544028", sector: "Tech Sector" },
  { particulars: "BLS E-Services", purchasePrice: 232, qty: 191, exchangeCode: "544107", sector: "Tech Sector" },
  { particulars: "Tanla", purchasePrice: 1134, qty: 45, exchangeCode: "532790", sector: "Tech Sector" },

  // Consumer
  { particulars: "Dmart", purchasePrice: 3777, qty: 27, exchangeCode: "DMART", sector: "Consumer" },
  { particulars: "Tata Consumer", purchasePrice: 845, qty: 90, exchangeCode: "532540", sector: "Consumer" },
  { particulars: "Pidilite", purchasePrice: 2376, qty: 36, exchangeCode: "500331", sector: "Consumer" },

  // Power
  { particulars: "Tata Power", purchasePrice: 224, qty: 225, exchangeCode: "500400", sector: "Power" },
  { particulars: "KPI Green", purchasePrice: 875, qty: 50, exchangeCode: "542323", sector: "Power" },
  { particulars: "Suzlon", purchasePrice: 44, qty: 450, exchangeCode: "532667", sector: "Power" },
  { particulars: "Gensol", purchasePrice: 998, qty: 45, exchangeCode: "542851", sector: "Power" },

  // Pipe Sector
  { particulars: "Hariom Pipes", purchasePrice: 580, qty: 60, exchangeCode: "543517", sector: "Pipe Sector" },
  { particulars: "Astral", purchasePrice: 1517, qty: 56, exchangeCode: "ASTRAL", sector: "Pipe Sector" },
  { particulars: "Polycab", purchasePrice: 2818, qty: 28, exchangeCode: "542652", sector: "Pipe Sector" },

  // Others
  { particulars: "Clean Science", purchasePrice: 1610, qty: 32, exchangeCode: "543318", sector: "Others" },
  { particulars: "Deepak Nitrite", purchasePrice: 2248, qty: 27, exchangeCode: "506401", sector: "Others" },
  { particulars: "Fine Organic", purchasePrice: 4284, qty: 16, exchangeCode: "541557", sector: "Others" },
  { particulars: "Gravita", purchasePrice: 2037, qty: 8, exchangeCode: "533282", sector: "Others" },
  { particulars: "SBI Life", purchasePrice: 1197, qty: 49, exchangeCode: "540719", sector: "Others" },
];

export const PORTFOLIO_HOLDINGS: HoldingInput[] = RAW_HOLDINGS.map((h) => ({
  ...h,
  exchange: detectExchange(h.exchangeCode),
}));
