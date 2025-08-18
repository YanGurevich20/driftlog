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

export interface Entry  {
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
  location?: { lat: number; lng: number };
}

export interface ExchangeRates {
  rates: Record<string, number>;
  fetchedAt: Date;
}

export interface DailyRates {
  [currency: string]: number;
}

export interface MonthlyExchangeRates {
  [date: string]: DailyRates; // "YYYY-MM-DD" -> rates
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