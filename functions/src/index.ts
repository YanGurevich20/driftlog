import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

admin.initializeApp();

const exchangeRateApiKey = defineSecret("EXCHANGE_RATE_API_KEY");

const EXCHANGE_API_URL = "https://v6.exchangerate-api.com/v6";

interface DailyRates {
  [currency: string]: number;
}

interface MonthlyRates {
  rates: {
    [date: string]: DailyRates; // "YYYY-MM-DD" -> rates
  };
  lastUpdated: Timestamp;
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

export const getMonthlyRates = onCall<GetMonthlyRatesRequest>({
  region: "us-central1",
  secrets: [exchangeRateApiKey],
}, async (request): Promise<GetMonthlyRatesResponse> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { months } = request.data;
  if (!months || !Array.isArray(months) || months.length === 0) {
    throw new HttpsError("invalid-argument", "Months array is required");
  }

  try {
    const db = admin.firestore();
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
        if (month === currentMonthKey && !data.rates[todayKey]) {
          const apiKey = exchangeRateApiKey.value();
          if (apiKey) {
            try {
              logger.info(`Fetching today's rates for ${todayKey}`);
              const todaysRates = await fetchTodaysRates(apiKey);
              
              // Update the month document with today's rates
              data.rates[todayKey] = todaysRates;
              data.lastUpdated = Timestamp.now();
              
              await db.doc(`exchangeRates/${month}`).set(data);
              logger.info(`Updated ${month} with today's rates`);
              
              monthlyRates[month] = data;
            } catch (error) {
              logger.error(`Failed to fetch today's rates: ${error}`);
              // Continue with existing data
            }
          }
        }
      } else {
        // Month doesn't exist - if it's current month, try to create it
        if (month === currentMonthKey) {
          const apiKey = exchangeRateApiKey.value();
          if (apiKey) {
            try {
              logger.info(`Creating new month document for ${month}`);
              const todaysRates = await fetchTodaysRates(apiKey);
              
              const newMonthData: MonthlyRates = {
                rates: {
                  [todayKey]: todaysRates,
                },
                lastUpdated: Timestamp.now(),
              };
              
              await db.doc(`exchangeRates/${month}`).set(newMonthData);
              logger.info(`Created ${month} with today's rates`);
              
              monthlyRates[month] = newMonthData;
            } catch (error) {
              logger.error(`Failed to create month ${month}: ${error}`);
              // Return empty month data
              monthlyRates[month] = {
                rates: {},
                lastUpdated: Timestamp.now(),
              };
            }
          }
        } else {
          // Historical or future month without data
          logger.warn(`No data for month ${month}`);
          monthlyRates[month] = {
            rates: {},
            lastUpdated: Timestamp.now(),
          };
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
