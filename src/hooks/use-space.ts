import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Space } from '@/types';

export function useSpace(spaceId?: string) {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setSpace(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'spaces', spaceId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = convertFirestoreDoc<Space>({
            id: snapshot.id,
            ...snapshot.data(),
          });
          setSpace(data);
        } else {
          setSpace(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching space:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [spaceId]);

  return { space, loading, error };
}