import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseApp } from './firebase-app';

// Initialize App Check in the browser only
if (typeof window !== 'undefined') {
  try {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
    const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

    if (siteKey && !(process.env.NODE_ENV === 'development' && debugToken)) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (process.env.NODE_ENV === 'development' && debugToken) {
      // Enable debug mode; initialize App Check so services receive debug tokens
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(siteKey || 'debug-site-key'),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('App Check init skipped/failed:', err);
  }
}

export {};


