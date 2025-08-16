import { useState, useEffect } from 'react';
import { CurrencyService } from '@/services/currency';

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const currencyService = CurrencyService.getInstance();
        const fetchedRates = await currencyService.getExchangeRates();
        setRates(fetchedRates);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch exchange rates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
    
    // Refresh rates every 15 minutes
    const interval = setInterval(fetchRates, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    
    if (!rates) {
      console.warn('No exchange rates available, returning original amount');
      return amount;
    }
    
    if (!rates[from] || !rates[to]) {
      console.warn(`Currency ${from} or ${to} not supported, returning original amount`);
      return amount;
    }
    
    // Convert through USD as base
    const amountInUSD = from === 'USD' ? amount : amount / rates[from];
    const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
    
    return Math.round(converted * 100) / 100;
  };

  return { rates, loading, error, convert };
}