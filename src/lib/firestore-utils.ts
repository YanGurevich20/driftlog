import { Timestamp } from 'firebase/firestore';

/**
 * Converts Firestore Timestamp fields to JavaScript Date objects
 */
export function convertTimestampFields<T extends Record<string, unknown>>(data: T): T {
  const converted = { ...data } as Record<string, unknown>;
  
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value instanceof Timestamp) {
      converted[key] = value.toDate();
    }
  });
  
  return converted as T;
}

/**
 * Converts a Firestore document to a typed object with Date fields
 */
export function convertFirestoreDoc<T>(docData: Record<string, unknown>): T {
  return convertTimestampFields(docData) as T;
}