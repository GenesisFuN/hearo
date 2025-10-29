import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;

    // Security: only allow access to uploads directory
    if (!path || path.length < 2) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const [type, filename] = path;

    if (type !== "text" && type !== "audio") {
      return new NextResponse("Invalid file type", { status: 400 });
    }

    const filePath = join(process.cwd(), "uploads", type, filename);

    try {
      const fileBuffer = await readFile(filePath);

      // Set appropriate content type
      let contentType = "application/octet-stream";
      if (type === "audio") {
        if (filename.endsWith(".mp3")) {
          contentType = "audio/mpeg";
        } else if (filename.endsWith(".wav")) {
          contentType = "audio/wav";
        } else if (filename.endsWith(".m4a")) {
          contentType = "audio/mp4";
        }
      } else if (type === "text") {
        contentType = "text/plain";
      }

      const response = new Response(new Uint8Array(fileBuffer));
      response.headers.set("Content-Type", contentType);
      response.headers.set("Content-Length", fileBuffer.length.toString());
      response.headers.set("Accept-Ranges", "bytes"); // Enable seeking
      response.headers.set("Cache-Control", "public, max-age=31536000");

      return response;
    } catch (fileError) {
      console.error("File not found:", filePath);
      return new NextResponse("File not found", { status: 404 });
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
