import { getCurrencyByCode } from './currencies';

export function formatCurrency(amount: number, currencyCode: string, isNegative: boolean, showPositive: boolean = false): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const sign = isNegative ? '-' : (showPositive ? '+' : '');
  return `${sign}${amount.toFixed(2)} ${symbol}`;
}