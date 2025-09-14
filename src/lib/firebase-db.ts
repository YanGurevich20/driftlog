import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseApp } from './firebase-app';

// Use regional Firestore instance
export const db = getFirestore(firebaseApp);

if (process.env.NODE_ENV === 'development') {
  const emulatorHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  connectFirestoreEmulator(db, emulatorHost, 8080);
}

export default db;


