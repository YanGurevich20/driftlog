# DriftLog

Multi-currency expense tracking with real-time collaboration.

## Quickstart

- Prereqs: Node 20+, pnpm, Firebase CLI
- Install: `pnpm i`
- Env: copy `.env.example` to `.env.local` and fill values
- Dev with emulators: `pnpm emus`, `pnpm seed` (fills exchange rates), `pnpm dev`

## Config

- Required env vars (see `.env.example`):
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_MEASUREMENT_ID`

## Deploy

- Web: your preferred host (e.g., Vercel)
- Firebase Functions/Rules: `firebase deploy`

## More

- Architecture and data model: see `CL_context.md`.
