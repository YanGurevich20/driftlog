import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Entry } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useEntriesCache } from '@/lib/entries-cache';

interface UseEntriesOptions {
  userId?: string;
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useEntries(options: UseEntriesOptions = {}) {
  const { userId, groupId, startDate, endDate, limit } = options;
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const startTime = startDate?.getTime();
  const endTime = endDate?.getTime();

  // Use cache if available (returns null if no provider)
  const cache = useEntriesCache();

  // Fetch member IDs
  useEffect(() => {
    const fetchMemberIds = async () => {
      try {
        let ids: string[] = [];
        
        if (groupId) {
          const groupDoc = await getDoc(doc(db, 'userGroups', groupId));
          if (groupDoc.exists()) {
            ids = groupDoc.data().memberIds || [];
          }
        } else if (userId) {
          ids = [userId];
        } else if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const userGroupId = userDoc.data().groupId;
            
            if (userGroupId) {
              const groupDoc = await getDoc(doc(db, 'userGroups', userGroupId));
              if (groupDoc.exists()) {
                ids = groupDoc.data().memberIds || [];
              }
            }
          }
        }
        
        setMemberIds(ids);
      } catch (err) {
        console.error('Error fetching member IDs:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    if (user || userId || groupId) {
      fetchMemberIds();
    } else {
      setLoading(false);
    }
  }, [userId, groupId, user?.id, user]);

  // Subscribe to entries using cache if available
  useEffect(() => {
    if (memberIds.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!cache) {
      // Cache provider not available, use direct queries
      console.warn('EntriesCache provider not found, using direct Firestore queries');
      // For now, return early - in production you'd implement fallback
      return;
    }

    const unsubscribe = cache.subscribe(
      {
        memberIds,
        startTime,
        endTime,
        limit,
      },
      (newEntries, isLoading, err) => {
        setEntries(newEntries);
        setLoading(isLoading);
        setError(err);
      }
    );

    return unsubscribe;
  }, [cache, memberIds, startTime, endTime, limit]);

  return { entries, loading, error };
}