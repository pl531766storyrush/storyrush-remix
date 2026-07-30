import { execSync } from 'child_process';

const token_res = execSync('curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"').toString();
const token = JSON.parse(token_res).access_token;

console.log("Token obtained.");

async function callAPI(url) {
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const text = await res.text();
    console.log(`\nURL: ${url}`);
    console.log(text.substring(0, 1000));
  } catch (err) {
    console.error(`Failed to call ${url}:`, err);
  }
}

async function run() {
  await callAPI("https://firestore.googleapis.com/v1/projects/dramax-1fb42/databases/ai-studio-storyrushapp-82c2c98a-8e57-4d4c-893c-62d4a8b52c16");
}

run().then(() => process.exit(0));
