import { NextRequest, NextResponse } from "next/server";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // Check if AI processing has completed by looking for the audio file
    const uploadTime = parseInt(bookId.split("_")[1] || "0");
    const currentTime = Date.now();
    const elapsed = currentTime - uploadTime;

    // Check if audio file actually exists in uploads/audio directory
    const audioDir = join(process.cwd(), "uploads", "audio");
    let audioFileExists = false;
    let audioFilename = "";

    try {
      if (existsSync(audioDir)) {
        const files = readdirSync(audioDir);
        // Look for audio files that match this book ID or timestamp
        const matchingFile = files.find(
          (file) =>
            file.includes(bookId.split("_")[1]) &&
            (file.endsWith(".mp3") || file.endsWith(".wav"))
        );
        if (matchingFile) {
          audioFileExists = true;
          audioFilename = matchingFile;
        }
      }
    } catch (err) {
      console.error("Error checking audio directory:", err);
    }

    // Calculate progress and message based on elapsed time
    let status = "processing";
    let progress = Math.min((elapsed / 300000) * 95, 95); // Assume max 5 minutes
    let message = "Generating speech with Coqui TTS...";

    if (audioFileExists) {
      status = "complete";
      progress = 100;
      message = "Audio generation complete!";
    } else if (elapsed < 30000) {
      message = "Preparing text and splitting into chunks...";
      progress = Math.min((elapsed / 30000) * 10, 10);
    } else {
      // Estimate progress based on typical Coqui processing time
      message =
        "Generating speech with Coqui TTS (this may take several minutes)...";
      progress = 10 + Math.min(((elapsed - 30000) / 270000) * 85, 85);
    }

    return NextResponse.json({
      bookId,
      status: audioFileExists ? "complete" : "processing",
      progress,
      message,
      hasAudio: audioFileExists,
      audioFile: audioFilename || undefined,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
