import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { GroupInvitation } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'groupInvitations'),
      where('invitedEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newInvitations: GroupInvitation[] = [];
        const now = new Date();
        
        snapshot.forEach((doc) => {
          const invitation = convertFirestoreDoc<GroupInvitation>(doc);
          
          // Only include non-expired invitations
          if (invitation.expiresAt.getTime() > now.getTime()) {
            newInvitations.push(invitation);
          }
        });
        
        setInvitations(newInvitations);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching invitations:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  return { invitations, loading, error };
}