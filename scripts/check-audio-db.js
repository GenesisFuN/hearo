// Check what's in the database for recent audio files
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAudioFiles() {
  console.log("🔍 Checking recent audio files...\n");

  const { data: audioFiles } = await supabase
    .from("audio_files")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (audioFiles && audioFiles.length > 0) {
    console.log("📊 Recent Audio Files:");
    audioFiles.forEach((file) => {
      console.log(`\n   File: ${file.filename}`);
      console.log(`   Work ID: ${file.work_id}`);
      console.log(`   file_path: ${file.file_path}`);
      console.log(`   storage_path: ${file.storage_path}`);
      console.log(`   storage_bucket: ${file.storage_bucket}`);
      console.log(`   mime_type: ${file.mime_type}`);
      console.log(`   Created: ${new Date(file.created_at).toLocaleString()}`);
    });
  } else {
    console.log("❌ No audio files found");
  }

  // Also check works
  console.log("\n\n📚 Recent Works:");
  const { data: works } = await supabase
    .from("works")
    .select("id, title, status, progress_percent")
    .order("created_at", { ascending: false })
    .limit(5);

  works?.forEach((work) => {
    console.log(`\n   ${work.title}`);
    console.log(`   ID: ${work.id}`);
    console.log(`   Status: ${work.status}`);
    console.log(`   Progress: ${work.progress_percent}%`);
  });
}

checkAudioFiles();
