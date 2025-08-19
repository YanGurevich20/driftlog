import type { EntryType } from './entries';

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
  
  instancesCreated: number;
  
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export const RECURRENCE_LIMITS = {
  daily: { 
    maxDays: 365,      // 1 year
    defaultDays: 90,   // 3 months
  },
  weekly: { 
    maxDays: 365,      // 1 year
    defaultDays: 180,  // 6 months
  },
  monthly: { 
    maxDays: 365 * 5,     // 5 years
    defaultDays: 365,  // 1 year
  },
  yearly: {
    maxDays: 365 * 5,     // 5 years
    defaultDays: 365 * 2,  // 2 years
  }
} as const;


