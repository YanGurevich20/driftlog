# DriftLog - Expense Tracker for Digital Nomads

Multi-currency expense tracking with real-time collaboration.

## Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Functions)
- **State**: React hooks, real-time Firestore listeners

## Architecture

### Data Model
- **Users**: Profile with `displayCurrency` and `groupId`
- **UserGroups**: Backend-only concept for user associations
- **Entries**: Expenses/income tied to users (not groups)
- **Invitations**: Pending group invitations

### Key Features
1. **Multi-currency**: Store in original currency, convert on display
2. **Real-time sync**: Connected users and entries update live
3. **User groups**: Users share all expenses within their group
4. **Simple invitations**: Email-based with accept/reject flow

## Development Guidelines

**NOTE: Pre-production - No backups or migrations needed. Prioritize development speed.**

### Firestore
- Use `convertFirestoreDoc()` for all document fetches (handles ID + timestamps)
- Dates stored at UTC midnight for timezone consistency
- Security rules enforce group-based access
- Real-time listeners for entries and connected users

### UI Patterns
- DataState component for loading/empty/error states  
- Three-dot menu on entries for edit/delete
- Minimal header icons for actions
- Compact horizontal layouts for empty states
- Let shadcn handle default spacing/styling

### Currency Handling
- `originalAmount`: Stored with currency code
- **Fixed historical rates**: Uses exchange rates from entry date (not current rates)
- **Monthly rate storage**: Rates grouped by month in Firestore (`exchangeRates/YYYY-MM`)
- **Current implementation**: Frankfurter API for backfill (31 major currencies)
- Display in user's `displayCurrency`
- formatCurrency() handles display with proper signs
- Weekend entries use Friday's rates (forex markets closed)

### Daily Budget
- BudgetView component shows remaining daily allowance
- Formula: (monthly income including today - monthly expenses excluding today) / remaining days

## Project Structure
```
/src
  /app          - Next.js pages
  /components   - React components  
  /hooks        - Custom hooks (use-entries, use-connected-users)
  /services     - Firebase services
  /lib          - Utilities
/functions      - Cloud Functions (getMonthlyRates)
/scripts        - Utility scripts (backfill-exchange-rates.js)
```

## Completed Features
- [x] User groups with real-time sync
- [x] Connected users replacing spaces
- [x] Email invitations with accept/reject
- [x] Multi-currency with live conversion
- [x] **Fixed historical exchange rates** (uses rates from entry date)
- [x] Daily budget calculation
- [x] Timezone-agnostic date storage
- [x] Three-dot menu for entries
- [x] Topology background globally
- [x] Default theme: system

## Future Tasks
### Architecture
- [ ] CI/CD pipeline
- [ ] Security audit
- [ ] Rename repo and firebase project to driftlog
### Bugs
- [ ] Budget headroom settings
- [ ] Delete invites in db after acceptance
- [ ] Orphaned groups in db
### Enhancements
- [ ] User avatars
- [ ] Verify indexes
- [ ] Sort entries and categories by date in daily view, top one is expanded
- [ ] Add indicator when using fallback exchange rates (weekends/missing dates /future dates)
### Features
- [ ] **Tiered currency support**: Frankfurter API for free users (31 currencies, no costs), Exchange Rate API for paid users (170+ currencies)
- [ ] Custom categories per group/user - maybe
- [ ] Recurring transactions
- [ ] Entry from photo
- [ ] Entry from audio
- [ ] entry from whatsapp message
- [ ] entry from telegram message
- [ ] Limit group size (larger limits for paid users)
- [ ] Location tagging (city, country OR geopoint)
