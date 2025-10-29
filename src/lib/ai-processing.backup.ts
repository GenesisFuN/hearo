import { getSupabaseAdmin } from './supabase';

export interface AISettings {
  voice?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export async function processTextToSpeech(bookId: string): Promise<void> {
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

    // Download text file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("audiobooks")
      .download(book.text_file_url);

    if (downloadError) {
      throw new Error(`Failed to download text file: ${downloadError.message}`);
    }

    const textContent = await fileData.text();
    
    // Split text into chunks (ElevenLabs has character limits)
    const chunks = splitTextIntoChunks(textContent, 2500); // Conservative limit
    
    // Process each chunk with ElevenLabs
    const audioChunks: Blob[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} for book ${bookId}`);
      
      const audioBlob = await generateSpeech(chunks[i], book.ai_settings || {});
      audioChunks.push(audioBlob);
      
      // Update progress
      const progress = Math.round(((i + 1) / chunks.length) * 100);
      await supabaseAdmin
        .from("books")
        .update({ progress })
        .eq("id", bookId);
    }

    // Combine audio chunks into single file
    const finalAudio = await combineAudioChunks(audioChunks);
    
    // Upload final audio to storage
    const audioFileName = `books/audio/${bookId}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("audiobooks")
      .upload(audioFileName, finalAudio, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Update book status to complete
    await supabaseAdmin
      .from("books")
      .update({
        status: "complete",
        audio_file_url: audioFileName,
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq("id", bookId);

    console.log(`Successfully processed book ${bookId}`);
    
  } catch (error) {
    console.error(`AI Processing failed for book ${bookId}:`, error);
    
    // Update book status to failed
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from("books")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error)
      })
      .eq("id", bookId);
      
    throw error;
  }
}

async function generateSpeech(text: string, settings: AISettings): Promise<Blob> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  // Default voice ID for Rachel (you can change this)
  const voiceId = settings.voice || "21m00Tcm4TlvDq8ikWAM";
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarityBoost || 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.blob();
}

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    const sentenceWithPunctuation = trimmedSentence + '.';
    
    if (currentChunk.length + sentenceWithPunctuation.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If single sentence is too long, split by words
      if (sentenceWithPunctuation.length > maxChunkSize) {
        const words = sentenceWithPunctuation.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChunkSize) {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = '';
            }
          }
          wordChunk += (wordChunk ? ' ' : '') + word;
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      } else {
        currentChunk = sentenceWithPunctuation;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function combineAudioChunks(chunks: Blob[]): Promise<Blob> {
  // For now, we'll just concatenate the chunks
  // In production, you might want to use a more sophisticated audio merging library
  return new Blob(chunks, { type: 'audio/mpeg' });
}