import { useEffect, useCallback } from 'react';
import { CurrencyService } from '@/services/currency';

interface UseExchangeRatesOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useExchangeRates(options?: UseExchangeRatesOptions) {

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
        return;
      }

      try {
        const currencyService = CurrencyService.getInstance();
        await currencyService.getMonthlyRates(requiredMonths);
      } catch (err) {
        console.error('Failed to fetch monthly exchange rates:', err);
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


  return { 
    convert
  };
}