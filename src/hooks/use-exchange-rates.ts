import { useEffect, useCallback, useState } from 'react';
import { CurrencyService } from '@/services/currency';

interface UseExchangeRatesOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useExchangeRates(options?: UseExchangeRatesOptions) {
  const [conversionError, setConversionError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert dates to stable string representations for dependency comparison
  const startDateStr = options?.startDate?.toISOString() || '';
  const endDateStr = options?.endDate?.toISOString() || '';

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
        return;
      }

      try {
        const currencyService = CurrencyService.getInstance();
        await currencyService.getMonthlyRates(requiredMonths);
        // Clear any previous conversion errors when rates are successfully loaded
        setConversionError(null);
      } catch (err) {
        console.error('Failed to fetch monthly exchange rates:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [startDateStr, endDateStr]);

  // Date-aware conversion function that handles errors gracefully
  const convert = useCallback((amount: number, from: string, to: string, date: Date): number => {
    if (from === to) return amount;
    
    try {
      const currencyService = CurrencyService.getInstance();
      const result = currencyService.convertSync(amount, from, to, date);
      // Clear error on successful conversion
      setConversionError(null);
      return result;
    } catch (error) {
      // Set error state but return 0 to avoid breaking calculations
      setConversionError(error as Error);
      return 0;
    }
  }, []);


  return { 
    convert,
    error: conversionError,
    loading: isLoading
  };
}