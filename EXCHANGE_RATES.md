# Exchange Rate Implementation

## Overview
Fixed exchange rate system that stores historical rates and uses them for accurate currency conversion based on entry dates.

## Architecture

### Storage Structure
```typescript
// Firestore Document: exchangeRates/YYYY-MM
{
  rates: {
    "YYYY-MM-DD": {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      // ... ~160 currencies
    },
    // ... all days in month
  },
  lastUpdated: Timestamp
}
```

### Data Flow
1. User creates entry → stores `originalAmount` + `currency` + `date`
2. When viewing entries → fetch entries + corresponding month(s) rates
3. Convert amounts using rates from entry date (not today's rates)
4. Cache monthly rate documents client-side

## Implementation Details

### Key Files

#### Backend
- `functions/src/index.ts` - Cloud functions for fetching rates
  - `getExchangeRates` - Modified to fetch/store monthly snapshots
  - `backfillHistoricalRates` - One-time script to populate historical data

#### Frontend
- `src/services/currency.ts` - Currency service with monthly rate handling
- `src/hooks/use-exchange-rates.ts` - Hook for fetching and caching monthly rates
- `src/types/index.ts` - Type definitions for rate structures

#### Components Using Rates
- `src/components/daily-view.tsx`
- `src/components/monthly-view.tsx`
- `src/components/budget-view.tsx`
- `src/components/entry-form.tsx`

### Caching Strategy

#### Client-Side
- **Historical months**: Cache indefinitely (rates don't change)
- **Current month**: Cache until midnight UTC
- **Future months**: Use today's rates as fallback

#### Server-Side (Firestore)
- Monthly documents stored permanently
- Updated daily via cloud function (on-demand)

### Date Handling
- Entry dates stored as UTC midnight
- Rate keys format: `YYYY-MM-DD` (ISO 8601)
- Conversion: `entry.date.toISOString().split('T')[0]`

### Fallback Strategy
1. Exact date match → use those rates
2. Date missing → use nearest available date (prefer past over future)
3. Month missing → use current rates with warning indicator

## API Integration

### Exchange Rate API
- Provider: exchangerate-api.com
- Endpoint: `https://v6.exchangerate-api.com/v6/{API_KEY}/history/USD/{YEAR}/{MONTH}/{DAY}`
- Historical data available: 2024-01-01 onwards
- Base currency: USD

### Backfill Process
1. Iterate from 2024-01-01 to today
2. Fetch daily rates from API
3. Group by month and store in Firestore
4. Skip existing dates to avoid overwriting

## Data Types

```typescript
interface MonthlyExchangeRates {
  rates: {
    [date: string]: { // "YYYY-MM-DD"
      [currency: string]: number
    }
  }
  lastUpdated: Timestamp
}

interface ExchangeRateContext {
  getMonthlyRates(year: number, month: number): Promise<MonthlyExchangeRates>
  convertAmount(amount: number, from: string, to: string, date: Date): number
  clearCache(): void
}
```

## Migration Notes

### Constraints
- App will restrict entries to dates after 2024-01-01
- Existing entries before this date need handling (TODO)

### Deployment Steps
1. Deploy new cloud functions
2. Run backfill script
3. Deploy frontend changes
4. Monitor for issues

## Testing

### Local Testing
- Use Firebase emulators
- Seed test data for specific months
- Test edge cases:
  - Missing dates
  - Month boundaries
  - Future entries
  - Cache invalidation

### Test Scenarios
1. Create entry with past date → verify uses historical rate
2. Create entry with today's date → verify uses today's rate
3. Create entry with future date → verify uses today's rate as fallback
4. View monthly summary → verify all entries use correct daily rates
5. Navigate between months → verify proper caching

## Performance Considerations

- Document size: ~42KB per month (170 currencies × 31 days)
- Firestore reads: 1 read per month viewed
- Client memory: ~500KB for full year cached
- API calls: 1 per day for backfill, then on-demand

## Future Enhancements (TODO)
- [ ] Prefetch adjacent months for smooth navigation
- [ ] Add rate source indicator in UI if using fallback
- [ ] Implement entry date restriction (>= 2024-01-01)
- [ ] Add offline support with IndexedDB - optional
- [ ] Rate update monitoring/alerts