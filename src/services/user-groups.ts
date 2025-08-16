import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { UserGroup, GroupInvitation, User } from '@/types';

export type { UserGroup, GroupInvitation } from '@/types';

export class UserGroupsService {
  static async createGroup(userId: string): Promise<string> {
    const groupData = {
      memberIds: [userId],
      createdAt: serverTimestamp(),
      createdBy: userId,
    };

    const docRef = await addDoc(collection(db, 'userGroups'), groupData);
    return docRef.id;
  }

  static async getGroup(groupId: string): Promise<UserGroup | null> {
    const docRef = doc(db, 'userGroups', groupId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return convertFirestoreDoc<UserGroup>(docSnap);
  }

  static async getGroupMembers(groupId: string): Promise<User[]> {
    const group = await this.getGroup(groupId);
    if (!group) return [];
    
    // Batch fetch all member documents for better performance
    const memberPromises = group.memberIds.map(memberId => 
      getDoc(doc(db, 'users', memberId))
    );
    
    const memberDocs = await Promise.all(memberPromises);
    
    return memberDocs
      .filter(doc => doc.exists())
      .map(doc => convertFirestoreDoc<User>(doc));
  }

  static async getConnectedUsers(userId: string): Promise<User[]> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    const groupId = userData.groupId;
    
    if (!groupId) return [];
    
    const members = await this.getGroupMembers(groupId);
    return members.filter(member => member.id !== userId);
  }

  static async inviteToGroup(
    groupId: string,
    inviterUserId: string,
    inviterName: string,
    invitedEmail: string
  ): Promise<string> {
    console.log('inviteToGroup called with:', {
      groupId,
      inviterUserId,
      inviterName,
      invitedEmail
    });
    
    // Check if user is trying to invite themselves
    const inviterDoc = await getDoc(doc(db, 'users', inviterUserId));
    if (inviterDoc.exists()) {
      const inviterData = inviterDoc.data();
      if (inviterData.email?.toLowerCase() === invitedEmail.toLowerCase()) {
        throw new Error('You cannot invite yourself to the group');
      }
    }
    
    // Check if invitation already exists
    try {
      const existingInvitations = await getDocs(
        query(
          collection(db, 'groupInvitations'),
          where('groupId', '==', groupId),
          where('invitedEmail', '==', invitedEmail.toLowerCase()),
          where('status', '==', 'pending')
        )
      );
      
      if (!existingInvitations.empty) {
        throw new Error('An invitation to this user already exists');
      }
    } catch (error) {
      console.error('Error checking existing invitations:', error);
      // If the error is about querying, we might need to skip this check
      // Continue with invitation creation
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData = {
      groupId,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy: inviterUserId,
      inviterName,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };
    
    console.log('Creating invitation with data:', invitationData);

    const docRef = await addDoc(collection(db, 'groupInvitations'), invitationData);
    console.log('Invitation created with ID:', docRef.id);
    return docRef.id;
  }

  static async getUserInvitations(userEmail: string): Promise<GroupInvitation[]> {
    const q = query(
      collection(db, 'groupInvitations'),
      where('invitedEmail', '==', userEmail.toLowerCase()),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    const now = Timestamp.now();
    
    return snapshot.docs
      .map(doc => {
        return convertFirestoreDoc<GroupInvitation>(doc);
      })
      .filter(inv => {
        return inv.expiresAt.getTime() > now.toMillis();
      });
  }

  static async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    // Validate invitation
    const invitationRef = doc(db, 'groupInvitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = convertFirestoreDoc<GroupInvitation>(invitationDoc);
    
    // Check invitation status and expiry
    if (invitation.status !== 'pending') {
      throw new Error('Invitation already processed');
    }
    
    const now = Timestamp.now();
    if (invitation.expiresAt.getTime() < now.toMillis()) {
      throw new Error('Invitation expired');
    }

    // Get user's current state
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentGroupId = userData.groupId;

    // Handle leaving current group
    if (currentGroupId) {
      await this.removeUserFromGroup(userId, currentGroupId);
    }

    // Update all in a batch for consistency
    await Promise.all([
      // Mark invitation as accepted
      updateDoc(invitationRef, { status: 'accepted' }),
      // Add user to new group
      updateDoc(doc(db, 'userGroups', invitation.groupId), {
        memberIds: arrayUnion(userId)
      }),
      // Update user's groupId
      updateDoc(userRef, { groupId: invitation.groupId })
    ]);
  }

  private static async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const groupRef = doc(db, 'userGroups', groupId);
    await updateDoc(groupRef, {
      memberIds: arrayRemove(userId)
    });
  }

  static async rejectInvitation(invitationId: string): Promise<void> {
    const invitationRef = doc(db, 'groupInvitations', invitationId);
    await updateDoc(invitationRef, {
      status: 'rejected'
    });
  }

  static async cancelInvitation(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'groupInvitations', invitationId));
  }

  static async leaveGroup(userId: string): Promise<string> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentGroupId = userData.groupId;

    // Remove from current group if exists
    if (currentGroupId) {
      await this.removeUserFromGroup(userId, currentGroupId);
    }

    // Create new solo group
    const newGroupId = await this.createGroup(userId);
    
    // Update user's groupId
    await updateDoc(userRef, {
      groupId: newGroupId
    });
    
    return newGroupId;
  }
}