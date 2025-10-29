import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import {
  createAuthenticatedClient,
  createAdminClient,
} from "../../../../lib/supabase-server";
import { splitTextIntoChunks } from "../../../../lib/elevenlabs";
import { TTSQueue } from "../../../../lib/queue";
import { getPriorityForUser } from "../../../../lib/queue/types";
import { AppError, ErrorCodes, logError } from "@/lib/errorHandling";
import { inngest } from "@/lib/inngest/client";

// Type definition for subscription (kept for getUserSubscription)
type UserSubscription = {
  tier: "free" | "basic" | "premium" | "creator";
  features: {
    useSelfHostedTTS: boolean;
    maxMonthlyGenerations: number;
  };
};

// Configure route for longer execution time (max 300 seconds for self-hosted)
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

// Function to generate content hash for duplicate detection
function generateContentHash(content: string): string {
  return createHash("sha256")
    .update(content.trim().toLowerCase())
    .digest("hex");
}

// Helper function to get user subscription
// TODO: Replace with actual subscription logic from your auth system
function getUserSubscription(request: NextRequest): UserSubscription {
  // For now, return a default subscription
  // In production, you would:
  // 1. Get user from session/auth
  // 2. Query database for their subscription tier
  // 3. Return actual subscription data

  // Example: Check a header or cookie for demo purposes
  const subscriptionTier =
    (request.headers.get("x-subscription-tier") as
      | "free"
      | "basic"
      | "premium"
      | "creator") || "free";

  return {
    tier: subscriptionTier,
    features: {
      useSelfHostedTTS:
        subscriptionTier === "premium" || subscriptionTier === "creator",
      maxMonthlyGenerations: subscriptionTier === "free" ? 10 : -1,
    },
  };
}

