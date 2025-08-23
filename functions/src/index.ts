import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

const exchangeRateApiKey = defineSecret("EXCHANGE_RATE_API_KEY");

const EXCHANGE_API_URL = "https://v6.exchangerate-api.com/v6";

interface DailyRates {
  [currency: string]: number;
}

interface MonthlyRates {
  [date: string]: DailyRates; // "YYYY-MM-DD" -> rates
}

interface GetMonthlyRatesRequest {
  months: string[]; // ["2024-01", "2024-02"]
}

interface GetMonthlyRatesResponse {
  monthlyRates: {
    [month: string]: MonthlyRates;
  };
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function fetchTodaysRates(apiKey: string): Promise<DailyRates> {
  const response = await fetch(`${EXCHANGE_API_URL}/${apiKey}/latest/USD`);
  
  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.result !== "success") {
    throw new Error(`Exchange rate API failed: ${data["error-type"] || "Unknown error"}`);
  }

  return data.conversion_rates;
}

// Use named Firestore database (asia-db)
const db = getFirestore(admin.app(), "asia-db");

export const getMonthlyRates = onCall<GetMonthlyRatesRequest>({
  region: "asia-southeast1",
  secrets: [exchangeRateApiKey],
}, async (request): Promise<GetMonthlyRatesResponse> => {
  if (!request.auth) {
    // Allow unauthenticated in emulator to simplify local development
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      logger.warn("Allowing unauthenticated getMonthlyRates call in emulator");
    } else {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
  }

  const { months } = request.data;
  if (!months || !Array.isArray(months) || months.length === 0) {
    throw new HttpsError("invalid-argument", "Months array is required");
  }

  try {
    const monthlyRates: { [month: string]: MonthlyRates } = {};
    const today = new Date();
    const currentMonthKey = getMonthKey(today);
    const todayKey = getDateKey(today);

    // Fetch all requested months
    for (const month of months) {
      const monthDoc = await db.doc(`exchangeRates/${month}`).get();
      
      if (monthDoc.exists) {
        const data = monthDoc.data() as MonthlyRates;
        monthlyRates[month] = data;
        
        // If this is the current month and today's rates are missing, fetch them
        if (month === currentMonthKey && !data[todayKey]) {
          try {
            const apiKey = exchangeRateApiKey.value();
            if (!apiKey) {
              logger.warn("Exchange rate API key not configured - skipping today's rates fetch");
            } else {
              logger.info(`Fetching today's rates for ${todayKey}`);
              const todaysRates = await fetchTodaysRates(apiKey);
              
              // Update the month document with today's rates
              data[todayKey] = todaysRates;
              
              await db.doc(`exchangeRates/${month}`).set(data);
              logger.info(`Updated ${month} with today's rates`);
              
              monthlyRates[month] = data;
            }
          } catch (error) {
            logger.error(`Failed to fetch today's rates: ${error}`);
            // Continue with existing data
          }
        }
      } else {
        // Month doesn't exist - if it's current month, try to create it
        if (month === currentMonthKey) {
          try {
            const apiKey = exchangeRateApiKey.value();
            if (!apiKey) {
              logger.warn(`Exchange rate API key not configured - cannot create month ${month}`);
              monthlyRates[month] = {};
            } else {
              logger.info(`Creating new month document for ${month}`);
              const todaysRates = await fetchTodaysRates(apiKey);
              
              const newMonthData: MonthlyRates = {
                [todayKey]: todaysRates,
              };
              
              await db.doc(`exchangeRates/${month}`).set(newMonthData);
              logger.info(`Created ${month} with today's rates`);
              
              monthlyRates[month] = newMonthData;
            }
          } catch (error) {
            logger.error(`Failed to create month ${month}: ${error}`);
            // Return empty month data
            monthlyRates[month] = {};
          }
        } else {
          // Historical or future month without data
          logger.warn(`No data for month ${month}`);
          monthlyRates[month] = {};
        }
      }
    }
    
    return { monthlyRates };
  } catch (error) {
    logger.error("Error fetching monthly rates:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to fetch monthly rates");
  }
});

