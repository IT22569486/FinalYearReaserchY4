// firebase.js
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config();

function initFirebase() {
  if (admin.apps.length) return admin;

  // Option 1: service account JSON file
  if (process.env.SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.join(__dirname, process.env.SERVICE_ACCOUNT_PATH);
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return admin;
  }

  // Option 2: use .env variables (projectId, clientEmail, privateKey)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return admin;
  }

  admin.initializeApp();
  return admin;
}

const adminApp = initFirebase();
const db = adminApp.firestore();

module.exports = { admin: adminApp, db };
