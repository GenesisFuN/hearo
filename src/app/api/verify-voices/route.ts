import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch voices from ElevenLabs" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Filter to only our configured voices
    const configuredVoices = [
      "21m00Tcm4TlvDq8ikWAM", // Rachel
      "AZnzlk1XvdvUeBnXmlld", // Domi
      "EXAVITQu4vr4xnSDxMaL", // Bella
      "ErXwobaYiN019PkySvjV", // Antoni
      "VR6AewLTigWG4xSOukaG", // Arnold
      "pNInz6obpgDQGcFmaJgB", // Adam
      "yoZ06aMxZJJ28mfd3POQ", // Sam
      "CYw3kZ02Hs0563khs1Fj", // Emily
    ];

    const ourVoices =
      data.voices?.filter((voice: any) =>
        configuredVoices.includes(voice.voice_id)
      ) || [];

    return NextResponse.json({
      success: true,
      voices: ourVoices,
      totalAvailable: data.voices?.length || 0,
    });
  } catch (error) {
    console.error("Voice verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify voices" },
      { status: 500 }
    );
  }
}
