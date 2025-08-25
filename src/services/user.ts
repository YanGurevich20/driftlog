import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CategoryName } from '@/types/categories';

/**
 * Updates the user's custom category lists in Firestore.
 * @param userId The ID of the user to update.
 * @param newCategories An object containing the new expense and income category arrays.
 */
export const updateUserCategories = async (
  userId: string,
  newCategories: { expense: CategoryName[]; income: CategoryName[] }
) => {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, {
    categories: newCategories,
  });
};
