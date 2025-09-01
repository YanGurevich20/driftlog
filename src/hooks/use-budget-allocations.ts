import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import { createBudgetAllocation, updateBudgetAllocation, deleteBudgetAllocation } from '@/services/budget';
import { useAuth } from '@/lib/auth-context';
import type { BudgetAllocation } from '@/types';

export function useBudgetAllocations() {
  const { user, userReady } = useAuth();
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id || !userReady) {
      setAllocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: () => void;

    // First get the user's connections
    const fetchUserConnections = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        const userData = userDoc.data();
        const connectedUserIds = userData?.connectedUserIds || [];
        
        // Include the current user and all connected users
        const allUserIds = [user.id, ...connectedUserIds];
        
        // Query budget allocations for all these users
        const q = query(
          collection(db, 'budgetAllocations'),
          where('userId', 'in', allUserIds)
        );

        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const data = snapshot.docs.map(doc => convertFirestoreDoc<BudgetAllocation>(doc));
            setAllocations(data);
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err as Error);
            setLoading(false);
          }
        );
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchUserConnections();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id, userReady]);

  const createAllocation = async (allocation: Omit<BudgetAllocation, 'id' | 'createdAt'>) => {
    return await createBudgetAllocation(allocation);
  };

  const updateAllocation = async (allocationId: string, updates: Partial<BudgetAllocation>) => {
    await updateBudgetAllocation(allocationId, updates);
  };

  const deleteAllocation = async (allocationId: string) => {
    await deleteBudgetAllocation(allocationId);
  };

  return {
    allocations,
    loading,
    error,
    createAllocation,
    updateAllocation,
    deleteAllocation,
  };
}
