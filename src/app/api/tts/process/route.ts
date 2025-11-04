import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_URL = RUNPOD_ENDPOINT_ID
  ? `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`
  : null;

// Extended timeout for TTS processing
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  try {
    const { workId, userId, chapters, voiceSettings } = await request.json();

    if (!workId || !userId || !chapters || !voiceSettings) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`\n📥 Processing TTS job for work ${workId}`);
    console.log(`   Chapters: ${chapters.length}`);

    if (!RUNPOD_URL || !RUNPOD_API_KEY) {
      throw new Error(
        "RunPod configuration missing. Please set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY environment variables."
      );
    }

    const audioBuffers: Buffer[] = [];
    let totalDuration = 0;

    // Process each chapter
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const progressPercent = Math.round((i / chapters.length) * 85);

      console.log(`\n📖 Processing chapter ${i + 1}/${chapters.length}`);
      console.log(`   Title: ${chapter.title}`);
      console.log(`   Text length: ${chapter.text.length} chars`);

      // Update progress
      await supabase
        .from("works")
        .update({ progress_percent: progressPercent })
        .eq("id", workId);

      // Call RunPod TTS
      console.log(`   🎙️ Calling RunPod TTS server...`);

      const response = await fetch(RUNPOD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            text: chapter.text,
            language: voiceSettings.language || "en",
            speed: voiceSettings.speed || 0.92,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `RunPod TTS error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();

      console.log(`   📦 RunPod response:`, JSON.stringify(result).substring(0, 200));

      // RunPod returns audio as base64 in result.output.audio_base64
      if (!result.output || !result.output.audio_base64) {
        console.error(`   ❌ Missing audio data in response:`, result);
        throw new Error("RunPod response missing audio data");
      }

      const audioBuffer = Buffer.from(result.output.audio_base64, "base64");
      const duration = calculateWavDuration(audioBuffer.buffer);

      console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes`);
      console.log(`   ⏱️ Duration: ${formatDuration(duration)}`);

      audioBuffers.push(audioBuffer);
      totalDuration += duration;
    }

    // Combine audio files
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
      tts_provider: "runpod",
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

    console.log(`\n✅ TTS processing completed successfully`);
    console.log(`   Audio files: ${audioBuffers.length} chapters combined`);
    console.log(`   Total duration: ${formatDuration(totalDuration)}`);
    console.log(`   Final audio: ${uploadData.path}`);

    return NextResponse.json({
      success: true,
      audioPath: uploadData.path,
      duration: totalDuration,
      chaptersProcessed: chapters.length,
    });
  } catch (error: any) {
    console.error("TTS processing error:", error);
    console.error("Error stack:", error.stack);
    
    // Update work to show error
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { workId, userId } = await request.json();
      if (workId) {
        await supabase
          .from("works")
          .update({
            status: "failed",
            progress_percent: 0,
          })
          .eq("id", workId);
      }
    } catch (updateError) {
      console.error("Failed to update work status:", updateError);
    }
    
    return NextResponse.json(
      {
        error: "TTS processing failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
