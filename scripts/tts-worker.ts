// TTS Worker - Processes jobs from the queue
// Run this separately: npm run worker:dev

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Verify required env vars
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

import { TTSQueue } from "../src/lib/queue";
import type { TTSJob, TTSJobResult } from "../src/lib/queue";

const WORKER_ID = `worker-${process.env.WORKER_ID || Math.random().toString(36).substring(7)}`;
const POLL_INTERVAL = 5000; // Check for jobs every 5 seconds
const HEARTBEAT_INTERVAL = 10000; // Update progress every 10 seconds

console.log(`🚀 TTS Worker started: ${WORKER_ID}`);
console.log(`📊 Polling for jobs every ${POLL_INTERVAL / 1000}s`);

let isProcessing = false;
let currentJobId: string | null = null;

// Main worker loop
async function workerLoop() {
  while (true) {
    try {
      if (isProcessing) {
        await sleep(POLL_INTERVAL);
        continue;
      }

      // Claim next job (silently check every 5 seconds)
      const job = await TTSQueue.claimNextJob(WORKER_ID);

      if (!job) {
        // No jobs available, keep polling silently
        await sleep(POLL_INTERVAL);
        continue;
      }

      console.log(`\n📥 Claimed job ${job.id} for work ${job.workId}`);
      console.log(`   Type: ${job.payload.jobType}`);
      console.log(`   Chapters: ${job.payload.chapters.length}`);
      console.log(`   Priority: ${job.priority}`);
      console.log(`   Attempt: ${job.attempts}/${job.maxAttempts}`);

      isProcessing = true;
      currentJobId = job.id;

      try {
        await processJob(job);
      } catch (error: any) {
        console.error(`❌ Job ${job.id} failed:`, error.message);
        await TTSQueue.failJob(job.id, error.message);
      } finally {
        isProcessing = false;
        currentJobId = null;
      }
    } catch (error: any) {
      console.error("❌ Worker loop error:", error.message);
      await sleep(POLL_INTERVAL);
    }
  }
}

