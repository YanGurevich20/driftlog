# Next Steps - DriftLog Development

## 🚧 Current Priority: Delete Entry Functionality

### Status
- UI exists with Delete menu item in dropdown
- Handler function not implemented
- Toast notifications ready (Sonner)

### Relevant Files
- `src/components/entries-list.tsx:126-129` - Delete menu item (onClick handler needed)
- `src/types/index.ts` - Entry types definition
- `src/lib/firebase.ts` - Firebase config
- `firestore.rules` - Security rules (may need update for delete permissions)

### Implementation Plan
1. Add delete handler in entries-list.tsx
2. Use Firestore deleteDoc() 
3. Add confirmation dialog before delete
4. Show success/error toast
5. Test with real data

## 📋 Next Up After Delete

### 1. Recurring Transactions
- Types defined in `src/types/index.ts:71-80` (RecurringTemplate)
- Need: UI in entry-modal, Firebase Functions for generation
- Consider: Cron job vs scheduled function

### 2. Payer Selection (Shared Spaces)
- Currently auto-sets to current user (`src/components/entry-modal.tsx:182`)
- Need: Member dropdown when space has multiple members
- Use space.memberIds to populate options

### 3. Export Data
- Add export button in dashboard
- Format options: CSV, JSON
- Include converted amounts in base currency

### 4. Deployment
- Option A: Vercel (simpler for Next.js)
- Option B: Firebase Hosting (already have Firebase setup)
- Update firebase.json for hosting config

## 🎯 Quick Wins
- Delete functionality (1-2 hours)
- Export to CSV (2-3 hours)
- Payer dropdown (2-3 hours)

## 📁 Key Project Structure
```
src/
  components/
    entries-list.tsx    # Transaction list with edit/delete UI
    entry-modal.tsx     # Add/edit transaction form
    monthly-stats.tsx   # Analytics dashboard
  services/
    spaces.ts          # Space management functions
    currency.ts        # Exchange rate handling
  lib/
    firebase.ts        # Firebase config
  types/
    index.ts          # All TypeScript types
```

## 🔧 Tech Stack Reminders
- Next.js 15 with App Router
- Firebase Auth + Firestore
- Shadcn/ui components
- React Hook Form + Zod
- Zustand for preferences
- TypeScript strict mode
- No "any" types allowed