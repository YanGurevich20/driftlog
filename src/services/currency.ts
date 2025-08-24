import type { MonthlyExchangeRates, DailyRates } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


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
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
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

  private async loadMonthFromFirestore(monthKey: string): Promise<MonthlyExchangeRates | null> {
    const ref = doc(db, 'exchangeRates', monthKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as MonthlyExchangeRates;
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

    // Fetch missing months directly from Firestore
    if (monthsToFetch.length > 0) {
      await Promise.all(monthsToFetch.map(async (month) => {
        try {
          const monthData = await this.loadMonthFromFirestore(month);
          if (monthData) {
            this.monthlyCache.set(month, monthData);
            this.cacheTimestamps.set(month, Date.now());
            result.set(month, monthData);
          } else {
            // Cache empty object to avoid repeated reads; conversions will estimate/fail gracefully
            const empty: MonthlyExchangeRates = {};
            this.monthlyCache.set(month, empty);
            this.cacheTimestamps.set(month, Date.now());
            result.set(month, empty);
          }
        } catch (error) {
          console.error(`Failed to read exchangeRates/${month} from Firestore:`, error);
          const cached = this.monthlyCache.get(month);
          if (cached) {
            result.set(month, cached);
          }
        }
      }));
    }

    return result;
  }

  private findNearestRates(monthlyRates: MonthlyExchangeRates, targetDate: string): DailyRates | null {
    const availableDates = Object.keys(monthlyRates).sort();
    if (availableDates.length === 0) return null;

    // Exact match
    if (monthlyRates[targetDate]) {
      return monthlyRates[targetDate];
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
    return nearestDate ? monthlyRates[nearestDate] : null;
  }

  convert(amount: number, from: string, to: string, date: Date): number {
    if (from === to) return amount;

    const monthKey = this.getMonthKey(date);
    const dateKey = this.getDateKey(date);
    
    const monthData = this.monthlyCache.get(monthKey);
    if (!monthData) {
      throw new Error(`No cached rates for ${monthKey}. Please wait for rates to load.`);
    }

    const rates = this.findNearestRates(monthData, dateKey);
    if (!rates) {
      throw new Error(`No exchange rates found for ${dateKey}`);
    }
    
    if (!rates[from] || !rates[to]) {
      throw new Error(`Cannot convert ${from} to ${to}: unsupported currency`);
    }

    const amountInUSD = from === 'USD' ? amount : amount / rates[from];
    const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
    
    return Math.round(converted * 100) / 100;
  }

  clearCache(): void {
    this.monthlyCache.clear();
    this.cacheTimestamps.clear();
  }
}