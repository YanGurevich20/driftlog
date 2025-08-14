import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Space, SpaceInvitation } from '@/types';

export type { Space, SpaceInvitation } from '@/types';

export class SpacesService {
  static async createSpace(userId: string, userName: string, name: string, baseCurrency: string = 'USD'): Promise<string> {
    const spaceData = {
      name,
      baseCurrency,
      ownerId: userId,
      memberIds: [userId],
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'spaces'), spaceData);
    return docRef.id;
  }

  static async getUserSpaces(userId: string): Promise<Space[]> {
    const q = query(
      collection(db, 'spaces'),
      where('memberIds', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = convertFirestoreDoc<Omit<Space, 'id'>>(doc.data());
      return {
        id: doc.id,
        ...data
      };
    });
  }

  static async inviteToSpace(
    spaceId: string,
    spaceName: string,
    inviterUserId: string,
    inviterName: string,
    invitedEmail: string
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData = {
      spaceId,
      spaceName,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy: inviterUserId,
      inviterName,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const docRef = await addDoc(collection(db, 'spaceInvitations'), invitationData);
    return docRef.id;
  }

  static async getUserInvitations(userEmail: string): Promise<SpaceInvitation[]> {
    const q = query(
      collection(db, 'spaceInvitations'),
      where('invitedEmail', '==', userEmail.toLowerCase()),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    const now = Timestamp.now();
    
    return snapshot.docs
      .map(doc => {
        const data = convertFirestoreDoc<Omit<SpaceInvitation, 'id'>>(doc.data());
        return {
          id: doc.id,
          ...data
        };
      })
      .filter(inv => {
        return inv.expiresAt.getTime() > now.toMillis();
      });
  }

  static async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    const invitationRef = doc(db, 'spaceInvitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = convertFirestoreDoc<SpaceInvitation>(invitationDoc.data()!);
    
    if (invitation.status !== 'pending') {
      throw new Error('Invitation already processed');
    }
    
    const now = Timestamp.now();
    if (invitation.expiresAt.getTime() < now.toMillis()) {
      throw new Error('Invitation expired');
    }

    await updateDoc(invitationRef, {
      status: 'accepted'
    });

    const spaceRef = doc(db, 'spaces', invitation.spaceId);
    await updateDoc(spaceRef, {
      memberIds: arrayUnion(userId)
    });
  }

  static async rejectInvitation(invitationId: string): Promise<void> {
    const invitationRef = doc(db, 'spaceInvitations', invitationId);
    await updateDoc(invitationRef, {
      status: 'rejected'
    });
  }

  static async switchUserDefaultSpace(userId: string, spaceId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      defaultSpaceId: spaceId
    });
  }
}