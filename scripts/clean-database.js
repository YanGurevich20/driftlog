const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'drift-log'
});

const db = admin.firestore();

async function cleanDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Delete all users
    const usersSnapshot = await db.collection('users').get();
    const userDeletePromises = usersSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(userDeletePromises);
    console.log(`Deleted ${usersSnapshot.size} users`);
    
    // Delete all spaces
    const spacesSnapshot = await db.collection('spaces').get();
    const spaceDeletePromises = spacesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(spaceDeletePromises);
    console.log(`Deleted ${spacesSnapshot.size} spaces`);
    
    // Delete all transactions
    const transactionsSnapshot = await db.collection('transactions').get();
    const transactionDeletePromises = transactionsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(transactionDeletePromises);
    console.log(`Deleted ${transactionsSnapshot.size} transactions`);
    
    // Delete all space invitations
    const invitationsSnapshot = await db.collection('spaceInvitations').get();
    const invitationDeletePromises = invitationsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(invitationDeletePromises);
    console.log(`Deleted ${invitationsSnapshot.size} invitations`);
    
    // Delete exchange rates cache
    const ratesSnapshot = await db.collection('exchangeRates').get();
    const ratesDeletePromises = ratesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(ratesDeletePromises);
    console.log(`Deleted ${ratesSnapshot.size} exchange rate documents`);
    
    console.log('Database cleanup complete!');
    console.log('Note: Firebase Auth users are not deleted. You can manage them in Firebase Console.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will DELETE ALL DATA in the Firestore database. Are you sure? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    cleanDatabase();
  } else {
    console.log('Cleanup cancelled.');
    process.exit(0);
  }
  rl.close();
});