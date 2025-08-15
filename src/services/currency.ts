import { httpsCallable } from 'firebase/functions';
import { getCurrencyByCode } from '@/lib/currencies';
import { functions } from '@/lib/firebase';

interface ExchangeRatesResponse {
  rates: Record<string, number>;
  fetchedAt: number;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private memoryCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
  private readonly CACHE_DURATION_MINUTES = 30;

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private isCacheExpired(fetchedAt: number): boolean {
    const now = Date.now();
    const diffMinutes = (now - fetchedAt) / (1000 * 60);
    return diffMinutes > this.CACHE_DURATION_MINUTES;
  }

  async getExchangeRates(): Promise<Record<string, number>> {
    // Check memory cache first
    if (this.memoryCache && !this.isCacheExpired(this.memoryCache.fetchedAt)) {
      return this.memoryCache.rates;
    }

    // Call Firebase Function to get rates (it handles Firestore caching)
    const getExchangeRatesFunction = httpsCallable<void, ExchangeRatesResponse>(
      functions,
      'getExchangeRates'
    );
    
    try {
      const result = await getExchangeRatesFunction();
      const { rates, fetchedAt } = result.data;
      
      // Update memory cache
      this.memoryCache = { rates, fetchedAt };
      
      return rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      throw new Error('Failed to fetch exchange rates. Please try again later.');
    }
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const rates = await this.getExchangeRates();
    
    if (!rates[from]) {
      throw new Error(`Currency ${from} not supported`);
    }
    if (!rates[to]) {
      throw new Error(`Currency ${to} not supported`);
    }
    
    // Convert through USD as base
    const amountInUSD = from === 'USD' ? amount : amount / rates[from];
    const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
    
    return Math.round(converted * 100) / 100; // Round to 2 decimal places
  }

  getCurrencySymbol(code: string): string {
    const currency = getCurrencyByCode(code);
    return currency?.symbol || code + ' ';
  }
}