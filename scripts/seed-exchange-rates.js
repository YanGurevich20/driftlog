const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Set environment variable to use Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Initialize admin SDK with actual project ID for emulator
admin.initializeApp({
  projectId: 'drift-log',
});

const db = getFirestore(admin.app());

// Sample exchange rates for development
// These don't need to be accurate - just realistic enough for testing
const sampleRates = {
  "USD": 1,
  "EUR": 0.92,
  "GBP": 0.79,
  "JPY": 149.85,
  "AUD": 1.53,
  "CAD": 1.36,
  "CHF": 0.88,
  "CNY": 7.24,
  "SEK": 10.89,
  "NZD": 1.64,
  "MXN": 17.12,
  "SGD": 1.34,
  "HKD": 7.82,
  "NOK": 10.98,
  "KRW": 1318.45,
  "TRY": 34.25,
  "RUB": 89.65,
  "INR": 83.12,
  "BRL": 4.97,
  "ZAR": 18.45,
  "THB": 34.56,
  "PLN": 3.98,
  "TWD": 32.15,
  "DKK": 6.89,
  "IDR": 15825.00,
  "HUF": 355.20,
  "CZK": 23.45,
  "ILS": 3.65,
  "CLP": 965.50,
  "PHP": 55.89,
  "AED": 3.67
};

async function seedExchangeRates() {
  try {
    const SERVICE_START_DATE = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Group dates by month
    const monthsData = {};
    
    // Iterate from SERVICE_START_DATE to today
    const currentDate = new Date(SERVICE_START_DATE);
    while (currentDate <= today) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      if (!monthsData[monthKey]) {
        monthsData[monthKey] = {};
      }
      
      // Add slight variations to make it more realistic
      const dailyRates = {};
      Object.keys(sampleRates).forEach(currency => {
        const baseRate = sampleRates[currency];
        const variation = 1 + (Math.random() - 0.5) * 0.02; // ±1% variation
        dailyRates[currency] = parseFloat((baseRate * variation).toFixed(4));
      });
      
      monthsData[monthKey][dateKey] = dailyRates;
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Store each month in Firestore
    for (const [monthKey, monthData] of Object.entries(monthsData)) {
      const docRef = db.doc(`exchangeRates/${monthKey}`);
      await docRef.set(monthData);
      console.log(`✓ Seeded exchange rates for ${monthKey} (${Object.keys(monthData).length} days)`);
    }
    
    // Verify the data was written
    console.log('\n🔍 Verifying data...');
    const snapshot = await db.collection('exchangeRates').get();
    console.log(`Found ${snapshot.size} documents in exchangeRates collection`);
    
    console.log('\n✅ Exchange rates seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exchange rates:', error);
    process.exit(1);
  }
}

seedExchangeRates();