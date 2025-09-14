import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

// Initialize App Check in the browser only
if (typeof window !== 'undefined') {
  try {
    const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
    if (reCaptchaSiteKey) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(reCaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (process.env.NODE_ENV === 'development') {
      // In local dev, it's common to use the debug token. If you set
      // NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN in your env, the SDK will use it.
      // See https://firebase.google.com/docs/app-check/web/debug-provider
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || true;
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY || 'debug-site-key';
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (err) {
    // Avoid crashing the app if App Check init fails
    // eslint-disable-next-line no-console
    console.warn('App Check initialization skipped/failed:', err);
  }
}

export default firebaseApp;


