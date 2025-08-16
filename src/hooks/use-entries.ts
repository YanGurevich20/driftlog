import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint, limit as firestoreLimit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Entry } from '@/types';
import { useAuth } from '@/lib/auth-context';

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

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        let memberIds: string[] = [];
        
        if (groupId) {
          // Fetch group members directly by document ID
          const groupDoc = await getDoc(doc(db, 'userGroups', groupId));
          if (groupDoc.exists()) {
            memberIds = groupDoc.data().memberIds || [];
          }
        } else if (userId) {
          // Single user mode
          memberIds = [userId];
        } else if (user) {
          // Default: get current user's group
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const userGroupId = userDoc.data().groupId;
            
            if (userGroupId) {
              const groupDoc = await getDoc(doc(db, 'userGroups', userGroupId));
              if (groupDoc.exists()) {
                memberIds = groupDoc.data().memberIds || [];
              }
            }
          }
        }
        
        if (memberIds.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        const constraints: QueryConstraint[] = [
          where('userId', 'in', memberIds),
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
          newEntries.push(convertFirestoreDoc<Entry>(doc));
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
      } catch (err) {
        console.error('Error setting up entries listener:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    if (user || userId || groupId) {
      fetchEntries();
    } else {
      setLoading(false);
    }
  }, [userId, groupId, user?.id, startDate?.getTime(), endDate?.getTime(), limit]);

  return { entries, loading, error };
}