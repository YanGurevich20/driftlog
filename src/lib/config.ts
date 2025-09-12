// Global application configuration and constants

// Earliest date supported for entries in the system (UTC midnight)
export const SERVICE_START_DATE = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));

// Toggle to temporarily stop new registrations. When true, the landing page
// will show a waitlist notice instead of the sign-in action.
export const REGISTRATIONS_CLOSED = false;

// Functions base URL for callable endpoints routed via Firebase Hosting
// In production we use the custom subdomain; in development, call the local emulator via window hostname
export const FUNCTIONS_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5001`
    : 'https://api.driftlog.work';
