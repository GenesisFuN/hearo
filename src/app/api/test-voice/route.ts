import { NextRequest, NextResponse } from "next/server";
import { generateSpeech, type VoiceSettings } from "../../../lib/elevenlabs";

export async function POST(request: NextRequest) {
  try {
    const { text, voiceSettings } = await request.json();

    console.log("VOICE TEST DEBUG - Received request:", {
      text: text.substring(0, 50) + "...",
      voiceSettings,
    });

    // Generate speech with the selected voice
    const audioBuffer = await generateSpeech(text, voiceSettings);

    console.log(
      "VOICE TEST DEBUG - Generated audio buffer size:",
      audioBuffer.length
    );

    // Return the audio file
    return new NextResponse(audioBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Voice test error:", error);
    return NextResponse.json(
      { error: "Failed to generate test audio" },
      { status: 500 }
    );
  }
}
