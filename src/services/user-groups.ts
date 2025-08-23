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
  Timestamp,
  runTransaction,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { UserGroup, GroupInvitation, User } from '@/types';

export type { UserGroup, GroupInvitation } from '@/types';

export class UserGroupsService {
  // Deprecated
  static async createGroup(userId: string): Promise<string> { throw new Error('Deprecated'); }

  static async getGroup(groupId: string): Promise<UserGroup | null> { return null; }

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

  static async getConnectedUsers(userId: string): Promise<User[]> { return []; }

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

  static async inviteToGroup(): Promise<string> { throw new Error('Deprecated'); }

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

  static async acceptInvitation(): Promise<void> { throw new Error('Deprecated'); }

  private static async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const groupRef = doc(db, 'userGroups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) return;
    
    const group = convertFirestoreDoc<UserGroup>(groupDoc);
    if (!group.memberIds.includes(userId)) {
      return;
    }
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

  static async rejectInvitation(): Promise<void> { throw new Error('Deprecated'); }

  static async cancelInvitation(): Promise<void> { throw new Error('Deprecated'); }

  static async leaveGroup(): Promise<string> { throw new Error('Deprecated'); }
}