import { 
  doc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Entry, User, UserGroup } from '@/types';

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'entries', entryId));
}

export async function createEntry(entry: Omit<Entry, 'id' | 'createdAt'>): Promise<string> {
  const entryData = {
    ...entry,
    createdAt: serverTimestamp(),
    date: Timestamp.fromDate(entry.date),
  };

  const docRef = await addDoc(collection(db, 'entries'), entryData);
  return docRef.id;
}

export async function updateEntry(entryId: string, updates: Partial<Entry>): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>;
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  
  delete updateData.id;
  
  await updateDoc(doc(db, 'entries', entryId), updateData);
}

export async function getGroupEntries(
  groupId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Entry[]> {
  // Get group members directly by document ID
  const groupDoc = await getDocs(query(collection(db, 'userGroups'), where('__name__', '==', groupId)));
  
  if (groupDoc.empty) {
    return [];
  }
  
  const groupData = groupDoc.docs[0].data();
  const memberIds = groupData.memberIds || [];
  
  if (memberIds.length === 0) {
    return [];
  }
  
  // Build query constraints
  const constraints: Parameters<typeof query>[1][] = [
    where('userId', 'in', memberIds)
  ];
  
  if (startDate) {
    constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
  }
  
  if (endDate) {
    constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
  }
  
  constraints.push(orderBy('date', 'desc'));
  
  const entriesQuery = query(collection(db, 'entries'), ...constraints);
  const snapshot = await getDocs(entriesQuery);
  
  return snapshot.docs.map(doc => convertFirestoreDoc<Entry>(doc));
}

export async function getUserEntries(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Entry[]> {
  const constraints: Parameters<typeof query>[1][] = [
    where('userId', '==', userId)
  ];
  
  if (startDate) {
    constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
  }
  
  if (endDate) {
    constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
  }
  
  constraints.push(orderBy('date', 'desc'));
  
  const entriesQuery = query(collection(db, 'entries'), ...constraints);
  const snapshot = await getDocs(entriesQuery);
  
  return snapshot.docs.map(doc => convertFirestoreDoc<Entry>(doc));
}