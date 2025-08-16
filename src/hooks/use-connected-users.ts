import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

export function useConnectedUsers() {
  const { user } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setConnectedUsers([]);
      setLoading(false);
      return;
    }

    let unsubscribeGroup: (() => void) | null = null;
    let memberListeners: (() => void)[] = [];

    // Set up listener for user's document to track groupId changes
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.id),
      async (userSnapshot) => {
        // Clean up previous listeners
        if (unsubscribeGroup) {
          unsubscribeGroup();
          unsubscribeGroup = null;
        }
        memberListeners.forEach(unsub => unsub());
        memberListeners = [];

        if (!userSnapshot.exists()) {
          setConnectedUsers([]);
          setLoading(false);
          return;
        }

        const userData = userSnapshot.data();
        const groupId = userData.groupId;

        if (!groupId) {
          setConnectedUsers([]);
          setLoading(false);
          return;
        }

        // Set up real-time listener for the group
        unsubscribeGroup = onSnapshot(
          doc(db, 'userGroups', groupId),
          async (groupSnapshot) => {
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

            // Set up listeners for each member
            const members: User[] = [];

            for (const memberId of otherMemberIds) {
              const unsubscribeMember = onSnapshot(
                doc(db, 'users', memberId),
                (memberDoc) => {
                  if (memberDoc.exists()) {
                    const updatedMember = convertFirestoreDoc<User>(memberDoc);
                    
                    // Update the members array
                    const existingIndex = members.findIndex(m => m.id === memberId);
                    if (existingIndex >= 0) {
                      members[existingIndex] = updatedMember;
                    } else {
                      members.push(updatedMember);
                    }
                    
                    // Update state with new array
                    setConnectedUsers([...members]);
                    setLoading(false);
                  }
                },
                (err) => {
                  console.error(`Error listening to user ${memberId}:`, err);
                }
              );
              memberListeners.push(unsubscribeMember);
            }
          },
          (err) => {
            console.error('Error listening to group:', err);
            setError(err as Error);
            setLoading(false);
          }
        );
      },
      (err) => {
        console.error('Error listening to user document:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      unsubscribeUser();
      if (unsubscribeGroup) {
        unsubscribeGroup();
      }
      memberListeners.forEach(unsub => unsub());
    };
  }, [user?.id]);

  return { connectedUsers, loading, error };
}