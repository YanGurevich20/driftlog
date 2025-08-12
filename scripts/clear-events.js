const admin = require('firebase-admin');

// Initialize admin SDK with service account
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearEvents() {
  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    
    if (snapshot.empty) {
      console.log('No events to delete');
      return;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${snapshot.size} events`);
  } catch (error) {
    console.error('Error clearing events:', error);
  } finally {
    process.exit();
  }
}

clearEvents();