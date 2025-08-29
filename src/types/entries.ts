export const EntryType = {
  expense: 'expense',
  income: 'income',
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

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
  recurringTemplateId?: string;
  isRecurringInstance?: boolean;
  isModified?: boolean;
}
