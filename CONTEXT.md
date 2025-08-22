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
- **RecurringTemplates**: Schedules that materialize future `entries` (daily/weekly/monthly/yearly)

### Key Features
1. **Multi-currency**: Store in original currency, convert on display
2. **Real-time sync**: Connected users and entries update live
3. **User groups**: Users share all expenses within their group
4. **Simple invitations**: Email-based with accept/reject flow
5. **Recurring entries**: Create schedules that auto-generate future entries; edit a single instance or the whole series

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
  - Recurrence setup lives in `entry-form/recurrence-form.tsx`; series overview in `recurring-view.tsx`

### Currency Handling
- `originalAmount`: Stored with currency code
- **Fixed historical rates**: Uses exchange rates from entry date (not current rates)
- **Monthly rate storage**: Rates grouped by month in Firestore (`exchangeRates/YYYY-MM`)
- **Current implementation**: Frankfurter API for backfill (31 major currencies)
- Display in user's `displayCurrency`
- formatCurrency() handles display with proper signs
- Weekend entries use Friday's rates (forex markets closed)
  - Recurring instances use the rate for their `originalDate` (the scheduled date)

### Daily Budget
- BudgetView component shows remaining daily allowance
- Formula: (monthly income including today - monthly expenses excluding today) / remaining days

### Recurring Entries
- Stored as templates in Firestore collection `recurringTemplates` with:
  - `entryTemplate` (type, originalAmount, currency, category, description)
  - `recurrence` (frequency: `daily|weekly|monthly|yearly`, `interval`, `endDate`, optional `daysOfWeek`, optional `dayOfMonth` for monthly)
  - `startDate`, `instancesCreated`, `createdBy`, `createdAt`, `updatedAt`
- Materialization behavior:
  - On create, all occurrences between `startDate` and `endDate` are generated as normal `entries` with fields:
    - `recurringTemplateId`, `isRecurringInstance = true`, `isModified = false`, `originalDate`
  - Entry IDs use stable format `rt_{templateId}_{yyyyMMdd}`
  - Dates are clamped to `SERVICE_START_DATE` and stored via `toUTCMidnight()`
- Updating a template:
  - Future unmodified instances (>= tomorrow) are deleted and rematerialized
  - Modified instances (`isModified = true`) are preserved
- Stopping a series:
  - Deletes future unmodified instances from a given date forward (default: today)
- Deleting a series:
  - Deletes the template and all instances (modified and unmodified)
- Editing a single instance marks it `isModified = true` and detaches it from future template updates
- Limits:
  - Practical horizons per frequency (see `RECURRENCE_LIMITS`): daily/weekly up to 1 year, monthly/yearly up to 5 years

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


## Tasks
### Architecture
- [x] Timezone-agnostic date storage (All dates are utc midnight)
- [ ] CI/CD pipeline
- [ ] Security audit
- [ ] Rename repo and firebase project to driftlog
- [ ] multi region deploy
### Bugs
- [X] Orphaned groups in db
- [X] Delete invites in db after acceptance

- [ ] Budget headroom settings
### Enhancements
- [x] User groups
- [X] Verify indexes
- [X] Sort entries and categories by date in daily view, top one is expanded. currently not doing for simplicity
- [X] Add indicator when using fallback exchange rates (weekends/missing dates /future dates). currently not doing for simplicity
- [x] Three-dot menu for entries
- [x] Topology background globally
- [x] Default theme: system
- [V] User avatars
### Features
- [x] Email invitations with accept/reject
- [x] Multi-currency with live conversion
- [x] **Fixed historical exchange rates** (uses rates from entry date)
- [x] Daily budget calculation
- [x] Recurring entries

- [ ] **Tiered currency support**: Frankfurter API for free users (31 currencies, no costs), Exchange Rate API for paid users (170+ currencies)
- [ ] Custom categories per group/user - maybe
- [ ] Entry from photo
- [ ] Entry from audio
- [ ] entry from whatsapp message
- [ ] entry from telegram message
- [ ] Limit group size (larger limits for paid users)
- [ ] Location tagging (city, country OR geopoint)

### Monetization ideas
- limit recurring entries count
- limit currencies to frankfurter api (31 currently)
- 2-3 plans max including free
- no ads (need to estimate average free user cost)
- AI features (entry generation)

## AI Context Addendum

- Security rules summary:
  - All access requires auth. Group membership validated via `userGroups/{groupId}.memberIds.hasAny([uid])`.
  - `users`: read/write own; read others if same group.
  - `userGroups`: members can read/update; anyone can create for onboarding.
  - `entries`: group-wide read/create/update/delete; enforce `date >= SERVICE_START_DATE (2025-01-01)` on create/update.
  - `recurringTemplates`: group-wide read/create/update/delete.
  - `groupInvitations`: sender/recipient access; create requires inviter is a member of the target group.
  - `exchangeRates`: read/write allowed for authenticated clients (used by Cloud Function backfill).

- Firestore schema (cheat sheet):
  - `users/{uid}`: `id, email, name, displayName?, photoUrl?, displayCurrency, groupId, createdAt, onboardingCompleted?`
  - `userGroups/{groupId}`: `memberIds[], createdAt, createdBy`
  - `entries/{entryId}`: `id, userId, type, originalAmount, currency, category, description?, date, createdBy, createdAt, updatedAt?, updatedBy?, location?, recurringTemplateId?, originalDate?, isRecurringInstance?, isModified?`
  - `groupInvitations/{id}`: `groupId, invitedEmail, invitedBy, inviterName, createdAt, expiresAt`
  - `recurringTemplates/{id}`: `userId, entryTemplate{type, originalAmount, currency, category, description?}, recurrence{frequency, interval, endDate, daysOfWeek?, dayOfMonth?}, startDate, instancesCreated, createdBy, createdAt, updatedAt?`
  - `exchangeRates/YYYY-MM`: `{ [yyyy-mm-dd]: { [CURRENCY]: rate } }`

- Indexes used:
  - `entries(userId ASC, date DESC)`
  - `entries(userId ASC, recurringTemplateId ASC, date ASC)`
  - `entries(userId ASC, recurringTemplateId ASC, isModified ASC, date ASC)`

- Query limits & patterns:
  - Firestore `in` operator limit: 10 values. Services chunk member lists when needed.
  - Common pattern: equality on `userId` + range on `date` + `orderBy('date')`.

- Local dev setup:
  - Emulators (development only): Auth `9099`, Firestore `8080`, Functions `5001`.
  - Functions region: `us-central1`.
  - Required env (NEXT_PUBLIC_*): `FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, MEASUREMENT_ID`.
  - Deploy rules: `firebase deploy --only firestore:rules --project <project>`.

- Exchange rates flow:
  - Cloud Function `getMonthlyRates` stores documents under `exchangeRates/YYYY-MM`.
  - Cache policy: historical months indefinite; current month until next UTC midnight; future months 1h.
  - Conversion uses exact date or nearest available (weekends/missing); estimates flagged internally.

- Recurring specifics:
  - Entry ID format: `rt_{templateId}_{yyyyMMdd}`; instances store `originalDate`, `isRecurringInstance`, `isModified`.
  - Update template: delete future unmodified instances then rematerialize; preserve modified ones.
  - Stop series: delete future unmodified instances from provided date (default today inclusive).
  - Delete series: remove template and all unmodified instances.

- Entries cache note:
  - Real-time listener over `entries` with `where('userId','in', memberIds)` and optional date bounds; ordered by `date desc`.
  - If cache provider is absent, direct query fallback not implemented.
