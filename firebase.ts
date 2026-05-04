import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
let db;
try {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Falling back to default Firestore database on client.");
  db = getFirestore(app);
}
export { db };

// Validate Connection to Firestore
async function testConnection() {
  try {
    // @ts-ignore
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    } else {
      console.warn("Firebase connection test failed (this might be expected if the test document doesn't exist, but it confirms the database is reachable):", error);
    }
  }
}
testConnection();

// Initialized Firebase
export const auth = getAuth();
