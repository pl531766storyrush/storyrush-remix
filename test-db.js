import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);

async function run() {
  const dbId = firebaseConfig.firestoreDatabaseId;
  console.log(`Testing write/read on database: ${dbId}`);
  const db = getFirestore(app, dbId);
  try {
    const testDoc = doc(db, "test_collection", "test_id");
    console.log("Attempting write...");
    await setDoc(testDoc, { hello: "world" });
    console.log("Write succeeded! Attempting read...");
    const snap = await getDoc(testDoc);
    console.log("Read succeeded! Data:", snap.data());
  } catch (err) {
    console.error("Operation failed:", err.message || err);
  }
}

run().then(() => process.exit(0));
