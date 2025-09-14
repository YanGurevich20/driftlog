import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

export class ConnectionsService {
  static async invite(invitedBy: string, inviterName: string, invitedEmail: string): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData = {
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy,
      inviterName,
      createdAt: serverTimestamp(),
      expiresAt,
    };

    const ref = await addDoc(collection(db, 'connectionInvitations'), invitationData);
    return ref.id;
  }

  static async accept(invitationId: string, userId: string): Promise<void> {
    const callable = httpsCallable<{ invitationId: string; userId: string }, { ok: boolean }>(functions, 'acceptConnectionInvitation');
    await callable({ invitationId, userId });
  }

  static async reject(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'connectionInvitations', invitationId));
  }

  static async cancel(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, 'connectionInvitations', invitationId));
  }

  static async leave(userId: string): Promise<void> {
    const callable = httpsCallable<{ userId: string }, { ok: boolean }>(functions, 'leaveConnections');
    await callable({ userId });
  }
}


