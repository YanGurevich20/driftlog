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

  private static async validateInvitation(
    groupId: string,
    inviterUserId: string,
    invitedEmail: string
  ): Promise<{ valid: boolean; error?: string }> {
    const normalizedEmail = invitedEmail.toLowerCase();
    
    // Check 1: Self-invitation
    const inviterDoc = await getDoc(doc(db, 'users', inviterUserId));
    if (inviterDoc.exists()) {
      const inviterData = inviterDoc.data();
      if (inviterData.email?.toLowerCase() === normalizedEmail) {
        return { valid: false, error: 'You cannot invite yourself' };
      }
    }
    
    // Check 2: Active invitation exists
    const existingInvitations = await getDocs(
      query(
        collection(db, 'groupInvitations'),
        where('groupId', '==', groupId),
        where('invitedEmail', '==', normalizedEmail)
      )
    );
    
    if (!existingInvitations.empty) {
      return { valid: false, error: 'An invitation has already been sent to this user' };
    }
    
    return { valid: true };
  }

  static async inviteToGroup(
    groupId: string,
    inviterUserId: string,
    inviterName: string,
    invitedEmail: string
  ): Promise<string> {
    
    // Validate invitation
    const validation = await this.validateInvitation(groupId, inviterUserId, invitedEmail);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData = {
      groupId,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy: inviterUserId,
      inviterName,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const docRef = await addDoc(collection(db, 'groupInvitations'), invitationData);
    return docRef.id;
  }

  static async getUserInvitations(userEmail: string): Promise<GroupInvitation[]> {
    const q = query(
      collection(db, 'groupInvitations'),
      where('invitedEmail', '==', userEmail.toLowerCase())
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
    
    // Check expiry
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
      // Delete the invitation
      deleteDoc(invitationRef),
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
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) return;
    
    const group = convertFirestoreDoc<UserGroup>(groupDoc);
    const updatedMembers = group.memberIds.filter((id: string) => id !== userId);
    
    // First update the group to remove the member
    await updateDoc(groupRef, {
      memberIds: updatedMembers
    });
    
    // Then delete if empty
    if (updatedMembers.length === 0) {
      await deleteDoc(groupRef);
    }
  }

  static async rejectInvitation(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'groupInvitations', invitationId));
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