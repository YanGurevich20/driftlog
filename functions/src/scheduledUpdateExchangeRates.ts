import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

const db = getFirestore(admin.app());
const exchangeRateApiKey = defineSecret("EXCHANGE_RATE_API_KEY");

const EXCHANGE_API_URL = "https://v6.exchangerate-api.com/v6";

interface DailyRates {
  [currency: string]: number;
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

// Scheduled job to store today's exchange rates under exchangeRates/YYYY-MM[YYYY-MM-DD]
export const scheduledUpdateExchangeRates = onSchedule({
  region: "asia-southeast1",
  schedule: "0 0 * * *", // 00:00 UTC daily
  timeZone: "UTC",
  secrets: [exchangeRateApiKey],
}, async () => {
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