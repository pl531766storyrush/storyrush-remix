import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  const dbId = firebaseConfig.firestoreDatabaseId;
  console.log(`Signing in anonymously...`);
  try {
    const userCredential = await signInAnonymously(auth);
    console.log(`Signed in successfully! User ID: ${userCredential.user.uid}`);
    
    console.log(`Testing read of "dramas" on database: ${dbId}`);
    const db = getFirestore(app, dbId);
    
    const snapshot = await getDocs(collection(db, "dramas"));
    console.log(`Successfully connected. Total "dramas" documents found: ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(`  - Drama Document ID: ${doc.id}, Title: ${doc.data().title || 'Untitled'}`);
    });
  } catch (err) {
    console.error("Operation failed:", err.message || err);
  }
}

run().then(() => process.exit(0));
