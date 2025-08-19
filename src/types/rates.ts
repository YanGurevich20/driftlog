export interface DailyRates {
  [currency: string]: number;
}

export interface MonthlyExchangeRates {
  [date: string]: DailyRates; // "YYYY-MM-DD" -> rates
}


