import { getStorage } from 'firebase/storage';
import { firebaseApp } from './firebase-app';

export const storage = getStorage(firebaseApp);

export default storage;


