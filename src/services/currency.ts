import { httpsCallable } from 'firebase/functions';
import { getCurrencyByCode } from '@/lib/currencies';
import { functions } from '@/lib/firebase';
import type { MonthlyExchangeRates, DailyRates } from '@/types';

interface GetMonthlyRatesRequest {
  months: string[];
}

interface GetMonthlyRatesResponse {
  monthlyRates: {
    [month: string]: {
      rates: {
        [date: string]: DailyRates;
      };
      lastUpdated: { _seconds: number; _nanoseconds: number };
    };
  };
}

export class CurrencyService {
  private static instance: CurrencyService;
  private monthlyCache: Map<string, MonthlyExchangeRates> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isCacheValid(monthKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(monthKey);
    if (!timestamp) return false;

    const now = Date.now();
    const currentMonth = this.getMonthKey(new Date());
    
    // Historical months can be cached indefinitely
    if (monthKey < currentMonth) {
      return true;
    }
    
    // Current month: cache until midnight UTC
    if (monthKey === currentMonth) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return now < tomorrow.getTime();
    }
    
    // Future months: cache for 1 hour
    return (now - timestamp) < 60 * 60 * 1000;
  }

  async getMonthlyRates(months: string[]): Promise<Map<string, MonthlyExchangeRates>> {
    const result = new Map<string, MonthlyExchangeRates>();
    const monthsToFetch: string[] = [];

    // Check cache first
    for (const month of months) {
      if (this.isCacheValid(month)) {
        const cached = this.monthlyCache.get(month);
        if (cached) {
          result.set(month, cached);
          continue;
        }
      }
      monthsToFetch.push(month);
    }

    // Fetch missing months
    if (monthsToFetch.length > 0) {
      const getMonthlyRates = httpsCallable<GetMonthlyRatesRequest, GetMonthlyRatesResponse>(
        functions,
        'getMonthlyRates'
      );

      try {
        const response = await getMonthlyRates({ months: monthsToFetch });
        const { monthlyRates } = response.data;

        for (const [month, data] of Object.entries(monthlyRates)) {
          const monthData: MonthlyExchangeRates = {
            rates: data.rates,
            lastUpdated: new Date(data.lastUpdated._seconds * 1000),
          };
          
          // Update cache
          this.monthlyCache.set(month, monthData);
          this.cacheTimestamps.set(month, Date.now());
          result.set(month, monthData);
        }
      } catch (error) {
        console.error('Failed to fetch monthly rates:', error);
        // Return what we have in cache even if expired
        for (const month of monthsToFetch) {
          const cached = this.monthlyCache.get(month);
          if (cached) {
            result.set(month, cached);
          }
        }
      }
    }

    return result;
  }

  private findNearestRates(monthlyRates: MonthlyExchangeRates, targetDate: string): DailyRates | null {
    const availableDates = Object.keys(monthlyRates.rates).sort();
    if (availableDates.length === 0) return null;

    // Exact match
    if (monthlyRates.rates[targetDate]) {
      return monthlyRates.rates[targetDate];
    }

    // Find nearest date (prefer past over future)
    let nearestPast: string | null = null;
    let nearestFuture: string | null = null;

    for (const date of availableDates) {
      if (date < targetDate) {
        nearestPast = date;
      } else if (date > targetDate && !nearestFuture) {
        nearestFuture = date;
      }
    }

    // Prefer past date, fallback to future
    const nearestDate = nearestPast || nearestFuture;
    return nearestDate ? monthlyRates.rates[nearestDate] : null;
  }

  async convertWithDate(amount: number, from: string, to: string, date: Date): Promise<{ 
    converted: number; 
    rateDate?: string;
    isEstimate: boolean;
  }> {
    if (from === to) {
      return { converted: amount, isEstimate: false };
    }

    const monthKey = this.getMonthKey(date);
    const dateKey = this.getDateKey(date);
    
    // Get rates for the month
    const monthlyRates = await this.getMonthlyRates([monthKey]);
    const monthData = monthlyRates.get(monthKey);
    
    if (!monthData || Object.keys(monthData.rates).length === 0) {
      // No rates available for this month - use today's rates as fallback
      const today = new Date();
      const todayMonth = this.getMonthKey(today);
      const todayRates = await this.getMonthlyRates([todayMonth]);
      const todayData = todayRates.get(todayMonth);
      
      if (todayData) {
        const todayKey = this.getDateKey(today);
        const rates = this.findNearestRates(todayData, todayKey);
        if (rates && rates[from] && rates[to]) {
          const amountInUSD = from === 'USD' ? amount : amount / rates[from];
          const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
          return { 
            converted: Math.round(converted * 100) / 100,
            rateDate: todayKey,
            isEstimate: true
          };
        }
      }
      
      console.warn(`No rates available for ${monthKey}, returning original amount`);
      return { converted: amount, isEstimate: true };
    }

    // Find rates for the specific date or nearest available
    const rates = this.findNearestRates(monthData, dateKey);
    
    if (!rates) {
      console.warn(`No rates found for ${dateKey}, returning original amount`);
      return { converted: amount, isEstimate: true };
    }

    if (!rates[from] || !rates[to]) {
      console.warn(`Currency ${from} or ${to} not supported for ${dateKey}`);
      return { converted: amount, isEstimate: true };
    }

    // Convert through USD as base
    const amountInUSD = from === 'USD' ? amount : amount / rates[from];
    const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
    
    // Check if we used the exact date or a different one
    const isEstimate = !monthData.rates[dateKey];
    const actualRateDate = isEstimate ? 
      Object.keys(monthData.rates).find(d => monthData.rates[d] === rates) : 
      dateKey;
    
    return { 
      converted: Math.round(converted * 100) / 100,
      rateDate: actualRateDate,
      isEstimate
    };
  }

  // Simple sync conversion for UI components - will be updated to use cached monthly rates
  convertSync(amount: number, from: string, to: string, date: Date): number {
    if (from === to) return amount;

    const monthKey = this.getMonthKey(date);
    const dateKey = this.getDateKey(date);
    
    // Try to use cached rates
    const monthData = this.monthlyCache.get(monthKey);
    if (!monthData) {
      console.warn(`No cached rates for ${monthKey}, returning original amount`);
      return amount;
    }

    const rates = this.findNearestRates(monthData, dateKey);
    if (!rates || !rates[from] || !rates[to]) {
      console.warn(`Cannot convert ${from} to ${to} for ${dateKey}`);
      return amount;
    }

    // Convert through USD as base
    const amountInUSD = from === 'USD' ? amount : amount / rates[from];
    const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
    
    return Math.round(converted * 100) / 100;
  }

  getCurrencySymbol(code: string): string {
    const currency = getCurrencyByCode(code);
    return currency?.symbol || code + ' ';
  }

  clearCache(): void {
    this.monthlyCache.clear();
    this.cacheTimestamps.clear();
  }
}