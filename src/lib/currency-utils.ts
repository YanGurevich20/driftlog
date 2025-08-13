import { getCurrencyByCode } from './currencies';

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  return `${amount.toFixed(2)} ${symbol}`;
}

export function formatCurrencyWithSign(amount: number, currencyCode: string, isIncome: boolean): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const sign = isIncome ? '+' : '';
  return `${sign}${amount.toFixed(2)} ${symbol}`;
}