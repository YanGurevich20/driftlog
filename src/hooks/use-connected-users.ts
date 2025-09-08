import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useConnectedUsers() {
  const { user, loading: authLoading } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || authLoading) {
      setConnectedUsers([]);
      setLoading(false);
      return;
    }

    // Listen to own user document; derive connected users from connectedUserIds
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.id),
      async (userSnapshot) => {
        try {
          if (!userSnapshot.exists()) {
            setConnectedUsers([]);
            setLoading(false);
            return;
          }

          const userData = userSnapshot.data() as User;
          const otherMemberIds = (userData.connectedUserIds || []).filter((id: string) => id !== user.id);
          
          if (otherMemberIds.length === 0) {
            setConnectedUsers([]);
            setLoading(false);
            return;
          }

          // Fetch all member documents
          const memberPromises = otherMemberIds.map((memberId: string) => getDoc(doc(db, 'users', memberId)));
          
          const memberDocs = await Promise.all(memberPromises);
          const members = memberDocs
            .filter(doc => doc.exists())
            .map(doc => convertFirestoreDoc<User>(doc));
          
          setConnectedUsers(members);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching connected users:', err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to group:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id, authLoading, user]);

  return { connectedUsers, loading, error };
}