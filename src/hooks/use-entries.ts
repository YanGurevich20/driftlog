import { useState, useEffect, useMemo } from 'react';
import type { Entry } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useEntriesCache } from '@/lib/entries-cache';

interface UseEntriesOptions {
  startDate: Date;
  endDate: Date;
}

export function useEntries(options: UseEntriesOptions) {
  const { startDate, endDate } = options;
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const memberIds = useMemo(() => {
    if (!user) return [];
    const connectedIds = (user.connectedUserIds || []) as string[];
    return [user.id, ...connectedIds];
  }, [user]);

  const startTime = startDate?.getTime();
  const endTime = endDate?.getTime();

  // Use cache if available (returns null if no provider)
  const cache = useEntriesCache();

  // Gate by auth loading and user presence
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEntries([]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }, [authLoading, user]);

  // Subscribe to entries using cache if available
  useEffect(() => {
    if (authLoading) return;
    if (memberIds.length === 0) {
      return; // handled by the gate above
    }

    if (!cache) {
      console.warn('EntriesCache provider not found, using direct Firestore queries');
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
  }, [authLoading, cache, memberIds, startTime, endTime]);

  return { entries, loading, error };
}