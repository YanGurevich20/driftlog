# DriftLog Deployment Guide

## Important Context Files

### Core Configuration
- `package.json` - Dependencies and build scripts
- `next.config.ts` - Next.js configuration (needs PWA config)
- `firebase.json` - Firebase project configuration with Functions
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Database indexes
- `functions/src/index.ts` - Firebase Functions (exchange rates API)

### Environment & Security
- `.env.local` - Local environment variables (DO NOT COMMIT)
- `.gitignore` - Ensures env files aren't tracked
- `src/lib/firebase.ts` - Firebase initialization
- `src/services/currency.ts` - Currency service (now uses secure Firebase Function)

### PWA Files
- `public/manifest.json` - PWA manifest configuration
- `public/icon-192x192.png` - PWA icon

### Documentation
- `PROJECT_SPEC.md` - Full project specification
- `CLAUDE.md` - Development guidelines

## Important Setup Notes

### Environment Variables Required
```bash
# Firebase Configuration (Frontend - .env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_MEASUREMENT_ID=

# Firebase Functions Secret (Backend - set via CLI)
EXCHANGE_RATE_API_KEY=  # Set using: firebase functions:secrets:set EXCHANGE_RATE_API_KEY
```

### Current Issues
1. **RESOLVED**: ExchangeRate API key moved to secure Firebase Function
2. **PWA Config**: `next.config.ts` missing PWA configuration for production
3. **Build**: No CI/CD pipeline configured

### Tech Stack Summary
- **Frontend**: Next.js 15 with Turbopack, TypeScript, Tailwind v4
- **Backend**: Firebase (Auth, Firestore, Functions v2)
- **State**: Zustand + Firestore real-time listeners
- **APIs**: ExchangeRate-API (1500 req/month limit)
- **Package Manager**: pnpm

### Firebase Project
- **Project ID**: drift-log
- **Database**: Firestore in us-central1
- **Auth**: Google Sign-in only

## Next Steps

### Immediate (Pre-Deployment)
- [x] **COMPLETED**: Moved API key to secure Firebase Function
- [ ] Create `.env.production` file with all required variables
- [ ] Set Firebase secret for Exchange Rate API: `firebase functions:secrets:set EXCHANGE_RATE_API_KEY`
- [ ] Test production build locally: `pnpm build && pnpm start`
- [ ] Test Firebase Functions locally: `cd functions && npm run serve`
- [ ] Update `next.config.ts` with PWA configuration for production
- [ ] Review and update Firestore security rules for production

### Deployment Setup
- [ ] Choose deployment platform (Vercel recommended vs Firebase Hosting)
- [ ] Create Vercel account and connect GitHub repository
- [ ] Configure environment variables in Vercel dashboard
- [ ] Set build settings in Vercel:
  - Build Command: `pnpm build`
  - Output Directory: `.next`
  - Install Command: `pnpm install`

### Firebase Configuration
- [ ] Add production domain to Firebase Console authorized domains
- [ ] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Firebase Functions: `firebase deploy --only functions`
- [ ] Verify Functions are accessible from production domain
- [ ] Monitor Functions logs: `firebase functions:log`

### Post-Deployment
- [ ] Test authentication flow in production
- [ ] Verify PWA installation on mobile devices
- [ ] Test currency conversion with live API
- [ ] Monitor API usage (ExchangeRate-API dashboard)
- [ ] Set up error monitoring (Sentry/LogRocket)
- [ ] Configure custom domain (if applicable)

### Future Enhancements
- [ ] Set up GitHub Actions for CI/CD
- [ ] Add preview deployments for pull requests
- [ ] Implement server-side API key protection
- [ ] Add rate limiting for API calls
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for Firestore
- [ ] Implement Firebase Functions for scheduled tasks (recurring transactions)

## Deployment Commands

```bash
# Set up Firebase secret (one-time)
firebase functions:secrets:set EXCHANGE_RATE_API_KEY
# Enter your API key: 6149d6eca53d8869f874fc98

# Local testing
pnpm build
pnpm start

# Test Functions locally
cd functions && npm run serve

# Firebase deployment
firebase deploy --only functions  # Deploy functions
firebase deploy --only firestore  # Deploy rules and indexes
firebase deploy  # Deploy everything

# Vercel deployment (automatic via GitHub integration)
# Manual: vercel --prod
```

## API Limits & Monitoring
- **ExchangeRate-API**: 1500 requests/month (~50/day)
- **Current Strategy**: 30-minute cache in Firestore
- **Monitor at**: https://app.exchangerate-api.com/dashboard