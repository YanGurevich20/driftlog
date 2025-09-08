import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { GroupInvitation } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useSentInvitations() {
  const { user } = useAuth();
  const [sentInvitations, setSentInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSentInvitations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'connectionInvitations'),
      where('invitedBy', '==', user.id),
      where('expiresAt', '>', new Date())
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invitations: GroupInvitation[] = [];
        snapshot.forEach((doc) => {
          const invitation = convertFirestoreDoc<GroupInvitation>(doc);
          invitations.push(invitation);
        });
        setSentInvitations(invitations);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching sent invitations:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id, user]);

  return { sentInvitations, loading, error };
}