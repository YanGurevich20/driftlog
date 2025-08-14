import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

const CACHE_DURATION_MINUTES = 30;
const EXCHANGE_API_URL = "https://v6.exchangerate-api.com/v6";

interface ExchangeRates {
  rates: Record<string, number>;
  fetchedAt: admin.firestore.Timestamp;
}

function isCacheExpired(fetchedAt: admin.firestore.Timestamp): boolean {
  const now = Date.now();
  const cached = fetchedAt.toMillis();
  const diffMinutes = (now - cached) / (1000 * 60);
  return diffMinutes > CACHE_DURATION_MINUTES;
}

async function fetchFromExchangeAPI(apiKey: string): Promise<ExchangeRates> {
  const response = await fetch(`${EXCHANGE_API_URL}/${apiKey}/latest/USD`);
  
  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.result !== "success") {
    throw new Error(`Exchange rate API failed: ${data["error-type"] || "Unknown error"}`);
  }

  return {
    rates: data.conversion_rates,
    fetchedAt: admin.firestore.Timestamp.now(),
  };
}

export const getExchangeRates = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const db = admin.firestore();
    const ratesDoc = await db.doc("exchangeRates/latest").get();
    
    if (ratesDoc.exists) {
      const data = ratesDoc.data() as ExchangeRates;
      if (!isCacheExpired(data.fetchedAt)) {
        logger.info("Returning cached exchange rates");
        return {
          rates: data.rates,
          fetchedAt: data.fetchedAt.toMillis(),
        };
      }
      logger.info("Cache expired, fetching fresh rates");
    }

    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Exchange rate API key not configured");
    }

    logger.info("Fetching fresh rates from API");
    const freshRates = await fetchFromExchangeAPI(apiKey);
    
    await db.doc("exchangeRates/latest").set(freshRates);
    logger.info("Saved fresh rates to Firestore");
    
    return {
      rates: freshRates.rates,
      fetchedAt: freshRates.fetchedAt.toMillis(),
    };
  } catch (error) {
    logger.error("Error fetching exchange rates:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to fetch exchange rates");
  }
});
