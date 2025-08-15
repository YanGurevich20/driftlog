## Architecture overview

## Important Code Patterns
- **Firestore Timestamps**: Always use `convertFirestoreDoc()` from `/lib/firestore-utils` when fetching docs
- **Date Storage**: Dates stored at UTC midnight for timezone consistency. Use `toUTCMidnight()` when saving, `fromUTCMidnight()` when displaying
- **Date Queries**: All date ranges use UTC boundaries via `getUTCStartOfDay()` and `getUTCEndOfDay()` from `/lib/date-utils`
- **Entry Display**: Entries without descriptions show "No description" in daily view
- **Categories**: Can have mixed income/expense entries (e.g., "Freelance", "Investment")
- **Edit/Delete**: Three-dot menu on entries for both mobile/desktop
- **Currency**: formatCurrency() handles display, negative amounts shown with sign
- **Entry Amounts**: ALWAYS use `convertedAmount` for calculations - it's the unified value in space's base currency. The `amount` field is only the original amount in the entry's currency
- **Cloud Functions v2**: Uses onCall (CORS handled automatically), check docs for v2 patterns
- **Daily Budget**: Separate BudgetView component, calculates (net before today + today's income) / remaining days

## Important files
## Questions
- [ ] why does src/services/spaces.ts use spreading and overriding on id?
- [ ] why are the types not shared between functions and callers?
- [ ] How does secret management work? what is public, and what is secret? where is everything stored, and how is it accessed when needed?
- [ ] Is it good that we define cloud functions in the same repo as the next app?
- [ ] What are PWA, SSR, Next.js? How are we using them?

## Backend Tasks
- [V] Check if cors: true is not required (defaults to true for callable)
- [ ] HTTPS only
- [ ] Automate deploymetns
- [ ] Security audit
- [ ] Cloudflare proxied DNS
- [ ] Change project name and repo to driftlog (from drift-log)
- [ ] CI/CD
- [ ] Update functions dependencies
- [ ] IAC?

## App Tasks
- [V] Add names to month/day views in cards
- [V] Return edit/delete functionality on entries (three-dot menu)
- [V] Add remaining daily budget (BudgetView component)
- [X] pre-fill amount in entry form with last entered amount (decided better ux without)
- [V] Implement timezone-agnostic date storage (UTC midnight)
- [ ] Rename entry fields for clarity: `amount` -> `originalAmount`, keep `convertedAmount` as is
- [ ] Improve space management
- [ ] Custom categories. Perhaps per space? and let edit in space managemnet

## Brainstorming
- Perhaps we can add future expenses (just selecting a future date)
- This will affect the monthly balance
- Crazy idea: Instead of budgeting and expected expenses, we can just add a utility screen / form section in entry creation for recurring:
- - let's say you want to add rent, you select all the normal fields, and then recurrence settings (set date per month, more advanced times in the future)
- - the expenses will be pre-set. it just can't be infinite (kinda like google calendar meetings?)