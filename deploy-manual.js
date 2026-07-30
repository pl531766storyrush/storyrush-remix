import { execSync } from 'child_process';

try {
  console.log("Retrieving token...");
  const token_res = execSync('curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"').toString();
  const token = JSON.parse(token_res).access_token;
  console.log("Token retrieved successfully. Running firebase deploy...");

  const command = `npx firebase deploy --only firestore --project dramax-1fb42`;
  const output = execSync(command, { encoding: 'utf-8' });
  console.log("Deploy Success! Output:");
  console.log(output);
} catch (err) {
  console.error("Deploy failed:");
  if (err.stdout) console.log("Stdout:", err.stdout.toString());
  if (err.stderr) console.error("Stderr:", err.stderr.toString());
  console.error(err);
}
