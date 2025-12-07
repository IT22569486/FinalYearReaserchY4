# Firebase Firestore Indexes Setup

## Option 1: Deploy via Firebase CLI (Recommended)

1. Install Firebase CLI if not installed:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in the backend directory:
```bash
cd backend
firebase init firestore
```

4. Deploy the indexes:
```bash
firebase deploy --only firestore:indexes
```

## Option 2: Create Indexes Manually via Firebase Console

Click on these links to create the required indexes:

### Health Logs Index
https://console.firebase.google.com/v1/r/project/finalyearreserch/firestore/indexes?create_composite=ClNwcm9qZWN0cy9maW5hbHllYXJyZXNlcmNoL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9oZWFsdGhMb2dzL2luZGV4ZXMvXxABGg0KCWRldmljZUtleRABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI

### Violations Index
https://console.firebase.google.com/v1/r/project/finalyearreserch/firestore/indexes?create_composite=ClNwcm9qZWN0cy9maW5hbHllYXJyZXNlcmNoL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy92aW9sYXRpb25zL2luZGV4ZXMvXxABGg0KCWRldmljZUtleRABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI

## Option 3: Temporarily Use Simplified Queries (No Index Required)

The backend has been updated to use simplified queries that don't require indexes until the indexes are created.

## Verification

After creating the indexes, it may take a few minutes for them to build. You can check the status in the Firebase Console under:
**Firestore Database → Indexes**

The indexes will show as "Building" and then "Enabled" when ready.
