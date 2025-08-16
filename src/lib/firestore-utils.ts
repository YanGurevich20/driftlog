import { Timestamp, DocumentSnapshot } from 'firebase/firestore';

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
 * Can be used with either raw data or a DocumentSnapshot
 */
export function convertFirestoreDoc<T>(
  docOrData: DocumentSnapshot | Record<string, unknown>,
  includeId = true
): T {
  let data: Record<string, unknown>;
  let id: string | undefined;
  
  if ('data' in docOrData && typeof docOrData.data === 'function') {
    // It's a DocumentSnapshot
    const snapshot = docOrData as DocumentSnapshot;
    data = snapshot.data() || {};
    id = snapshot.id;
  } else {
    // It's raw data
    data = docOrData as Record<string, unknown>;
  }
  
  const converted = convertTimestampFields(data);
  
  if (includeId && id) {
    return { id, ...converted } as T;
  }
  
  return converted as T;
}