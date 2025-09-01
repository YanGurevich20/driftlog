import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { BudgetAllocation } from '@/types';

export async function createBudgetAllocation(
  allocation: Omit<BudgetAllocation, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'budgetAllocations'), {
    ...allocation,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBudgetAllocation(
  allocationId: string,
  updates: Partial<BudgetAllocation>
): Promise<void> {
  const docRef = doc(db, 'budgetAllocations', allocationId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBudgetAllocation(allocationId: string): Promise<void> {
  await deleteDoc(doc(db, 'budgetAllocations', allocationId));
}

export async function getBudgetAllocations(userId: string): Promise<BudgetAllocation[]> {
  // For now, only get the user's own budget allocations
  // TODO: Add back connected users functionality once rules are fixed
  const snap = await getDocs(
    query(
      collection(db, 'budgetAllocations'),
      where('userId', '==', userId)
    )
  );

  return snap.docs.map(d => convertFirestoreDoc<BudgetAllocation>(d));
}
