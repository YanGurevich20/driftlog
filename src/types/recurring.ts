import type { EntryType } from './entries';

export type RecurrenceFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  occurrenceCount: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface RecurringTemplate {
  id: string;
  userId: string;
  groupId: string;
  
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
    maxOccurrences: 365,
    defaultOccurrences: 90,
  },
  weekly: { 
    maxOccurrences: 104,
    defaultOccurrences: 26,
  },
  biweekly: {
    maxOccurrences: 52,
    defaultOccurrences: 13,
  },
  monthly: { 
    maxOccurrences: 24,
    defaultOccurrences: 12,
  },
  yearly: {
    maxOccurrences: 5,
    defaultOccurrences: 2,
  }
} as const;


