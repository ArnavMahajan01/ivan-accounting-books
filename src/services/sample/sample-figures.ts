// The figures the sample books must produce on 23 November 2026 (spec 046). Most are the figures in
// the signed-off wireframes, so the demo feels continuous with what the client approved. A test
// builds the books and checks every one, so a change to the sample data that moves a figure fails
// the checks. All amounts are cents. A debit balance is positive and a credit balance negative.

export const SAMPLE_TODAY = '2026-11-23';

export const SAMPLE_FIGURES = {
  entries: 94,
  contacts: 25,
  /** Home: Bank balance, "2 accounts". */
  bankBalance: 4364235,
  /** Home: GST owing for October to December, so far. */
  gstOwingOctToDec: 318420,
  /** Home: profit for FY 2026–27 to date. */
  profit: 4245350,
  /** The BAS for July to September, paid on 28 October. */
  basPaymentJulToSep: 78516,
  /** Debits, and so also credits, over every date. */
  trialBalanceDebits: 10002413,
  /** The balance of each account that has one, by code. */
  balances: {
    '1000': 1864235, // Business One ··4821
    '1010': 2500000, // Business Cash Reserve ··7730
    '2200': -318420, // GST
    '3000': -1500000, // Share capital
    '3200': 1699535, // Owner drawings
    '4000': -8183993, // Sales
    '5000': 981240, // Materials and supplies
    '5100': 730000, // Subcontractors
    '6010': 4000, // Bank fees
    '6020': 40000, // Computer and software
    '6030': 93500, // Insurance
    '6050': 104630, // Motor vehicle expenses
    '6060': 22264, // Office supplies
    '6070': 100000, // Professional fees
    '6080': 1500000, // Rent
    '6100': 72500, // Telephone and internet
    '6110': 94409, // Tools and small equipment
    '6120': 196100, // Utilities
  },
} as const;
