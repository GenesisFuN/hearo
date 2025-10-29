import { getSupabaseAdmin } from "./supabase";

export interface AISettings {
  voice?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export async function processTextToSpeech(bookId: string): Promise<void> {
  console.log(`Starting AI text-to-speech processing for book ${bookId}`);

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get book data
    const { data: book, error: fetchError } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (fetchError || !book) {
      throw new Error(`Failed to fetch book: ${fetchError?.message}`);
    }

    console.log(`Processing book: ${book.title}`);

    // Update status to processing
    await supabaseAdmin
      .from("books")
      .update({
        status: "processing",
        progress: 10,
      })
      .eq("id", bookId);

    // Download the text file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("audiobooks")
      .download(book.text_file_url);

    if (downloadError) {
      throw new Error(`Failed to download text file: ${downloadError.message}`);
    }

    const textContent = await fileData.text();
    console.log(`Text content length: ${textContent.length} characters`);

    // Update progress
    await supabaseAdmin.from("books").update({ progress: 25 }).eq("id", bookId);

    // Process with ElevenLabs API
    const audioBuffer = await generateSpeechWithElevenLabs(
      textContent,
      book.ai_settings || {}
    );

    // Update progress
    await supabaseAdmin.from("books").update({ progress: 75 }).eq("id", bookId);

    // Upload the audio file back to storage
    const audioFileName = `books/audio/${bookId}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("audiobooks")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Mark as complete
    await supabaseAdmin
      .from("books")
      .update({
        status: "complete",
        audio_file_url: audioFileName,
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", bookId);

    console.log(
      `Successfully processed book ${bookId} - audio file: ${audioFileName}`
    );
  } catch (error) {
    console.error(`AI Processing failed for book ${bookId}:`, error);

    // Update book status to failed
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from("books")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", bookId);

    throw error;
  }
}

async function generateSpeechWithElevenLabs(
  text: string,
  settings: AISettings
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ElevenLabs API key not configured in environment variables"
    );
  }

  // Default voice ID for Rachel (high quality voice)
  const voiceId = settings.voice || "21m00Tcm4TlvDq8ikWAM";

  console.log(
    `Generating speech with ElevenLabs API for ${text.length} characters`
  );

  // If text is too long, we need to split it into chunks
  const maxChunkSize = 2500; // ElevenLabs character limit
  if (text.length > maxChunkSize) {
    return await processLongText(text, voiceId, settings);
  }

  // Process single chunk
  return await processSingleChunk(text, voiceId, settings);
}

async function processSingleChunk(
  text: string,
  voiceId: string,
  settings: AISettings
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey!,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: settings.stability || 0.5,
          similarity_boost: settings.similarityBoost || 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processLongText(
  text: string,
  voiceId: string,
  settings: AISettings
): Promise<Buffer> {
  console.log("Text is long, splitting into chunks...");

  // Split text into sentences and group them into chunks
  const chunks = splitIntoChunks(text, 2500);
  console.log(`Split text into ${chunks.length} chunks`);

  const audioChunks: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    const audioBuffer = await processSingleChunk(chunks[i], voiceId, settings);
    audioChunks.push(audioBuffer);

    // Small delay to avoid rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Combine audio chunks (simple concatenation for MP3)
  return Buffer.concat(audioChunks);
}

function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWithPeriod = trimmedSentence + ".";

    // If adding this sentence would exceed the limit, save current chunk and start new one
    if (currentChunk.length + sentenceWithPeriod.length + 1 > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentenceWithPeriod;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentenceWithPeriod;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
