import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useConnectedUsers() {
  const { user, userReady } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !user.groupId || !userReady) {
      setConnectedUsers([]);
      setLoading(false);
      return;
    }

    // Single listener on the group document
    const unsubscribe = onSnapshot(
      doc(db, 'userGroups', user.groupId),
      async (groupSnapshot) => {
        try {
          if (!groupSnapshot.exists()) {
            setConnectedUsers([]);
            setLoading(false);
            return;
          }

          const groupData = groupSnapshot.data();
          const memberIds = groupData.memberIds || [];
          
          // Filter out current user
          const otherMemberIds = memberIds.filter((id: string) => id !== user.id);
          
          if (otherMemberIds.length === 0) {
            setConnectedUsers([]);
            setLoading(false);
            return;
          }

          // Fetch all member documents
          const memberPromises = otherMemberIds.map((memberId: string) => 
            getDoc(doc(db, 'users', memberId))
          );
          
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
  }, [user?.id, user?.groupId, userReady, user]);

  return { connectedUsers, loading, error };
}