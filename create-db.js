import { execSync } from 'child_process';

const token_res = execSync('curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"').toString();
const token = JSON.parse(token_res).access_token;

console.log("Token obtained.");

async function createDatabase() {
  const url = "https://firestore.googleapis.com/v1/projects/dramax-1fb42/databases?databaseId=(default)";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: "nam5",
        concurrencyMode: "OPTIMISTIC"
      })
    });
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response text:", text);
  } catch (err) {
    console.error("Failed to create database:", err);
  }
}

createDatabase().then(() => process.exit(0));
