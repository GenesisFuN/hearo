import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";

const COQUI_URL = process.env.COQUI_SERVER_URL || "http://localhost:8000";

// Calculate duration from WAV file header
function calculateWavDuration(buffer: ArrayBuffer): number {
  try {
    const view = new DataView(buffer);
    const sampleRate = view.getUint32(24, true);
    const dataSize = view.getUint32(40, true);
    const channels = view.getUint16(22, true);
    const bitsPerSample = view.getUint16(34, true);
    const bytesPerSample = (bitsPerSample / 8) * channels;
    const numSamples = dataSize / bytesPerSample;
    const duration = Math.round(numSamples / sampleRate);
    return duration;
  } catch (error) {
    console.warn("Could not parse WAV header, using estimate");
    return Math.round(buffer.byteLength / 44100 / 2);
  }
}

// Format duration for logging
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export const processTTSJob = inngest.createFunction(
  { id: "process-tts-job", name: "Process TTS Job" },
  { event: "tts/job.created" },
  async ({ event, step }) => {
    const { jobId, workId, userId, chapters, voiceSettings } = event.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`\n📥 Processing TTS job ${jobId} for work ${workId}`);
    console.log(`   Chapters: ${chapters.length}`);

    const audioBuffers: Buffer[] = [];
    let totalDuration = 0;

    // Process each chapter
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const progressPercent = Math.round((i / chapters.length) * 85);

      await step.run(`process-chapter-${i}`, async () => {
        console.log(`\n📖 Processing chapter ${i + 1}/${chapters.length}`);
        console.log(`   Title: ${chapter.title}`);
        console.log(`   Text length: ${chapter.text.length} chars`);

        // Update progress
        await supabase
          .from("works")
          .update({ progress_percent: progressPercent })
          .eq("id", workId);

        // Call Coqui TTS
        console.log(`   🎙️ Calling Coqui TTS server...`);
        const response = await fetch(`${COQUI_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chapter.text,
            voice_id: voiceSettings.voiceId,
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

        const audioArrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(audioArrayBuffer);
        const duration = calculateWavDuration(audioArrayBuffer);

        console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes`);
        console.log(`   ⏱️ Duration: ${formatDuration(duration)}`);

        audioBuffers.push(audioBuffer);
        totalDuration += duration;
      });
    }

    // Combine audio files
    await step.run("combine-audio", async () => {
      console.log(`\n🔗 Combining ${audioBuffers.length} audio files...`);

      let combinedAudio: Buffer;
      if (audioBuffers.length === 1) {
        combinedAudio = audioBuffers[0];
      } else {
        const firstChunk = audioBuffers[0];
        const remainingChunks = audioBuffers.slice(1).map((chunk) => {
          return chunk.subarray(44); // Skip WAV header
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

      // Upload to Supabase
      console.log(`\n☁️ Uploading final audio to Supabase...`);
      await supabase
        .from("works")
        .update({ progress_percent: 95 })
        .eq("id", workId);

      const finalAudioPath = `${userId}/${Date.now()}-combined-audio.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audiobooks")
        .upload(finalAudioPath, combinedAudio, {
          contentType: "audio/wav",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload combined audio: ${uploadError.message}`
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("audiobooks")
        .getPublicUrl(finalAudioPath);

      console.log(`   ✅ Uploaded: ${uploadData.path}`);

      // Save to audio_files table
      console.log(`\n💾 Saving to database...`);
      await supabase.from("audio_files").insert({
        user_id: userId,
        work_id: workId,
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

      // Update work status
      await supabase
        .from("works")
        .update({
          status: "published",
          progress_percent: 100,
          duration_seconds: Math.floor(totalDuration),
        })
        .eq("id", workId);

      console.log(`\n✅ Job ${jobId} completed successfully`);
      console.log(`   Audio files: ${audioBuffers.length} chapters combined`);
      console.log(`   Total duration: ${formatDuration(totalDuration)}`);
      console.log(`   Final audio: ${uploadData.path}`);

      return {
        success: true,
        audioPath: uploadData.path,
        duration: totalDuration,
        chaptersProcessed: chapters.length,
      };
    });
  }
);
