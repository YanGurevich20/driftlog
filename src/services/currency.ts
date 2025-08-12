import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const EXCHANGE_API_KEY = '6149d6eca53d8869f874fc98'; // Your API key
const EXCHANGE_API_URL = 'https://v6.exchangerate-api.com/v6';
const CACHE_DURATION_MINUTES = 30; // 1500 req/month = ~50/day = refresh every 30 min

interface ExchangeRates {
  rates: Record<string, number>;
  fetchedAt: Timestamp;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private memoryCache: ExchangeRates | null = null;

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private isCacheExpired(fetchedAt: Timestamp): boolean {
    const now = Date.now();
    const cached = fetchedAt.toMillis();
    const diffMinutes = (now - cached) / (1000 * 60);
    return diffMinutes > CACHE_DURATION_MINUTES;
  }

  async getExchangeRates(): Promise<Record<string, number>> {
    // Check memory cache first
    if (this.memoryCache && !this.isCacheExpired(this.memoryCache.fetchedAt)) {
      console.log('Using memory cache');
      return this.memoryCache.rates;
    }

    // Check Firestore cache
    const ratesDoc = await getDoc(doc(db, 'exchangeRates', 'latest'));
    if (ratesDoc.exists()) {
      const data = ratesDoc.data() as ExchangeRates;
      if (!this.isCacheExpired(data.fetchedAt)) {
        console.log('Using Firestore cache');
        this.memoryCache = data;
        return data.rates;
      }
      console.log('Firestore cache expired');
    }

    // Fetch fresh rates from API
    console.log('Fetching fresh rates from API...');
    const response = await fetch(`${EXCHANGE_API_URL}/${EXCHANGE_API_KEY}/latest/USD`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(`Exchange rate API failed: ${data['error-type'] || 'Unknown error'}`);
    }

    const exchangeRates: ExchangeRates = {
      rates: data.conversion_rates,
      fetchedAt: Timestamp.now(),
    };

    // Save to Firestore (overwrite the single 'latest' document)
    await setDoc(doc(db, 'exchangeRates', 'latest'), exchangeRates);
    console.log('Saved fresh rates to Firestore');
    
    // Update memory cache
    this.memoryCache = exchangeRates;
    
    return exchangeRates.rates;
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
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      THB: '฿',
      SGD: 'S$',
      MXN: '$',
      CAD: 'C$',
      AUD: 'A$',
      VND: '₫',
      IDR: 'Rp',
      MYR: 'RM',
      PHP: '₱',
      INR: '₹',
      KRW: '₩',
      HKD: 'HK$',
      TWD: 'NT$',
      NZD: 'NZ$',
      CHF: 'CHF',
      BRL: 'R$',
      NOK: 'kr',
      SEK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      CZK: 'Kč',
      HUF: 'Ft',
      TRY: '₺',
    };
    return symbols[code] || code + ' ';
  }
}