// Function to check if file content already exists FOR THIS USER
async function checkForDuplicateContent(
  newContent: string,
  userId: string,
  supabaseClient: any
): Promise<{ isDuplicate: boolean; existingFile?: string }> {
  try {
    const newContentHash = generateContentHash(newContent);

    // Check database for works by this user with the same content hash
    const { data: existingWorks, error } = await supabaseClient
      .from("works")
      .select("id, title")
      .eq("creator_id", userId)
      .eq("content_hash", newContentHash);

    if (error) {
      console.log("Unable to check for duplicates in database:", error);
      return { isDuplicate: false };
    }

    if (existingWorks && existingWorks.length > 0) {
      return {
        isDuplicate: true,
        existingFile: existingWorks[0].title || "existing work",
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    // If we can't check for duplicates, proceed with upload
    console.log("Unable to check for duplicates:", error);
    return { isDuplicate: false };
  }
}

export async function POST(request: NextRequest) {
  console.log("Text upload API called");

  try {
    // AUTHENTICATE USER FIRST and create authenticated Supabase client
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required - please sign in",
          code: ErrorCodes.AUTH_REQUIRED,
          userMessage: "Please sign in to upload books.",
        },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated Supabase client for this request
    const supabase = createAuthenticatedClient(token);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logError(authError || new Error("No user found"), "Upload API - Auth");
      return NextResponse.json(
        {
          error:
            "Failed to upload file: " +
            (authError?.message || "Invalid authentication"),
          code: ErrorCodes.AUTH_INVALID,
          userMessage: "Your session has expired. Please sign in again.",
          hint: "Please sign out and sign back in to refresh your session",
        },
        { status: 401 }
      );
    }

    console.log("✅ Authenticated user:", user.id, user.email);

    // Use service role for database operations to bypass RLS
    // We've already verified the user's identity above
    const adminClient = createAdminClient();

    // Check if this is a retry request
    const contentType = request.headers.get("content-type");
    const isRetryRequest = contentType?.includes("application/json");

    if (isRetryRequest) {
      // Handle retry processing
      const { bookId, textPath } = await request.json();
      console.log("Retry processing request for book:", bookId);

      if (!textPath) {
        return NextResponse.json(
          { error: "Text path required for retry" },
          { status: 400 }
        );
      }

      // Retry functionality removed - old synchronous processing is deprecated
      // Use the main upload flow instead which uses queue-based processing
      return NextResponse.json(
        {
          error:
            "Retry functionality has been removed. Please re-upload the file.",
          suggestion:
            "Upload your text file again to use the new queue-based processing system.",
        },
        { status: 410 } // 410 Gone - functionality no longer available
      );
    }

    // Normal upload flow
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const aiSettings = formData.get("aiSettings") as string;

    console.log(
      "File received:",
      file ? file.name : "null",
      file ? file.type : "null"
    );

    if (!file) {
      console.error("No file provided");
      return NextResponse.json(
        {
          error: "No file provided",
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          userMessage: "Please select a file to upload.",
        },
        { status: 400 }
      );
    }

    // Validate file type for text uploads - be more lenient for testing
    const allowedTypes = ["text/plain", "application/pdf", "text/markdown"];
    const fileExtension = file.name.toLowerCase().split(".").pop();
    const isValidExtension = ["txt", "pdf", "md"].includes(fileExtension || "");

    if (!allowedTypes.includes(file.type) && !isValidExtension) {
      console.error(
        "Invalid file type:",
        file.type,
        "Extension:",
        fileExtension
      );
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Please upload .txt, .pdf, or .md files`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    console.log("Processing file:", file.name, "Size:", file.size);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const textContent = buffer.toString("utf-8");

    // Skip duplicate check - allow users to upload same content
    // (they might want different versions or experiments)

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const storagePath = `${user.id}/${filename}`; // User ID folder for isolation

    console.log("Uploading to Supabase Storage:", storagePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("text-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type || "text/plain",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log(
      "File uploaded to Supabase Storage successfully:",
      uploadData.path
    );

    // Get the storage URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from("text-uploads")
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // Parse AI settings
    const parsedAiSettings = aiSettings ? JSON.parse(aiSettings) : {};

    const mockBookId = `book_${timestamp}`;

    // Generate book title from filename
    const bookTitle = file.name
      .replace(/\.(txt|md|pdf)$/i, "")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // SAVE TO DATABASE
    console.log("Saving work to database for user:", user.id);
    console.log("Work data:", {
      title: bookTitle,
      creator_id: user.id,
      description: `Uploaded from ${file.name}`,
      status: "processing",
      is_public: false,
    });

    // Insert work using admin client to bypass RLS
    const { data: work, error: workError } = await adminClient
      .from("works")
      .insert({
        title: bookTitle,
        creator_id: user.id,
        description: `Uploaded from ${file.name}`,
        status: "processing",
        is_public: false,
      })
      .select()
      .single();

    if (workError) {
      console.error("❌ Error saving work to database:", workError);
      console.error("Error details:", JSON.stringify(workError, null, 2));
      // Don't continue if we can't save to database
      return NextResponse.json(
        {
          error: "Failed to save work to database",
          details:
            workError.message || workError.hint || JSON.stringify(workError),
        },
        { status: 500 }
      );
    }

    console.log("✅ Work saved to database:", work.id);

    // Save upload record using admin client
    const { error: uploadRecordError } = await adminClient
      .from("uploads")
      .insert({
        work_id: work.id,
        user_id: user.id,
        file_name: filename,
        file_path: storagePath, // Supabase Storage path
        file_size: file.size,
        file_type: file.type,
        upload_type: "text",
        status: "published",
      });

    if (uploadRecordError) {
      console.error("Error saving upload record:", uploadRecordError);
    }

    const actualBookId = work.id; // Use database ID

    console.log("Text file uploaded:", {
      filename,
      size: file.size,
      aiSettings: parsedAiSettings,
      bookId: actualBookId,
      workId: work.id,
      storagePath,
    });

    // Get user subscription for TTS provider selection
    const subscription = getUserSubscription(request);
    console.log(`👤 User subscription: ${subscription.tier}`);

    console.log("🎬 Adding TTS job to queue for work:", work.id);

    // Split text into chapters (split by double newline or every 250 chars)
    const chunks = splitTextIntoChunks(textContent, 250);
    console.log(`📚 Split into ${chunks.length} chapters`);

    // Prepare voice settings for queue
    // NOTE: ElevenLabs voice IDs won't work with Coqui - only pass voiceId if it looks like a Coqui file
    const isCoquiVoiceFile =
      parsedAiSettings.voiceId &&
      (parsedAiSettings.voiceId.endsWith(".wav") ||
        parsedAiSettings.voiceId.startsWith("voice"));

    const voiceSettings = {
      voiceId: isCoquiVoiceFile ? parsedAiSettings.voiceId : undefined, // Only pass Coqui voice files
      language: "en",
      temperature: 0.5,
      speed: 0.92,
      speaker: "Claribel Dervla", // Default speaker used when voiceId is undefined
      denoiserStrength: 0.02,
    };

    console.log(`🎙️ Voice settings:`, {
      originalVoiceId: parsedAiSettings.voiceId,
      isCoquiVoiceFile,
      finalVoiceId: voiceSettings.voiceId,
    });

    // Trigger Inngest function for background processing
    try {
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await inngest.send({
        name: "tts/job.created",
        data: {
          jobId,
          workId: work.id,
          userId: user.id,
          chapters: chunks.map((text, index) => ({
            chapterId: `chapter-${index + 1}`,
            text,
            title: `Chapter ${index + 1}`,
          })),
          voiceSettings,
        },
      });

      console.log(`✅ TTS job triggered: ${jobId}`);

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully, TTS processing started",
        bookId: actualBookId,
        workId: work.id,
        jobId, // Return job ID for status polling
        filename,
        filepath: storagePath,
        fileUrl,
      });
    } catch (inngestError: any) {
      console.error("❌ Failed to trigger Inngest job:", inngestError);

      // Inngest failed - return error
      return NextResponse.json(
        {
          success: false,
          error: "Failed to start TTS processing",
          details: inngestError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// OLD FUNCTION REMOVED - Now using queue-based processing
// If needed for fallback, check git history for processWithElevenLabs()
/*
async function processWithElevenLabs(
  textFilePath: string, // Now this is a storage path
  originalFilename: string,
  aiSettings: any,
  bookId: string,
  subscription?: UserSubscription,
  userId?: string,
  workId?: string,
  textContentParam?: string, // Add optional parameter for pre-loaded text
  supabaseClient?: any // Add authenticated Supabase client parameter
) {
  try {
    console.log("Starting TTS processing for:", bookId);

    // Create a service role client for background processing if not provided
    // This is needed because the user's session might expire during long processing
    const supabase = supabaseClient || createAdminClient();

    // Use default subscription if not provided (for backward compatibility)
    const userSubscription = subscription || {
      tier: "free",
      features: {
        useSelfHostedTTS: false,
        maxMonthlyGenerations: 10,
      },
    };

    // Get text content - either from parameter or download from Supabase Storage
    let textContent: string;
    if (textContentParam) {
      textContent = textContentParam;
      console.log("Using provided text content");
    } else {
      console.log("Downloading text from Supabase Storage:", textFilePath);
      const { data, error } = await supabase.storage
        .from("text-uploads")
        .download(textFilePath);

      if (error) {
        throw new Error(`Failed to download text file: ${error.message}`);
      }

      textContent = await data.text();
    }

    // Prepare voice settings from AI settings
    const voiceSettings: VoiceSettings = {
      voiceId:
        aiSettings.voiceId && aiSettings.voiceId !== ""
          ? aiSettings.voiceId
          : "21m00Tcm4TlvDq8ikWAM", // Default to Rachel only if no voice selected
      stability:
        typeof aiSettings.stability === "number" ? aiSettings.stability : 0.75,
      similarityBoost:
        typeof aiSettings.similarityBoost === "number"
          ? aiSettings.similarityBoost
          : 0.75,
      style: typeof aiSettings.style === "number" ? aiSettings.style : 0.0,
      useSpeakerBoost: aiSettings.useSpeakerBoost !== false,
    };

    // Split text into manageable chunks if it's too long
    // Coqui TTS recommends 250 characters per chunk for best quality
    const chunks = splitTextIntoChunks(textContent, 250);
    console.log(`Processing ${chunks.length} text chunks for ${bookId}`);

    // Update work to show we're starting processing
    if (workId && userId) {
      await supabase
        .from("works")
        .update({ progress_percent: 5 })
        .eq("id", workId);
    }

    // Process each chunk and combine audio
    const audioChunks: Buffer[] = [];
    let usedProvider: "elevenlabs" | "chatterbox" | "coqui" | null = null;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} for ${bookId}`);

      // Calculate and update progress (5% to 85% for chunk processing)
      const chunkProgress = Math.floor(5 + (i / chunks.length) * 80);
      if (workId && userId) {
        // Update progress for each chunk for smoother visual feedback
        await supabase
          .from("works")
          .update({ progress_percent: chunkProgress })
          .eq("id", workId);
      }

      // Prepare TTS options
      const ttsOptions: TTSOptions = {
        text: chunk,
        // ElevenLabs options
        voiceId: voiceSettings.voiceId,
        stability: voiceSettings.stability,
        similarityBoost: voiceSettings.similarityBoost,
        style: voiceSettings.style,
        useSpeakerBoost: voiceSettings.useSpeakerBoost,
        // Chatterbox options (defaults)
        exaggeration: 0.5,
        cfgWeight: 0.5,
        languageId: "en",
      };

      // Generate speech using unified service
      const { audio: audioBuffer, provider } = await generateSpeechUnified(
        ttsOptions,
        userSubscription
      );

      if (!usedProvider) {
        usedProvider = provider;
        console.log(`🎙️  Using TTS provider: ${provider}`);
      }

      audioChunks.push(audioBuffer);

      // Small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Combine all audio chunks properly
    // WAV files have headers, so we need to strip headers from all but the first chunk
    let finalAudio: Buffer;

    if (audioChunks.length === 1) {
      // Single chunk, use as-is
      finalAudio = audioChunks[0];
    } else {
      // Multiple chunks - need to combine properly
      console.log(`Combining ${audioChunks.length} audio chunks...`);

      // Keep the first chunk with its header
      const firstChunk = audioChunks[0];

      // For subsequent chunks, strip the WAV header (first 44 bytes)
      const remainingChunks = audioChunks.slice(1).map((chunk) => {
        // WAV header is typically 44 bytes, but check for "data" marker to be safe
        const dataMarkerIndex = chunk.indexOf(Buffer.from("data"));
        if (dataMarkerIndex !== -1) {
          // Skip past "data" marker (4 bytes) and size (4 bytes) to get raw audio
          return chunk.slice(dataMarkerIndex + 8);
        }
        // Fallback: assume standard 44-byte header
        return chunk.slice(44);
      });

      // Concatenate first chunk + all audio data
      finalAudio = Buffer.concat([firstChunk, ...remainingChunks]);

      // Update the file size in the WAV header
      // Bytes 4-7: file size - 8
      const fileSize = finalAudio.length - 8;
      finalAudio.writeUInt32LE(fileSize, 4);

      // Find and update the data chunk size
      const dataMarkerIndex = finalAudio.indexOf(Buffer.from("data"));
      if (dataMarkerIndex !== -1) {
        const dataSize = finalAudio.length - dataMarkerIndex - 8;
        finalAudio.writeUInt32LE(dataSize, dataMarkerIndex + 4);
      }

      console.log(`Combined audio: ${finalAudio.length} bytes`);
    }

    // Update progress: Audio combining complete (85%)
    if (workId && userId) {
      await supabase
        .from("works")
        .update({ progress_percent: 85 })
        .eq("id", workId);
    }

    // Upload the generated audio file to Supabase Storage
    const audioFilename = originalFilename.replace(/\.(txt|md|pdf)$/i, ".mp3");
    const audioStoragePath = `${userId}/${Date.now()}-ai-${audioFilename}`;

    console.log("Uploading audio to Supabase Storage:", audioStoragePath);

    // Update progress: Starting upload (90%)
    if (workId && userId) {
      await supabase
        .from("works")
        .update({ progress_percent: 90 })
        .eq("id", workId);
    }

    const { data: audioUploadData, error: audioUploadError } =
      await supabase.storage
        .from("audiobooks")
        .upload(audioStoragePath, finalAudio, {
          contentType: "audio/mpeg",
          upsert: false,
        });

    if (audioUploadError) {
      console.error("Failed to upload audio to Supabase:", audioUploadError);
      throw new Error(`Failed to upload audio: ${audioUploadError.message}`);
    }

    console.log(
      "Audio uploaded to Supabase Storage successfully:",
      audioUploadData.path
    );

    // Get the public URL for the audio file
    const { data: audioUrlData } = supabase.storage
      .from("audiobooks")
      .getPublicUrl(audioStoragePath);

    const audioPublicUrl = audioUrlData.publicUrl;

    console.log(
      `TTS processing completed for ${bookId} using ${usedProvider}. Audio URL:`,
      audioPublicUrl
    );

    // SAVE AUDIO TO DATABASE
    if (workId && userId) {
      console.log("💾 Saving audio file to database for work:", workId);

      // Update progress: Saving to database (95%)
      const { error: progressError } = await supabase
        .from("works")
        .update({ progress_percent: 95 })
        .eq("id", workId);

      if (progressError) {
        console.error("❌ Error updating progress to 95%:", progressError);
      } else {
        console.log("✅ Progress updated to 95%");
      }

      console.log("📝 Inserting audio file record with:", {
        user_id: userId,
        work_id: workId,
        filename: audioFilename,
        file_path: audioPublicUrl,
        file_size_bytes: finalAudio.length,
        mime_type: "audio/mpeg",
        is_generated: true,
        tts_provider: usedProvider || "coqui",
        storage_bucket: "audiobooks",
        storage_path: audioStoragePath,
      });

      const { data: insertedAudio, error: audioError } = await supabase
        .from("audio_files")
        .insert({
          user_id: userId,
          work_id: workId,
          filename: audioFilename,
          file_path: audioPublicUrl, // Full public URL
          file_size_bytes: finalAudio.length,
          mime_type: "audio/mpeg",
          is_generated: true,
          tts_provider: usedProvider || "coqui",
          storage_bucket: "audiobooks",
          storage_path: audioStoragePath, // Storage path without bucket
        })
        .select();

      if (audioError) {
        console.error("❌ Error saving audio file to database:", audioError);
        console.error(
          "Full error details:",
          JSON.stringify(audioError, null, 2)
        );
      } else {
        console.log("✅ Audio file saved to database successfully");
        console.log("Inserted audio record:", insertedAudio);

        // Update work status to published with 100% progress
        console.log("🎯 Updating work status to published...");
        const { error: updateError } = await supabase
          .from("works")
          .update({
            status: "published",
            progress_percent: 100,
          })
          .eq("id", workId);

        if (updateError) {
          console.error("❌ Error updating work status:", updateError);
          console.error(
            "Full error details:",
            JSON.stringify(updateError, null, 2)
          );
        } else {
          console.log("✅ Work marked as published with 100% progress");
        }
      }
    }
  } catch (error) {
    console.error(`TTS processing failed for ${bookId}:`, error);

    // Update work to show error
    if (workId && userId && supabaseClient) {
      await supabaseClient
        .from("works")
        .update({
          status: "failed",
          progress_percent: 0,
        })
        .eq("id", workId);
    }

    throw error;
  }
}
*/
