import { getCurrencyByCode } from './currencies';

export function formatCurrency(amount: number, currencyCode: string, isNegative: boolean, signPositive: boolean = false): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const sign = isNegative ? '-' : (signPositive ? '+' : '');
  return `${sign}${amount.toFixed(2)} ${symbol}`;
}