import { getAuth, RecaptchaVerifier } from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function initializeRecaptcha(): RecaptchaVerifier | null {
  // Skip reCAPTCHA in development or when using emulators
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  try {
    const auth = getAuth();
    
    // Create a reCAPTCHA verifier
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow sign-in
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        // Response expired, user needs to solve reCAPTCHA again
        console.log('reCAPTCHA expired');
      }
    });

    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
}

export function getRecaptchaVerifier(): RecaptchaVerifier | null {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }
  
  if (!recaptchaVerifier) {
    recaptchaVerifier = initializeRecaptcha();
  }
  
  return recaptchaVerifier;
}

export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}