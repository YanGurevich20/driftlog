import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Entry } from '@/types';

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'entries', entryId));
}

export async function updateEntry(entryId: string, updates: Partial<Entry>, updatedBy: string): Promise<void> {
  const docRef = doc(db, 'entries', entryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}