// Process a single job
async function processJob(job: TTSJob): Promise<void> {
  const chapters = job.payload.chapters;
  const audioFileIds: string[] = [];
  const audioBuffers: Buffer[] = [];
  let totalDuration = 0;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const progressPercent = Math.round((i / chapters.length) * 85); // Reserve 85-100 for finalization

    console.log(`\n📖 Processing chapter ${i + 1}/${chapters.length}`);
    console.log(`   Title: ${chapter.title}`);
    console.log(`   Text length: ${chapter.text.length} chars`);

    // Update progress in both job and work table
    await TTSQueue.updateProgress(job.id, {
      progressPercent,
      progressMessage: `Processing ${chapter.title}`,
      currentChapter: i + 1,
    });

    // Update work progress so UI can see it
    await supabase
      .from("works")
      .update({ progress_percent: progressPercent })
      .eq("id", job.payload.workId);

    try {
      const result = await generateTTS(chapter.text, job.payload.voiceSettings);

      audioFileIds.push(result.audioFileId);
      audioBuffers.push(result.audioBuffer);
      totalDuration += result.duration;

      console.log(`   ✅ Generated: ${formatDuration(result.duration)}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to generate chapter:`, error.message);
      throw new Error(`Chapter ${i + 1} failed: ${error.message}`);
    }
  }

  // Combine audio files
  console.log(`\n🔗 Combining ${audioBuffers.length} audio files...`);
  await TTSQueue.updateProgress(job.id, {
    progressPercent: 90,
    progressMessage: "Combining audio files...",
  });
  await supabase
    .from("works")
    .update({ progress_percent: 90 })
    .eq("id", job.payload.workId);

  let combinedAudio: Buffer;
  if (audioBuffers.length === 1) {
    combinedAudio = audioBuffers[0];
  } else {
    // Keep first chunk with header, strip headers from rest
    const firstChunk = audioBuffers[0];
    const remainingChunks = audioBuffers.slice(1).map((chunk) => {
      const dataMarkerIndex = chunk.indexOf(Buffer.from("data"));
      if (dataMarkerIndex !== -1) {
        return chunk.slice(dataMarkerIndex + 8);
      }
      return chunk.slice(44); // Standard WAV header
    });

    combinedAudio = Buffer.concat([firstChunk, ...remainingChunks]);

    // Update WAV header sizes
    const fileSize = combinedAudio.length - 8;
    combinedAudio.writeUInt32LE(fileSize, 4);

    const dataMarkerIndex = combinedAudio.indexOf(Buffer.from("data"));
    if (dataMarkerIndex !== -1) {
      const dataSize = combinedAudio.length - dataMarkerIndex - 8;
      combinedAudio.writeUInt32LE(dataSize, dataMarkerIndex + 4);
    }
  }

  console.log(`   📦 Combined size: ${combinedAudio.length} bytes`);

  // Upload combined audio
  console.log(`\n☁️ Uploading final audio to Supabase...`);
  await TTSQueue.updateProgress(job.id, {
    progressPercent: 95,
    progressMessage: "Uploading final audio...",
  });
  await supabase
    .from("works")
    .update({ progress_percent: 95 })
    .eq("id", job.payload.workId);

  const finalAudioPath = `${job.payload.userId}/${Date.now()}-combined-audio.wav`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("audiobooks")
    .upload(finalAudioPath, combinedAudio, {
      contentType: "audio/wav",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload combined audio: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("audiobooks")
    .getPublicUrl(finalAudioPath);

  console.log(`   ✅ Uploaded: ${uploadData.path}`);

  // Save to audio_files table
  console.log(`\n💾 Saving to database...`);
  console.log(
    `   📊 Total duration: ${Math.floor(totalDuration / 60)} minutes ${Math.floor(totalDuration % 60)} seconds`
  );

  const { error: audioError } = await supabase.from("audio_files").insert({
    user_id: job.payload.userId,
    work_id: job.payload.workId,
    filename: `audio-${Date.now()}.wav`,
    file_path: urlData.publicUrl,
    file_size_bytes: combinedAudio.length,
    duration_seconds: Math.floor(totalDuration),
    mime_type: "audio/wav",
    is_generated: true,
    tts_provider: "coqui",
    storage_bucket: "audiobooks",
    storage_path: uploadData.path,
  });

  if (audioError) {
    console.error(
      `   ⚠️ Warning: Failed to save audio record:`,
      audioError.message
    );
  }

  // Update work status to published with duration
  const { error: workError } = await supabase
    .from("works")
    .update({
      status: "published",
      progress_percent: 100,
      duration_seconds: Math.floor(totalDuration),
    })
    .eq("id", job.payload.workId);

  if (workError) {
    console.error(`   ⚠️ Warning: Failed to update work:`, workError.message);
  }

  // Mark job as complete
  const result: TTSJobResult = {
    audioFileIds: [uploadData.path], // Return the combined audio path
    totalDuration,
    completedAt: new Date().toISOString(),
  };

  await TTSQueue.completeJob(job.id, result);

  console.log(`\n✅ Job ${job.id} completed successfully`);
  console.log(`   Audio files: ${audioBuffers.length} chapters combined`);
  console.log(`   Total duration: ${formatDuration(totalDuration)}`);
  console.log(`   Final audio: ${uploadData.path}`);
}

// Generate TTS and upload to Supabase
async function generateTTS(
  text: string,
  voiceSettings: any
): Promise<{ audioFileId: string; duration: number; audioBuffer: Buffer }> {
  const COQUI_URL = process.env.COQUI_SERVER_URL || "http://localhost:8000";

  console.log(`   🎙️ Calling Coqui TTS server...`);

  // Call Coqui TTS server
  const response = await fetch(`${COQUI_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice_id: voiceSettings.voiceId, // Voice reference file name (e.g., "voice1.wav")
      language: voiceSettings.language || "en",
      temperature: voiceSettings.temperature || 0.5,
      speed: voiceSettings.speed || 0.92,
      speaker: voiceSettings.speaker || "Claribel Dervla",
      denoiser_strength: voiceSettings.denoiserStrength || 0.02,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Coqui TTS error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  // Get audio buffer (WAV format)
  const audioArrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);
  console.log(`   📦 Received ${audioBuffer.byteLength} bytes`);

  // Calculate duration from WAV header
  const duration = calculateWavDuration(audioArrayBuffer);
  console.log(`   ⏱️ Duration: ${formatDuration(duration)}`);

  // Don't upload individual chapters anymore - we'll combine them first
  // Just return the buffer for combining

  return {
    audioFileId: `temp-${Date.now()}`, // Temporary ID, not used
    duration,
    audioBuffer, // Return Buffer for combining
  };
}

// Calculate duration from WAV file header
function calculateWavDuration(buffer: ArrayBuffer): number {
  try {
    const view = new DataView(buffer);

    // WAV format: bytes 24-27 = sample rate, bytes 40-43 = data size
    const sampleRate = view.getUint32(24, true);
    const dataSize = view.getUint32(40, true);
    const channels = view.getUint16(22, true);
    const bitsPerSample = view.getUint16(34, true);

    const bytesPerSample = (bitsPerSample / 8) * channels;
    const numSamples = dataSize / bytesPerSample;
    const duration = Math.round(numSamples / sampleRate);

    return duration;
  } catch (error) {
    // Fallback: estimate based on typical bitrate
    console.warn("   ⚠️ Could not parse WAV header, using estimate");
    return Math.round(buffer.byteLength / 44100 / 2); // Assume 44.1kHz mono
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n🛑 Shutting down worker...");

  if (currentJobId) {
    console.log(`⚠️  Releasing current job ${currentJobId}`);
    await TTSQueue.failJob(
      currentJobId,
      "Worker shutdown",
      true // Allow retry
    );
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n\n🛑 Shutting down worker...");
  process.exit(0);
});

// Maintenance: Reset stuck jobs every 5 minutes
setInterval(
  async () => {
    try {
      const resetCount = await TTSQueue.resetStuckJobs();
      if (resetCount > 0) {
        console.log(`🔄 Reset ${resetCount} stuck jobs`);
      }
    } catch (error: any) {
      console.error("❌ Failed to reset stuck jobs:", error.message);
    }
  },
  5 * 60 * 1000
);

// Utils
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Start the worker
workerLoop().catch((error) => {
  console.error("💥 Worker crashed:", error);
  process.exit(1);
});
