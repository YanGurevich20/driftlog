# DriftLog Deployment Guide

## Important Context Files

### Core Configuration
- `package.json` - Dependencies and build scripts
- `next.config.ts` - Next.js configuration (needs PWA config)
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Database indexes

### Environment & Security
- `.env.local` - Local environment variables (DO NOT COMMIT)
- `.gitignore` - Ensures env files aren't tracked
- `src/lib/firebase.ts` - Firebase initialization
- `src/services/currency.ts:5` - **CRITICAL: Hardcoded API key to extract**

### PWA Files
- `public/manifest.json` - PWA manifest configuration
- `public/icon-192x192.png` - PWA icon

### Documentation
- `PROJECT_SPEC.md` - Full project specification
- `CLAUDE.md` - Development guidelines

## Important Setup Notes

### Environment Variables Required
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_MEASUREMENT_ID=

# API Keys (currently hardcoded - needs extraction)
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=
```

### Current Issues
1. **SECURITY RISK**: ExchangeRate API key hardcoded at `src/services/currency.ts:5`
2. **PWA Config**: `next.config.ts` missing PWA configuration for production
3. **Build**: No CI/CD pipeline configured

### Tech Stack Summary
- **Frontend**: Next.js 15 with Turbopack, TypeScript, Tailwind v4
- **Backend**: Firebase (Auth, Firestore, potential Functions)
- **State**: Zustand + Firestore real-time listeners
- **APIs**: ExchangeRate-API (1500 req/month limit)
- **Package Manager**: pnpm

### Firebase Project
- **Project ID**: drift-log
- **Database**: Firestore in us-central1
- **Auth**: Google Sign-in only

## Next Steps

### Immediate (Pre-Deployment)
- [ ] **CRITICAL**: Move hardcoded API key from `src/services/currency.ts:5` to environment variable
- [ ] Create `.env.production` file with all required variables
- [ ] Test production build locally: `pnpm build && pnpm start`
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
- [ ] Verify ExchangeRate-API key has sufficient quota

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
# Local testing
pnpm build
pnpm start

# Firebase deployment (if using Firebase Hosting)
firebase deploy

# Vercel deployment (automatic via GitHub integration)
# Manual: vercel --prod
```

## API Limits & Monitoring
- **ExchangeRate-API**: 1500 requests/month (~50/day)
- **Current Strategy**: 30-minute cache in Firestore
- **Monitor at**: https://app.exchangerate-api.com/dashboard