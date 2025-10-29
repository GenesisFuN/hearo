// Backfill duration_seconds for existing works
// Run this once to update all existing books with their durations

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from parent directory
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillDurations() {
  console.log("🔄 Backfilling durations for existing works...\n");

  // Get all works that don't have duration set
  const { data: works, error: worksError } = await supabase
    .from("works")
    .select("id, title")
    .or("duration_seconds.is.null,duration_seconds.eq.0");

  if (worksError) {
    console.error("❌ Error fetching works:", worksError.message);
    return;
  }

  console.log(`📚 Found ${works.length} works to update\n`);

  let updated = 0;
  let skipped = 0;

  for (const work of works) {
    // Get total duration from audio_files
    const { data: audioFiles, error: audioError } = await supabase
      .from("audio_files")
      .select("duration_seconds")
      .eq("work_id", work.id);

    if (audioError) {
      console.error(
        `   ❌ Error fetching audio for "${work.title}":`,
        audioError.message
      );
      skipped++;
      continue;
    }

    if (!audioFiles || audioFiles.length === 0) {
      console.log(`   ⏭️  Skipping "${work.title}" - no audio files`);
      skipped++;
      continue;
    }

    // Sum up all durations
    const totalDuration = audioFiles.reduce(
      (sum, file) => sum + (file.duration_seconds || 0),
      0
    );

    if (totalDuration === 0) {
      console.log(`   ⏭️  Skipping "${work.title}" - no duration data`);
      skipped++;
      continue;
    }

    // Update the work
    const { error: updateError } = await supabase
      .from("works")
      .update({ duration_seconds: totalDuration })
      .eq("id", work.id);

    if (updateError) {
      console.error(
        `   ❌ Error updating "${work.title}":`,
        updateError.message
      );
      skipped++;
      continue;
    }

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    console.log(`   ✅ Updated "${work.title}" - ${hours}h ${minutes}m`);
    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📚 Total: ${works.length}`);
}

backfillDurations().catch(console.error);
