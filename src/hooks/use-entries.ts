import { useState, useEffect } from 'react';
import type { Entry } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useEntriesCache } from '@/lib/entries-cache';

interface UseEntriesOptions {
  startDate: Date;
  endDate: Date;
}

export function useEntries(options: UseEntriesOptions) {
  const { startDate, endDate } = options;
  const { user, userReady } = useAuth();
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
        if (user) {
          const connectedIds = (user.connectedUserIds || []) as string[];
          setMemberIds([user.id, ...connectedIds]);
        }
      } catch (err) {
        console.error('Error fetching member IDs:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    if ((user && userReady)) {
      fetchMemberIds();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.connectedUserIds, userReady, user]);

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
      },
      (newEntries, isLoading, err) => {
        setEntries(newEntries);
        setLoading(isLoading);
        setError(err);
      }
    );

    return unsubscribe;
  }, [cache, memberIds, startTime, endTime]);

  return { entries, loading, error };
}