import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { getUTCStartOfDay, getUTCEndOfDay } from './date-utils';

export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(preset: DateRangePreset, referenceDate: Date = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return {
        start: getUTCStartOfDay(referenceDate),
        end: getUTCEndOfDay(referenceDate),
      };
    
    case 'yesterday':
      const yesterday = subDays(referenceDate, 1);
      return {
        start: getUTCStartOfDay(yesterday),
        end: getUTCEndOfDay(yesterday),
      };
    
    case 'last7days':
      return {
        start: getUTCStartOfDay(subDays(referenceDate, 6)),
        end: getUTCEndOfDay(referenceDate),
      };
    
    case 'last30days':
      return {
        start: getUTCStartOfDay(subDays(referenceDate, 29)),
        end: getUTCEndOfDay(referenceDate),
      };
    
    case 'thisWeek':
      return {
        start: getUTCStartOfDay(startOfWeek(referenceDate, { weekStartsOn: 1 })),
        end: getUTCEndOfDay(endOfWeek(referenceDate, { weekStartsOn: 1 })),
      };
    
    case 'lastWeek':
      const lastWeek = subWeeks(referenceDate, 1);
      return {
        start: getUTCStartOfDay(startOfWeek(lastWeek, { weekStartsOn: 1 })),
        end: getUTCEndOfDay(endOfWeek(lastWeek, { weekStartsOn: 1 })),
      };
    
    case 'thisMonth':
      return {
        start: getUTCStartOfDay(startOfMonth(referenceDate)),
        end: getUTCEndOfDay(endOfMonth(referenceDate)),
      };
    
    case 'lastMonth':
      const lastMonth = subMonths(referenceDate, 1);
      return {
        start: getUTCStartOfDay(startOfMonth(lastMonth)),
        end: getUTCEndOfDay(endOfMonth(lastMonth)),
      };
    
    case 'thisYear':
      return {
        start: getUTCStartOfDay(startOfYear(referenceDate)),
        end: getUTCEndOfDay(endOfYear(referenceDate)),
      };
    
    case 'lastYear':
      const lastYear = subYears(referenceDate, 1);
      return {
        start: getUTCStartOfDay(startOfYear(lastYear)),
        end: getUTCEndOfDay(endOfYear(lastYear)),
      };
  }
}

export function getDateRangeForDay(date: Date): DateRange {
  return {
    start: getUTCStartOfDay(date),
    end: getUTCEndOfDay(date),
  };
}

export function getDateRangeForMonth(date: Date): DateRange {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    start: getUTCStartOfDay(start),
    end: getUTCEndOfDay(end),
  };
}