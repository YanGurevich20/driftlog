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

interface EditFormLike {
  categories: string[];
}

interface ComputeUsedCategoriesOptions {
  allocations: BudgetAllocation[];
  stagedDeleteIds?: Set<string>;
  editForms?: Record<string, EditFormLike>;
  excludeAllocationIds?: Set<string>;
}

// Computes the set of categories already used by budget allocations, with support
// for excluding allocations (e.g., the one currently being edited), factoring in
// staged deletions, and in-progress edit form values.
export function computeUsedBudgetCategories(options: ComputeUsedCategoriesOptions): Set<string> {
  const { allocations, stagedDeleteIds, editForms, excludeAllocationIds } = options;

  const used = new Set<string>();

  allocations.forEach((allocation) => {
    if (stagedDeleteIds && stagedDeleteIds.has(allocation.id)) return;
    if (excludeAllocationIds && excludeAllocationIds.has(allocation.id)) return;

    const categories = editForms && editForms[allocation.id]
      ? editForms[allocation.id].categories
      : allocation.categories;

    categories.forEach((c) => used.add(c));
  });

  return used;
}
