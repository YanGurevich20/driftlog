import { getCurrencyByCode } from './currencies';

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatCurrencyWithSign(amount: number, currencyCode: string, isIncome: boolean): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const sign = isIncome ? '+' : '';
  return `${sign}${symbol}${amount.toFixed(2)}`;
}