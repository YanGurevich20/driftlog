import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const db = getFirestore(admin.app());

// Input validation utilities
function validateUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length >= 1 && userId.length <= 128;
}

function validateInvitationId(invitationId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(invitationId) && invitationId.length >= 1 && invitationId.length <= 128;
}

// Connections: accept invitation
export const acceptConnectionInvitation = onCall<{ invitationId: string; userId: string }>({
  region: "asia-southeast1",
  minInstances: 0,
  timeoutSeconds: 60,
  enforceAppCheck: true,
}, async (request): Promise<{ ok: boolean }> => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  
  const authUserId = request.auth.uid;
  const { invitationId, userId } = request.data;
  
  // Input validation
  if (!invitationId || !userId) {
    throw new HttpsError("invalid-argument", "invitationId and userId are required");
  }
  
  if (!validateInvitationId(invitationId)) {
    throw new HttpsError("invalid-argument", "Invalid invitation ID format");
  }
  
  if (!validateUserId(userId)) {
    throw new HttpsError("invalid-argument", "Invalid user ID format");
  }
  
  // Ensure user can only accept for themselves
  if (userId !== authUserId) {
    throw new HttpsError("permission-denied", "Can only accept invitations for yourself");
  }

  const invitationRef = db.doc(`connectionInvitations/${invitationId}`);
  const recipientRef = db.doc(`users/${userId}`);

  const result = await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invitationRef);
    if (!invSnap.exists) throw new HttpsError("not-found", "Invitation not found");
    const invitation = invSnap.data() as { invitedEmail: string; invitedBy: string; inviterName: string; expiresAt: Timestamp | Date };

    // Validate recipient matches invitation
    const authEmail = request.auth?.token.email;
    if (!authEmail || authEmail.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new HttpsError("permission-denied", "Invitation not addressed to this user");
    }

    // Validate expiry
    const expMs = invitation.expiresAt instanceof Timestamp
      ? invitation.expiresAt.toMillis()
      : new Date(invitation.expiresAt).getTime();
    if (expMs < Date.now()) {
      throw new HttpsError("failed-precondition", "Invitation expired");
    }

    // Load inviter and recipient - do all reads first
    const inviterRef = db.doc(`users/${invitation.invitedBy}`);
    const inviterSnap = await tx.get(inviterRef);
    const recipientSnap = await tx.get(recipientRef);
    
    const inviterData = inviterSnap.exists ? inviterSnap.data() as { connectedUserIds?: string[] } : { connectedUserIds: [] };
    const recipientData = recipientSnap.exists ? recipientSnap.data() as { connectedUserIds?: string[] } : { connectedUserIds: [] };
    const clique = Array.from(new Set([invitation.invitedBy, ...(inviterData.connectedUserIds || [])]));

    // Read all member documents that we'll need to update
    const memberSnapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    memberSnapshots.set(invitation.invitedBy, inviterSnap);
    
    for (const memberId of clique) {
      if (memberId !== invitation.invitedBy) {
        const memberRef = db.doc(`users/${memberId}`);
        const memberSnap = await tx.get(memberRef);
        memberSnapshots.set(memberId, memberSnap);
      }
    }

    // Now do all writes
    // Ensure inviter exists
    if (!inviterSnap.exists) {
      tx.set(inviterRef, { connectedUserIds: [] }, { merge: true });
    }
    // Ensure recipient exists
    if (!recipientSnap.exists) {
      tx.set(recipientRef, { connectedUserIds: [] }, { merge: true });
    }

    // Update mutual connections
    for (const memberId of clique) {
      const memberRef = db.doc(`users/${memberId}`);
      const memberSnap = memberSnapshots.get(memberId)!;
      const member = (memberSnap.data() || {}) as { connectedUserIds?: string[] };
      const memberSet = new Set(member.connectedUserIds || []);
      memberSet.add(userId);
      tx.set(memberRef, { connectedUserIds: Array.from(memberSet) }, { merge: true });
    }

    // Recipient gets all members mutually
    const recipientSet = new Set(recipientData.connectedUserIds || []);
    for (const memberId of clique) {
      recipientSet.add(memberId);
    }
    tx.set(recipientRef, { connectedUserIds: Array.from(recipientSet) }, { merge: true });

    // Delete invitation
    tx.delete(invitationRef);
    return { ok: true };
  });
  return result;
});