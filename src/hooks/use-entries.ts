import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Entry } from '@/types';

interface UseEntriesOptions {
  spaceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useEntries(options: UseEntriesOptions = {}) {
  const { spaceId, startDate, endDate, limit } = options;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [
      where('spaceId', '==', spaceId),
    ];

    if (startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
    }
    
    if (endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
    }

    constraints.push(orderBy('date', 'desc'));

    if (limit) {
      constraints.push(firestoreLimit(limit));
    }

    const q = query(collection(db, 'entries'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newEntries: Entry[] = [];
        snapshot.forEach((doc) => {
          const data = convertFirestoreDoc<Entry>({
            id: doc.id,
            ...doc.data(),
          });
          newEntries.push(data);
        });
        setEntries(newEntries);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching entries:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [spaceId, startDate?.getTime(), endDate?.getTime(), limit]);

  return { entries, loading, error };
}