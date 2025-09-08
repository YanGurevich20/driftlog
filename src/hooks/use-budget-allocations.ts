import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import { createBudgetAllocation, updateBudgetAllocation, deleteBudgetAllocation } from '@/services/budget';
import { useAuth } from '@/lib/auth-context';
import type { BudgetAllocation } from '@/types';

export function useBudgetAllocations() {
  const { user, loading: authLoading } = useAuth();
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id || authLoading) {
      setAllocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: () => void;

    // First get the user's connections (from auth context, no extra read)
    const fetchUserConnections = async () => {
      try {
        const connectedUserIds = (user.connectedUserIds || []) as string[];
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
  }, [user?.id, user?.connectedUserIds, authLoading]);

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
