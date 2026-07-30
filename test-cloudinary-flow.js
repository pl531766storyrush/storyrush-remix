import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("=== STARTING CLOUDINARY FLOW INTEGRATION TEST ===");
  console.log(`Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}`);

  // 1. Ensure local test assets exist
  try {
    console.log("Creating transparent 1x1 PNG asset...");
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    writeFileSync('/tmp/test_flow_image.png', Buffer.from(pngBase64, 'base64'));

    console.log("Creating 1-second MP4 video asset using ffmpeg...");
    execSync('ffmpeg -f lavfi -i color=c=black:s=320x240:d=1 -pix_fmt yuv420p /tmp/test_flow_video.mp4 -y', { stdio: 'ignore' });
  } catch (err) {
    console.error("Failed to prepare test assets:", err);
    process.exit(1);
  }

  // 2. Upload Image to Cloudinary
  console.log("\nUploading cover thumbnail to Cloudinary...");
  const imageEndpoint = 'https://api.cloudinary.com/v1_1/wo9relh3/image/upload';
  let imageUrl = '';
  try {
    const imageBuffer = readFileSync('/tmp/test_flow_image.png');
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    const imageFormData = new FormData();
    imageFormData.append('file', imageBlob, 'test_flow_image.png');
    imageFormData.append('upload_preset', 'Storyrush_upload');

    const response = await fetch(imageEndpoint, {
      method: 'POST',
      body: imageFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary Image Upload status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    imageUrl = data.secure_url;
    console.log(`[SUCCESS] Cloudinary Image Upload completed!`);
    console.log(`Endpoint: ${imageEndpoint}`);
    console.log(`Returned secure_url: ${imageUrl}`);
  } catch (err) {
    console.error("[ERROR] Image Upload failed:", err);
    process.exit(1);
  }

  // 3. Upload Video to Cloudinary
  console.log("\nUploading video file to Cloudinary...");
  const videoEndpoint = 'https://api.cloudinary.com/v1_1/wo9relh3/video/upload';
  let videoUrl = '';
  try {
    const videoBuffer = readFileSync('/tmp/test_flow_video.mp4');
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const videoFormData = new FormData();
    videoFormData.append('file', videoBlob, 'test_flow_video.mp4');
    videoFormData.append('upload_preset', 'Storyrush_upload');

    const response = await fetch(videoEndpoint, {
      method: 'POST',
      body: videoFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary Video Upload status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    videoUrl = data.secure_url;
    console.log(`[SUCCESS] Cloudinary Video Upload completed!`);
    console.log(`Endpoint: ${videoEndpoint}`);
    console.log(`Returned secure_url: ${videoUrl}`);
  } catch (err) {
    console.error("[ERROR] Video Upload failed:", err);
    process.exit(1);
  }

  // 4. Save Cloudinary URLs to Firestore (Simulating Admin Panel Episode Submission)
  const id = `cloudinary_test_${Date.now()}`;
  const timestampStr = new Date().toISOString();
  const dramaPayload = {
    id: id,
    title: `Cloudinary Test Episode - ${new Date().toLocaleDateString()}`,
    description: "Successfully uploaded via Cloudinary API and persisted in Firestore database.",
    category: "Action",
    thumbnailUrl: imageUrl,
    videoUrl: videoUrl,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    duration: 1,
    episodeNumber: 1,
    seriesName: "Cloudinary Series",
    createdAt: timestampStr,
    timestamp: timestampStr,
    isTrending: true,
    isFeatured: true
  };

  console.log(`\nSaving Episode payload to Firestore under ID: ${id}...`);
  try {
    const dramaRef = doc(db, 'dramas', id);
    const episodeRef = doc(db, 'episodes', id);

    await setDoc(dramaRef, dramaPayload);
    await setDoc(episodeRef, dramaPayload);
    console.log("[SUCCESS] Episode document successfully persisted in Firestore!");
  } catch (err) {
    console.error("[ERROR] Firestore write failed:", err);
    process.exit(1);
  }

  // 5. Verify the episode appears in Firestore (Home Feed listens to this)
  console.log("\nVerifying stored data from Firestore...");
  try {
    const dramaRef = doc(db, 'dramas', id);
    const snap = await getDoc(dramaRef);
    if (snap.exists()) {
      console.log("[SUCCESS] Stored Drama read back successfully! Data:", snap.data());
    } else {
      throw new Error("Drama document not found in Firestore!");
    }
  } catch (err) {
    console.error("[ERROR] Firestore read validation failed:", err);
    process.exit(1);
  }

  console.log("\n=== CLOUDINARY FLOW INTEGRATION TEST COMPLETED SUCCESSFULLY! ===");
}

run().then(() => process.exit(0));
