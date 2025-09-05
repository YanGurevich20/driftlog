export type EntryType = 'expense' | 'income';

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