// Scheduled job to store today's exchange rates under exchangeRates/YYYY-MM[YYYY-MM-DD]
export const scheduledUpdateExchangeRates = onSchedule({
  region: "asia-southeast1",
  schedule: "0 0 * * *", // 00:00 UTC daily
  timeZone: "UTC",
  secrets: [exchangeRateApiKey],
}, async () => {
  const db = admin.firestore();

  try {
    const apiKey = exchangeRateApiKey.value();
    if (!apiKey) {
      logger.warn("Exchange rate API key not configured - skipping scheduled update");
      return;
    }

    const now = new Date();
    const todayKey = getDateKey(now); // UTC date string YYYY-MM-DD
    const monthKey = todayKey.slice(0, 7); // UTC month YYYY-MM

    logger.info(`Scheduled update: fetching rates for ${todayKey}`);
    const todaysRates = await fetchTodaysRates(apiKey);

    const monthRef = db.doc(`exchangeRates/${monthKey}`);
    // Merge in today's rates; avoid adding metadata keys that could confuse clients
    await monthRef.set({ [todayKey]: todaysRates }, { merge: true });
    logger.info(`Stored rates for ${todayKey} under month ${monthKey}`);
  } catch (error) {
    logger.error("Scheduled exchange rate update failed", error);
  }
});

// Connections: accept invitation
export const acceptConnectionInvitation = onCall<{ invitationId: string; userId: string }>({
  region: "asia-southeast1",
}, async (request): Promise<{ ok: boolean }> => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const { invitationId, userId } = request.data;
  if (!invitationId || !userId) throw new HttpsError("invalid-argument", "invitationId and userId are required");

  const invitationRef = db.doc(`connectionInvitations/${invitationId}`);
  const recipientRef = db.doc(`users/${userId}`);

  const result = await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invitationRef);
    if (!invSnap.exists) throw new HttpsError("not-found", "Invitation not found");
    const invitation = invSnap.data() as { invitedEmail: string; invitedBy: string; inviterName: string; expiresAt: admin.firestore.Timestamp | Date };

    // Validate recipient matches invitation
    const authEmail = request.auth?.token.email;
    if (!authEmail || authEmail.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new HttpsError("permission-denied", "Invitation not addressed to this user");
    }

    // Validate expiry
    const expMs = invitation.expiresAt instanceof admin.firestore.Timestamp
      ? invitation.expiresAt.toMillis()
      : new Date(invitation.expiresAt).getTime();
    if (expMs < Date.now()) {
      throw new HttpsError("failed-precondition", "Invitation expired");
    }

    // Load inviter and recipient
    const inviterRef = db.doc(`users/${invitation.invitedBy}`);
    const inviterSnap = await tx.get(inviterRef);
    const recipientSnap = await tx.get(recipientRef);
    if (!inviterSnap.exists) {
      tx.set(inviterRef, { connectedUserIds: [] }, { merge: true });
    }
    if (!recipientSnap.exists) {
      tx.set(recipientRef, { connectedUserIds: [] }, { merge: true });
    }

    const inviterData = inviterSnap.exists ? inviterSnap.data() as { connectedUserIds?: string[] } : { connectedUserIds: [] };
    const recipientData = recipientSnap.exists ? recipientSnap.data() as { connectedUserIds?: string[] } : { connectedUserIds: [] };
    const clique = Array.from(new Set([invitation.invitedBy, ...(inviterData.connectedUserIds || [])]));

    // Update mutual connections
    for (const memberId of clique) {
      const memberRef = db.doc(`users/${memberId}`);
      const memberSnap = memberId === invitation.invitedBy ? inviterSnap : await tx.get(memberRef);
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

// Connections: leave all connections
export const leaveConnections = onCall<{ userId: string }>({
  region: "asia-southeast1",
}, async (request): Promise<{ ok: boolean }> => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const { userId } = request.data;
  if (!userId || userId !== request.auth.uid) throw new HttpsError("permission-denied", "Only self can leave");

  const userRef = db.doc(`users/${userId}`);
  const result = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
    const userData = userSnap.data() as { connectedUserIds?: string[] };
    const peers = Array.from(new Set(userData.connectedUserIds || []));

    for (const peerId of peers) {
      const peerRef = db.doc(`users/${peerId}`);
      const peerSnap = await tx.get(peerRef);
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
