import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';

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
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate),
      };
    
    case 'yesterday':
      const yesterday = subDays(referenceDate, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    
    case 'last7days':
      return {
        start: startOfDay(subDays(referenceDate, 6)),
        end: endOfDay(referenceDate),
      };
    
    case 'last30days':
      return {
        start: startOfDay(subDays(referenceDate, 29)),
        end: endOfDay(referenceDate),
      };
    
    case 'thisWeek':
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      };
    
    case 'lastWeek':
      const lastWeek = subWeeks(referenceDate, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    
    case 'thisMonth':
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
      };
    
    case 'lastMonth':
      const lastMonth = subMonths(referenceDate, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    
    case 'thisYear':
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate),
      };
    
    case 'lastYear':
      const lastYear = subYears(referenceDate, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
      };
  }
}

export function getDateRangeForDay(date: Date): DateRange {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

export function getDateRangeForMonth(date: Date): DateRange {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getDateRangeForWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): DateRange {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  };
}

export function getDateRangeForYear(date: Date): DateRange {
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  };
}