import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseApp } from './firebase-app';

export const functions = getFunctions(firebaseApp, 'asia-southeast1');

if (process.env.NODE_ENV === 'development') {
  const emulatorHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export default functions;


