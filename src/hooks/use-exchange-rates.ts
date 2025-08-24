import { useEffect, useState } from 'react';
import { CurrencyService } from '@/services/currency';
import type { MonthlyExchangeRates } from '@/types';

interface UseExchangeRatesOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useExchangeRates(options?: UseExchangeRatesOptions) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratesByMonth, setRatesByMonth] = useState<Map<string, MonthlyExchangeRates> | null>(null);

  // Convert dates to stable string representations for dependency comparison
  const startDateStr = options?.startDate?.toISOString() || '';
  const endDateStr = options?.endDate?.toISOString() || '';

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      setError(null);
      setRatesByMonth(null);

      // Calculate which months we need based on date range
      const months = new Set<string>();
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        // Use UTC dates for month calculation to avoid timezone issues
        const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
        const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
        
        while (current <= endUTC) {
          const year = current.getUTCFullYear();
          const month = String(current.getUTCMonth() + 1).padStart(2, '0');
          months.add(`${year}-${month}`);
          current.setUTCMonth(current.getUTCMonth() + 1);
        }
        
        // Always include current month as fallback for conversions
        const now = new Date();
        const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        months.add(currentMonth);
      } else {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        months.add(`${year}-${month}`);
      }

      const requiredMonths = Array.from(months);
      if (requiredMonths.length === 0) {
        setRatesByMonth(new Map());
        setLoading(false);
        return;
      }

      try {
        const currencyService = CurrencyService.getInstance();
        const map = await currencyService.getMonthlyRates(requiredMonths);

        // Accept empty future months (we'll fall back to nearest past in convertAmount)
        // Only error if all months are empty AND we have no historical data to fall back on
        const hasAnyRates = Array.from(map.values()).some((m) => m && Object.keys(m).length > 0);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const hasCurrentOrPastMonth = requiredMonths.some(month => month <= currentMonth);
        
        if (!hasAnyRates && hasCurrentOrPastMonth) {
          setRatesByMonth(null);
          throw new Error('No exchange rates data available');
        }

        // Clone to avoid external mutation concerns
        setRatesByMonth(new Map(map));
      } catch (err) {
        console.error('Failed to fetch monthly exchange rates:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [startDateStr, endDateStr]);

  return {
    ratesByMonth,
    loading,
    error,
  };
}