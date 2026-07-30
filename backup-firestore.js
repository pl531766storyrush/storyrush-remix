import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const explicitConfig = {
  projectId: "dramax-1fb42",
  appId: "1:586296251513:web:081aec3f4d09b1baeb0a8",
  apiKey: "AIzaSyAVNAHypavbh909CG4wPUefGgSFGkyp5yQ",
  authDomain: "dramax-1fb42.firebaseapp.com",
  storageBucket: "dramax-1fb42.firebasestorage.app",
  messagingSenderId: "586296251513"
};

const app = initializeApp(explicitConfig);
const dbId = "ai-studio-storyrushapp-82c2c98a-8e57-4d4c-893c-62d4a8b52c16";
const db = getFirestore(app, dbId);

const collectionsToBackup = [
  'episodes',
  'series',
  'categories',
  'comments',
  'likes',
  'favorites',
  'users',
  'history',
  'dramas'
];

async function runBackup() {
  console.log(`Starting Firestore Backup on project: ${explicitConfig.projectId}, database: ${dbId}`);
  const fullBackupObj = {};

  for (const colName of collectionsToBackup) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Collection "${colName}": found ${snap.size} documents.`);
      fullBackupObj[colName] = {};

      const backupColName = `backup_${colName}`;

      for (const docSnap of snap.docs) {
        const docId = docSnap.id;
        const data = docSnap.data();
        fullBackupObj[colName][docId] = data;

        // Duplicate to backup collection in Firestore
        await setDoc(doc(db, backupColName, docId), {
          ...data,
          _backedUpAt: new Date().toISOString()
        });
      }
      console.log(`Successfully backed up ${snap.size} documents from "${colName}" to "${backupColName}".`);
    } catch (err) {
      console.error(`Error backing up collection "${colName}":`, err.message || err);
    }
  }

  fs.writeFileSync('./firestore_backup.json', JSON.stringify(fullBackupObj, null, 2));
  console.log('Local snapshot saved to ./firestore_backup.json');
  console.log('ALL BACKUPS COMPLETED SUCCESSFULLY!');
}

runBackup().then(() => process.exit(0)).catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
