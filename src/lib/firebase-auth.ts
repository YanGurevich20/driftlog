import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

export const auth = getAuth(firebaseApp);

if (process.env.NODE_ENV === 'development') {
  const emulatorHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

export default auth;


