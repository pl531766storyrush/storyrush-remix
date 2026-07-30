import { execSync } from 'child_process';

const token_res = execSync('curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"').toString();
const token = JSON.parse(token_res).access_token;

async function checkCollection(collectionName) {
  const dbId = "ai-studio-storyrushapp-82c2c98a-8e57-4d4c-893c-62d4a8b52c16";
  const url = `https://firestore.googleapis.com/v1/projects/dramax-1fb42/databases/${dbId}/documents/${collectionName}`;
  console.log(`\nQuerying actual server data for collection "${collectionName}"...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("Response code:", res.status);
    const data = await res.json();
    if (data.documents) {
      console.log(`Found ${data.documents.length} documents:`);
      data.documents.forEach(doc => {
        const id = doc.name.split('/').pop();
        console.log(` - ID: ${id}, Fields:`, JSON.stringify(doc.fields));
      });
    } else {
      console.log("No documents found on server.");
    }
  } catch (err) {
    console.error(`Failed to read "${collectionName}":`, err);
  }
}

async function run() {
  await checkCollection("dramas");
  await checkCollection("likes");
}

run().then(() => process.exit(0));
