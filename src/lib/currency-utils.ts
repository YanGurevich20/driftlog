import { getCurrencyByCode } from './currencies';
import type { MonthlyExchangeRates, DailyRates } from '@/types';

export function formatCurrency(amount: number, currencyCode: string, isNegative: boolean, signPositive: boolean = false): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const sign = isNegative ? '-' : (signPositive ? '+' : '');
  return `${sign}${amount.toFixed(2)} ${symbol}`;
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function findNearestRates(monthlyRates: MonthlyExchangeRates, targetDateKey: string): DailyRates | null {
  const availableDates = Object.keys(monthlyRates).sort();
  if (availableDates.length === 0) return null;

  if (monthlyRates[targetDateKey]) {
    return monthlyRates[targetDateKey];
  }

  let nearestPast: string | null = null;
  let nearestFuture: string | null = null;
  for (const d of availableDates) {
    if (d < targetDateKey) {
      nearestPast = d;
    } else if (d > targetDateKey && !nearestFuture) {
      nearestFuture = d;
    }
  }
  const nearest = nearestPast || nearestFuture;
  return nearest ? monthlyRates[nearest] : null;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  date: Date,
  ratesByMonth: Map<string, MonthlyExchangeRates>
): number {
  if (from === to) return amount;

  const monthKey = getMonthKey(date);
  const dateKey = getDateKey(date);
  let monthly = ratesByMonth.get(monthKey);
  if (!monthly) {
    // Cross-month fallback: use nearest previous month available
    const monthKeys = Array.from(ratesByMonth.keys()).sort();
    const previousMonthKey = monthKeys.filter((m) => m < monthKey).pop();
    if (previousMonthKey) {
      monthly = ratesByMonth.get(previousMonthKey)!;
    }
  }
  if (!monthly) {
    throw new Error(`Rates for month ${monthKey} are not loaded`);
  }
  const rates = findNearestRates(monthly, dateKey);
  if (!rates) {
    throw new Error(`No exchange rates available near ${dateKey}`);
  }
  if (!rates[from] || !rates[to]) {
    throw new Error(`Unsupported currency conversion ${from} -> ${to}`);
  }
  const amountInUSD = from === 'USD' ? amount : amount / rates[from];
  const converted = to === 'USD' ? amountInUSD : amountInUSD * rates[to];
  return Math.round(converted * 100) / 100;
}