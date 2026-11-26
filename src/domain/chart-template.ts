// The default chart of accounts for a small Australian company in a trade (client question 2,
// safe assumption: a company). It is invented, not the client's chart: his real one moves across
// from QuickBooks at go-live (spec 146). The author reviews this list (spec 032), and the client
// and his accountant change it in the app.
//
// Codes follow the usual order: 1 assets, 2 liabilities, 3 equity, 4 income, 5 and 6 expenses.
// There is one GST account. GST collected is a credit in it and GST paid is a debit, so its
// balance is what is owed to the ATO (credit) or to be refunded (debit).

import type { AccountRole, AccountType } from '@shared/kinds';

/** The short codes of the four GST codes the books start with (`tax_code`, spec 034). */
export type TemplateTaxCode = 'GST' | 'FRE' | 'INP' | 'N-T';

export interface TemplateAccount {
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  /** The code of the account this one sits under, if it is a sub-account. */
  readonly parentCode?: string;
  /**
   * The GST code a line to this account starts with. The author reviews these defaults (spec 034),
   * and the client's accountant confirms them: a bank fee and interest are the two to check.
   */
  readonly defaultTax: TemplateTaxCode;
  /** The job the app gives this account when it posts by itself (`account_role`, migration 0010). */
  readonly role?: AccountRole;
}

export const CHART_TEMPLATE: readonly TemplateAccount[] = [
  { code: '1000', name: 'Business cheque account', type: 'asset', defaultTax: 'N-T' },
  { code: '1010', name: 'Business savings account', type: 'asset', defaultTax: 'N-T' },
  // One side of a transfer waits here until the other bank line is imported (spec 073). It is
  // back at zero once both sides are posted.
  {
    code: '1090',
    name: 'Transfers in transit',
    type: 'asset',
    defaultTax: 'N-T',
    role: 'transfers',
  },
  { code: '1100', name: 'Accounts receivable', type: 'asset', defaultTax: 'N-T' },
  { code: '1200', name: 'Materials on hand', type: 'asset', defaultTax: 'N-T' },
  { code: '1300', name: 'Prepayments', type: 'asset', defaultTax: 'N-T' },
  { code: '1400', name: 'Plant and equipment', type: 'asset', defaultTax: 'GST' },
  { code: '1450', name: 'Motor vehicles', type: 'asset', defaultTax: 'GST' },

  { code: '2000', name: 'Business credit card', type: 'liability', defaultTax: 'N-T' },
  { code: '2100', name: 'Accounts payable', type: 'liability', defaultTax: 'N-T' },
  { code: '2200', name: 'GST', type: 'liability', defaultTax: 'N-T', role: 'gst' },
  { code: '2250', name: 'PAYG withholding payable', type: 'liability', defaultTax: 'N-T' },
  { code: '2400', name: 'Business loan', type: 'liability', defaultTax: 'N-T' },
  { code: '2900', name: 'Suspense', type: 'liability', defaultTax: 'N-T' },

  { code: '3000', name: 'Share capital', type: 'equity', defaultTax: 'N-T' },
  { code: '3100', name: 'Retained earnings', type: 'equity', defaultTax: 'N-T' },
  { code: '3200', name: 'Owner drawings', type: 'equity', defaultTax: 'N-T' },

  { code: '4000', name: 'Sales', type: 'income', defaultTax: 'GST' },
  { code: '4100', name: 'Other income', type: 'income', defaultTax: 'GST' },
  { code: '4200', name: 'Interest income', type: 'income', defaultTax: 'INP' },

  { code: '5000', name: 'Materials and supplies', type: 'expense', defaultTax: 'GST' },
  { code: '5100', name: 'Subcontractors', type: 'expense', defaultTax: 'GST' },
  { code: '5200', name: 'Freight and delivery', type: 'expense', defaultTax: 'GST' },

  { code: '6000', name: 'Advertising and marketing', type: 'expense', defaultTax: 'GST' },
  { code: '6010', name: 'Bank fees', type: 'expense', defaultTax: 'INP' },
  { code: '6020', name: 'Computer and software', type: 'expense', defaultTax: 'GST' },
  { code: '6030', name: 'Insurance', type: 'expense', defaultTax: 'GST' },
  { code: '6040', name: 'Interest paid', type: 'expense', defaultTax: 'INP' },
  { code: '6050', name: 'Motor vehicle expenses', type: 'expense', defaultTax: 'GST' },
  { code: '6060', name: 'Office supplies', type: 'expense', defaultTax: 'GST' },
  { code: '6070', name: 'Professional fees', type: 'expense', defaultTax: 'GST' },
  { code: '6080', name: 'Rent', type: 'expense', defaultTax: 'GST' },
  { code: '6090', name: 'Repairs and maintenance', type: 'expense', defaultTax: 'GST' },
  { code: '6100', name: 'Telephone and internet', type: 'expense', defaultTax: 'GST' },
  { code: '6110', name: 'Tools and small equipment', type: 'expense', defaultTax: 'GST' },
  { code: '6120', name: 'Utilities', type: 'expense', defaultTax: 'GST' },
  { code: '6130', name: 'Wages and salaries', type: 'expense', defaultTax: 'N-T' },
  { code: '6140', name: 'Superannuation', type: 'expense', defaultTax: 'N-T' },
  { code: '6150', name: 'Travel', type: 'expense', defaultTax: 'GST' },
  { code: '6160', name: 'Depreciation', type: 'expense', defaultTax: 'N-T' },
];
