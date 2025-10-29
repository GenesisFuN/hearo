// Check which workers are processing jobs
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWorkers() {
  console.log("🔍 Checking recent job activity...\n");

  const { data: recentJobs } = await supabase
    .from("tts_jobs")
    .select("id, status, worker_id, created_at, started_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentJobs && recentJobs.length > 0) {
    console.log("📊 Recent Jobs:");
    recentJobs.forEach((job) => {
      console.log(`\n   Job: ${job.id.substring(0, 8)}...`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Worker: ${job.worker_id || "none"}`);
      console.log(
        `   Created: ${new Date(job.created_at).toLocaleTimeString()}`
      );
      if (job.started_at) {
        console.log(
          `   Started: ${new Date(job.started_at).toLocaleTimeString()}`
        );
      }
      if (job.completed_at) {
        console.log(
          `   Completed: ${new Date(job.completed_at).toLocaleTimeString()}`
        );
      }
    });
  }
}

checkWorkers();
