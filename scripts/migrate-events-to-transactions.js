#!/usr/bin/env node

// This script migrates the 'events' collection to 'transactions'
// Run with: node scripts/migrate-events-to-transactions.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Load env vars
require('dotenv').config({ path: '.env.local' });

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  try {
    console.log('Starting migration from events to transactions...');
    
    // Get all events
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    console.log(`Found ${eventsSnapshot.size} events to migrate`);
    
    // Copy each event to transactions collection
    for (const eventDoc of eventsSnapshot.docs) {
      const data = eventDoc.data();
      await setDoc(doc(db, 'transactions', eventDoc.id), data);
      console.log(`Migrated event ${eventDoc.id}`);
    }
    
    // Optional: Delete old events collection
    console.log('Migration complete! Old events collection kept for safety.');
    console.log('To delete old events, run: npx firebase firestore:delete events --recursive --force');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

migrate();