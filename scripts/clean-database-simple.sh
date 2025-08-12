#!/bin/bash

echo "⚠️  WARNING: This will DELETE ALL DATA in your Firestore database!"
echo "Collections to be deleted: users, spaces, entries, spaceInvitations, exchangeRates"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo "Deleting Firestore collections..."

# Delete collections using Firebase CLI
firebase firestore:delete users --all-collections --project drift-log --force
firebase firestore:delete spaces --all-collections --project drift-log --force  
firebase firestore:delete entries --all-collections --project drift-log --force
firebase firestore:delete spaceInvitations --all-collections --project drift-log --force
firebase firestore:delete exchangeRates --all-collections --project drift-log --force

echo "✅ Database cleanup complete!"
echo "Note: Firebase Auth users are not deleted. You can manage them in Firebase Console."