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
    const invitationRef = doc(db, 'groupInvitations', invitationId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (tx) => {
      const invitationSnap = await tx.get(invitationRef);
      if (!invitationSnap.exists()) {
        throw new Error('Invitation not found');
      }
      const invitation = convertFirestoreDoc<GroupInvitation>(invitationSnap);

      // Check expiry inside the transaction
      const now = Timestamp.now();
      if (invitation.expiresAt.getTime() < now.toMillis()) {
        throw new Error('Invitation expired');
      }

      // Load user
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }
      const userData = userSnap.data() as { groupId?: string };

      // Read any potentially involved groups BEFORE any writes
      const currentGroupId: string | undefined = userData.groupId;
      const currentGroupRef = currentGroupId ? doc(db, 'userGroups', currentGroupId) : null;
      const currentGroupSnap = currentGroupRef ? await tx.get(currentGroupRef) : null;

      const newGroupRef = doc(db, 'userGroups', invitation.groupId);

      // All reads are complete above. Perform writes below.

      // Remove from current group if applicable
      if (currentGroupRef && currentGroupSnap && currentGroupSnap.exists()) {
        const currentGroup = currentGroupSnap.data() as UserGroup;
        if (currentGroup.memberIds.includes(userId)) {
          const nextMembers = currentGroup.memberIds.filter((id: string) => id !== userId);
          if (nextMembers.length === 0) {
            tx.delete(currentGroupRef);
          } else {
            tx.update(currentGroupRef, { memberIds: nextMembers });
          }
        }
      }

      // Add to new group (no read needed)
      tx.update(newGroupRef, { memberIds: arrayUnion(userId) });

      // Update user groupId
      tx.update(userRef, { groupId: invitation.groupId });

      // Delete invitation
      tx.delete(invitationRef);
    });
  }

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

  static async rejectInvitation(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'groupInvitations', invitationId));
  }

  static async cancelInvitation(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'groupInvitations', invitationId));
  }

  static async leaveGroup(userId: string): Promise<string> {
    const userRef = doc(db, 'users', userId);
    const newGroupId = await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }
      const userData = userSnap.data() as { groupId?: string };

      // Create new solo group id and doc
      const newGroupRef = doc(collection(db, 'userGroups'));
      tx.set(newGroupRef, {
        memberIds: [userId],
        createdAt: serverTimestamp(),
        createdBy: userId,
      });

      // Update user to point to new group FIRST so UI can switch listeners immediately
      tx.update(userRef, { groupId: newGroupRef.id });

      // Now remove from current group if applicable
      const currentGroupId: string | undefined = userData.groupId;
      if (currentGroupId) {
        const currentGroupRef = doc(db, 'userGroups', currentGroupId);
        const currentGroupSnap = await tx.get(currentGroupRef);
        if (currentGroupSnap.exists()) {
          const currentGroup = currentGroupSnap.data() as UserGroup;
          if (currentGroup.memberIds.includes(userId)) {
            const nextMembers = currentGroup.memberIds.filter((id: string) => id !== userId);
            if (nextMembers.length === 0) {
              tx.delete(currentGroupRef);
            } else {
              tx.update(currentGroupRef, { memberIds: nextMembers });
            }
          }
        }
      }

      return newGroupRef.id;
    });

    return newGroupId;
  }
}