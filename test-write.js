import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);

async function run() {
  const dbId = firebaseConfig.firestoreDatabaseId;
  console.log(`Testing write on database: ${dbId}`);
  const db = getFirestore(app, dbId);
  try {
    const dramaDoc = doc(db, "dramas", "test_drama_write");
    console.log("Attempting write to dramas/test_drama_write...");
    await setDoc(dramaDoc, { title: "Test Write", createdAt: new Date().toISOString() });
    console.log("Write to dramas succeeded! Attempting read...");
    const snap = await getDoc(dramaDoc);
    console.log("Read from dramas succeeded! Data:", snap.data());

    const likeDoc = doc(db, "likes", "test_like_write");
    console.log("Attempting write to likes/test_like_write...");
    await setDoc(likeDoc, { userId: "test_user", dramaId: "test_drama_write", createdAt: new Date().toISOString() });
    console.log("Write to likes succeeded!");
  } catch (err) {
    console.error("Operation failed:", err.message || err);
  }
}

run().then(() => process.exit(0));
