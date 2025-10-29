/**
 * Coqui TTS Health Check API Route
 * Proxies requests to avoid CORS issues
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const coquiUrl = process.env.COQUI_SERVER_URL || "http://localhost:8000";
    const response = await fetch(`${coquiUrl}/health`);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Coqui server returned error", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to connect to Coqui server",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
