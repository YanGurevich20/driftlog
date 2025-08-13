# DriftLog - Digital Nomad Expense Tracker

## Vision
Mobile-first PWA for digital nomads to track expenses across multiple currencies with collaborative features for couples/groups.

## Core Features (MVP)

### Authentication ✅
- Google-only authentication via Firebase Auth
- Automatic personal space creation on signup

### Spaces ✅
- Personal space (auto-created) ✅
- Base currency per space (USD default) ✅
- Shared spaces via email invitation ✅
- Member management (owner/member roles) ✅

### Transaction Types
- **Expense**: One-time spending ✅
- **Income**: Revenue/salary entries ✅
- **Recurring**: Template-based scheduled transactions (not implemented)

### Expense Tracking
- **Quick Add**: FAB → Modal with type selection ✅
- **Edit**: Dropdown menu on each entry ✅
- **Delete**: UI exists, handler not implemented 🚧
- **Fields**:
  - Amount (required) ✅
  - Currency (default: last used, preference-based) ✅
  - Category (predefined, separate for income/expense) ✅
  - Description ✅
  - Date picker (defaults to today) ✅
  - Payer (auto-set to current user, no selection UI)
  - Location (not implemented)

### Currency Management ✅
- 30-minute cached exchange rates via ExchangeRate-API (1500 req/month limit) ✅
- Automatic conversion to space base currency on transaction creation ✅
- USD as reference currency for API ✅
- Stores both original and converted amounts ✅
- **Currency Selection UI**: ✅
  - Support all 163 available currencies from API ✅
  - Search/filter functionality for easy selection ✅
  - Recent/favorite currencies for quick access ✅
  - Smart ordering based on user preferences ✅
  - Display with currency symbols throughout UI ✅

### Analytics 
- Primary view: Monthly breakdown ✅
- Category analysis (top 3 categories) ✅
- Net income/expense display ✅
- Currency exposure (not implemented)
- Location-based insights (not implemented)

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router) ✅
- **Language**: TypeScript (strict) ✅
- **UI**: Shadcn/ui + Caffeine theme ✅
- **State**: 
  - Zustand (client state, preferences) ✅
  - Real-time Firestore listeners ✅
- **PWA**: next-pwa ✅
- **Forms**: React Hook Form + Zod ✅

### Backend
- **Project**: Google Cloud (drift-log) ✅
- **Auth**: Firebase Authentication ✅
- **Database**: Firestore ✅
- **Functions**: Firebase Functions (not implemented)
- **APIs**: ExchangeRate-API (with API key) ✅

### Infrastructure
- **Hosting**: TBD (Vercel or Firebase Hosting)
- **IaC**: Firebase CLI + version control ✅
- **CI/CD**: GitHub Actions (not implemented)

## Data Models

### User
```typescript
{
  id: string
  email: string
  name: string
  displayName?: string
  photoUrl?: string
  mainCurrency: string
  defaultSpaceId: string
  createdAt: timestamp
}
```

### Space
```typescript
{
  id: string
  name: string
  baseCurrency: string // USD, EUR, etc.
  ownerId: string
  memberIds: string[]
  createdAt: timestamp
}
```

### SpaceInvitation
```typescript
{
  id: string
  spaceId: string
  spaceName: string
  invitedEmail: string
  invitedBy: string // userId
  inviterName: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp
  expiresAt: timestamp // 7 days from creation
}
```

### Transaction (formerly Event)
```typescript
type TransactionType = 'expense' | 'income' | 'recurring'

interface BaseTransaction {
  id: string
  type: TransactionType
  spaceId: string
  amount: number // original amount
  currency: string // original currency
  convertedAmount: number // in space's base currency
  baseCurrency: string // space's base currency at time of transaction
  category: string
  description?: string
  date: timestamp
  createdBy: string
  createdAt: timestamp
}

interface Expense extends BaseTransaction {
  type: 'expense'
  payerId: string
  location?: { lat: number, lng: number }
}

interface Income extends BaseTransaction {
  type: 'income'
  source: string
}

interface RecurringTemplate extends BaseTransaction {
  type: 'recurring'
  frequency: 'daily' | 'weekly' | 'monthly'
  nextRun: timestamp
  endDate?: timestamp
  isActive: boolean
}
```

### ExchangeRates
```typescript
{
  // Single document with id: 'latest'
  rates: Record<string, number> // all rates relative to USD
  fetchedAt: timestamp // for cache expiry check (30 min)
}
```

## User Flows

### Quick Add (Primary Flow) ✅
1. Tap FAB
2. Modal opens with transaction form
3. Fill required fields (amount, currency, category)
4. Auto-convert to space currency using cached rates
5. Save to Firestore

### Recurring Setup (not implemented)
1. Add Transaction → Select Recurring
2. Fill transaction details
3. Set frequency
4. Confirm creation
5. Function generates instances daily

## Implementation Status

### ✅ Completed
- Next.js 15 setup with TypeScript and Turbopack
- Firebase Authentication with Google Sign-in
- Firestore database setup with security rules
- User and Space creation on signup
- Transaction CRUD operations (Create, Read, Update)
- Edit entries functionality with modal reuse
- Real-time transaction list with Firestore listeners
- Currency conversion with ExchangeRate-API
- 30-minute rate caching strategy
- Monthly statistics dashboard with balance display
- PWA configuration with manifest
- Zustand preferences store (last used currency, recent currencies)
- Tailwind v4 with Caffeine theme
- Dark mode support with next-themes
- All 163 currencies from ExchangeRate-API
- Smart currency selection UI with search
- Currency symbols display throughout UI
- Reusable currency selector component
- Shared spaces with email invitations
- Space switching and member management
- Current space indicator in dashboard
- Date picker for transactions
- Smart date formatting (Today, Yesterday, X days ago)
- Separate categories for income/expense
- Toast notifications with Sonner
- Neutral UI colors for better UX

### 🚧 In Progress
- Delete entries functionality (UI exists, handler needed)

### 📋 Next Up
- Recurring transactions implementation
- Payer selection in shared spaces
- Export data functionality
- Deployment (Vercel or Firebase Hosting)
- CI/CD with GitHub Actions

### 🔮 Future Features
- Location tracking for transactions
- Advanced analytics and reports
- Budget limits and alerts
- Bill splitting
- Receipt photo uploads
- Offline support with sync
- Multi-language support

## Security Rules ✅
- Users can only access their spaces
- Space members can CRUD transactions
- Only owners can manage space settings
- Exchange rates readable/writable by authenticated users

## Development Guidelines
- Mobile-first design
- Optimistic UI updates
- TypeScript strict mode
- No comments in code
- English only interface
- Transactions stored with both original and converted amounts
- Exchange rates cached for 30 minutes to optimize API usage

## UX Guidelines
- **Arrow semantics**: Down arrow for expenses, up arrow for income
- **Color scheme**: Primary color for income (positive association), default for expenses
- **Balance display**: Show negative sign for negative balance, no sign for positive
- **Amount display**: Never show + or - signs on individual entries
- **Currency format**: Sign (if needed), number, then symbol (e.g., -123.45 USD)
- **Consistent styling**: No red/green for expenses/income, use primary color for positive