import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { RecurringTemplate } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useRecurringTemplates() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  // Fetch member IDs (user + connected users)
  useEffect(() => {
    const fetchMemberIds = async () => {
      try {
        let ids: string[] = [];
        
        if (user) {
          const connectedIds = (user.connectedUserIds || []) as string[];
          ids = [user.id, ...connectedIds];
        }
        
        setMemberIds(ids);
      } catch (err) {
        console.error('Error fetching member IDs:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    if (authLoading) {
      return;
    }
    if (user) {
      fetchMemberIds();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.connectedUserIds, authLoading, user]);

  // Subscribe to recurring templates
  useEffect(() => {
    if (memberIds.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'recurringTemplates'),
      where('userId', 'in', memberIds),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newTemplates: RecurringTemplate[] = [];
        snapshot.forEach((doc) => {
          newTemplates.push(convertFirestoreDoc<RecurringTemplate>(doc));
        });
        
        setTemplates(newTemplates);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching recurring templates:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [memberIds]);

  return { templates, loading, error };
}