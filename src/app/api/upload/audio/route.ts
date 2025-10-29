import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type for audio uploads
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a"];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(mp3|wav|m4a)$/i)
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload .mp3, .wav, or .m4a files" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "audio");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // In a real app, you would:
    // 1. Save file info to database
    // 2. Process audio (normalize, convert, etc.)
    // 3. Generate chapters/metadata

    const mockBookId = `audiobook_${timestamp}`;

    console.log("Audio file uploaded:", {
      filename,
      size: file.size,
      type: file.type,
      bookId: mockBookId,
    });

    return NextResponse.json({
      success: true,
      message: "Audio file uploaded successfully",
      bookId: mockBookId,
      filename,
      filepath: `/uploads/audio/${filename}`,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload audio file" },
      { status: 500 }
    );
  }
}
