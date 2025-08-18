import { useState, useEffect, useCallback } from 'react';
import { CurrencyService } from '@/services/currency';
import type { MonthlyExchangeRates } from '@/types';

interface UseExchangeRatesOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useExchangeRates(options?: UseExchangeRatesOptions) {
  const [monthlyRates, setMonthlyRates] = useState<Map<string, MonthlyExchangeRates>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Convert dates to stable string representations for dependency comparison
  const startDateStr = options?.startDate?.toISOString() || '';
  const endDateStr = options?.endDate?.toISOString() || '';

  useEffect(() => {
    const fetchRates = async () => {
      // Calculate which months we need based on date range
      const months = new Set<string>();
      
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        // Add all months in the range
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          months.add(`${year}-${month}`);
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        // Default to current month if no range specified
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        months.add(`${year}-${month}`);
      }
      
      const requiredMonths = Array.from(months);
      
      if (requiredMonths.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const currencyService = CurrencyService.getInstance();
        const rates = await currencyService.getMonthlyRates(requiredMonths);
        setMonthlyRates(rates);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch monthly exchange rates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [startDateStr, endDateStr]);

  // Date-aware conversion function
  const convert = useCallback((amount: number, from: string, to: string, date: Date): number => {
    if (from === to) return amount;
    
    const currencyService = CurrencyService.getInstance();
    return currencyService.convertSync(amount, from, to, date);
  }, []);

  // Legacy conversion function (uses today's date)
  const convertLegacy = useCallback((amount: number, from: string, to: string): number => {
    return convert(amount, from, to, new Date());
  }, [convert]);

  // Async conversion with detailed result
  const convertWithDetails = useCallback(async (
    amount: number, 
    from: string, 
    to: string, 
    date: Date
  ): Promise<{ converted: number; rateDate?: string; isEstimate: boolean }> => {
    const currencyService = CurrencyService.getInstance();
    return currencyService.convertWithDate(amount, from, to, date);
  }, []);

  // Refresh rates for current month
  const refreshCurrentMonth = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    
    try {
      const currencyService = CurrencyService.getInstance();
      // Clear cache for current month to force refresh
      currencyService.clearCache();
      const rates = await currencyService.getMonthlyRates([currentMonth]);
      
      setMonthlyRates(prev => {
        const updated = new Map(prev);
        const monthData = rates.get(currentMonth);
        if (monthData) {
          updated.set(currentMonth, monthData);
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to refresh current month rates:', err);
    }
  }, []);

  // Set up auto-refresh for current month at midnight UTC
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        refreshCurrentMonth();
        // Set up next check
        checkMidnight();
      }, msUntilMidnight);
    };

    const timeoutId = checkMidnight();
    return () => clearTimeout(timeoutId);
  }, [refreshCurrentMonth]);

  return { 
    monthlyRates,
    loading, 
    error, 
    convert,
    convertLegacy, // For backward compatibility
    convertWithDetails,
    refreshCurrentMonth
  };
}