import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'entries', entryId));
}