import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(admin.app());

// Input validation utilities
function validateUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length >= 1 && userId.length <= 128;
}

// Connections: leave all connections
export const leaveConnections = onCall<{ userId: string }>({
  region: "asia-southeast1",
  minInstances: 0,
  timeoutSeconds: 60,
  enforceAppCheck: true,
}, async (request): Promise<{ ok: boolean }> => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  
  const authUserId = request.auth.uid;
  const { userId } = request.data;
  
  // Input validation
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required");
  }
  
  if (!validateUserId(userId)) {
    throw new HttpsError("invalid-argument", "Invalid user ID format");
  }
  
  if (userId !== authUserId) {
    throw new HttpsError("permission-denied", "Only self can leave");
  }

  const userRef = db.doc(`users/${userId}`);
  const result = await db.runTransaction(async (tx) => {
    // Read all documents first
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
    const userData = userSnap.data() as { connectedUserIds?: string[] };
    const peers = Array.from(new Set(userData.connectedUserIds || []));

    // Read all peer documents
    const peerSnapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const peerId of peers) {
      const peerRef = db.doc(`users/${peerId}`);
      const peerSnap = await tx.get(peerRef);
      peerSnapshots.set(peerId, peerSnap);
    }

    // Now do all writes
    for (const peerId of peers) {
      const peerRef = db.doc(`users/${peerId}`);
      const peerSnap = peerSnapshots.get(peerId)!;
      if (peerSnap.exists) {
        const peerData = peerSnap.data() as { connectedUserIds?: string[] };
        const next = (peerData.connectedUserIds || []).filter((id) => id !== userId);
        tx.update(peerRef, { connectedUserIds: next });
      }
    }

    tx.update(userRef, { connectedUserIds: [] });
    return { ok: true };
  });
  return result;
});