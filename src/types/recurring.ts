import type { EntryType } from './entry';

export type RecurrenceFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate: Date;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface RecurringTemplate {
  id: string;
  userId: string;
  
  entryTemplate: {
    type: EntryType;
    originalAmount: number;
    currency: string;
    category: string;
    description?: string;
  };
  
  recurrence: RecurrenceRule;
  startDate: Date;
  
  createdBy: string;
  createdAt: Date;
}

export const RECURRENCE_LIMITS = {
  daily: { 
    maxMonths: 12,
    defaultMonths: 3,   // 3 months
  },
  weekly: { 
    maxMonths: 12,      // 1 year
    defaultMonths: 6,   // 6 months
  },
  monthly: { 
    maxMonths: 60,      // 5 years
    defaultMonths: 12,  // 1 year
  },
  yearly: {
    maxMonths: 60,      // 5 years
    defaultMonths: 24,  // 2 years
  }
} as const;


