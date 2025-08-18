// User types
export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  photoUrl?: string;
  displayCurrency: string;
  groupId: string;
  createdAt: Date;
}

// User Group types
export interface UserGroup {
  id: string;
  memberIds: string[];
  createdAt: Date;
  createdBy: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
}

// Entry types (formerly Event)
export type EntryType = 'expense' | 'income';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface BaseEntry {
  id: string;
  type: EntryType;
  userId: string;
  originalAmount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface ExpenseEntry extends BaseEntry {
  type: 'expense';
  location?: { lat: number; lng: number };
}

export interface IncomeEntry extends BaseEntry {
  type: 'income';
}

export type Entry = ExpenseEntry | IncomeEntry;

// Recurring entry template (future feature)
export interface RecurringTemplate {
  id: string;
  entryData: Omit<Entry, 'id' | 'date' | 'createdAt'>;
  frequency: RecurringFrequency;
  nextRun: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
}

// Statistics types
export interface MonthlyStats {
  totalExpenses: number;
  totalIncome: number;
  entryCount: number;
  topCategories: CategoryStat[];
}

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
}

// Currency types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface ExchangeRates {
  rates: Record<string, number>;
  fetchedAt: Date;
}

// Monthly exchange rate types
export interface DailyRates {
  [currency: string]: number;
}

export interface MonthlyExchangeRates {
  [date: string]: DailyRates; // "YYYY-MM-DD" -> rates
}

// Form types
export interface EntryFormData {
  type: EntryType;
  amountCurrency: {
    amount: string;
    currency: string;
  };
  category: string;
  description?: string;
  date?: Date;
}

// Categories
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