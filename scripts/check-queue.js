// Simple queue health check
// Run with: node scripts/check-queue.js

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQueue() {
  console.log("🔍 Checking TTS Queue Status...\n");

  try {
    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from("tts_jobs")
      .select("count")
      .limit(1);

    if (tablesError) {
      console.error("❌ tts_jobs table not found!");
      console.error("   Error:", tablesError.message);
      console.log("\n💡 Run the SQL migration: docs/tts-queue-schema.sql");
      return;
    }

    console.log("✅ tts_jobs table exists");

    // Get queue stats
    const { data: pending } = await supabase
      .from("tts_jobs")
      .select("id")
      .eq("status", "pending");

    const { data: processing } = await supabase
      .from("tts_jobs")
      .select("id")
      .eq("status", "processing");

    const { data: completed } = await supabase
      .from("tts_jobs")
      .select("id")
      .eq("status", "completed");

    const { data: failed } = await supabase
      .from("tts_jobs")
      .select("id")
      .eq("status", "failed");

    console.log("\n📊 Queue Statistics:");
    console.log("   Pending:    ", pending?.length || 0);
    console.log("   Processing: ", processing?.length || 0);
    console.log("   Completed:  ", completed?.length || 0);
    console.log("   Failed:     ", failed?.length || 0);

    // Check if worker is needed
    if (pending?.length > 0) {
      console.log(
        "\n⚠️  You have pending jobs! Make sure the worker is running:"
      );
      console.log("   npm run worker:dev");
    } else {
      console.log("\n✅ No pending jobs. Queue is clear!");
    }

    // Get a sample work to test with
    const { data: works } = await supabase
      .from("works")
      .select("id, title")
      .limit(3);

    if (works && works.length > 0) {
      console.log("\n📚 Sample works you can test with:");
      works.forEach((work) => {
        console.log(`   - ${work.id} (${work.title})`);
      });
      console.log("\n💡 Use one of these work IDs to test the queue");
    } else {
      console.log(
        "\n⚠️  No works found. Create a work first to test the queue."
      );
    }

    console.log("\n✨ Queue system is ready!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkQueue();
