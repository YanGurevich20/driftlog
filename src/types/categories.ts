export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Freelance',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Health & Medical',
  'Utilities',
  'Work & Business',
  'Investment',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];


