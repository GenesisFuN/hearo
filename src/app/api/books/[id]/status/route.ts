import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workId } = await params;

    console.log(`📊 Checking status for work: ${workId}`);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch work from database
    const { data: work, error } = await supabase
      .from("works")
      .select("id, status, progress_percent")
      .eq("id", workId)
      .single();

    if (error || !work) {
      console.error(`❌ Work not found: ${workId}`, error);
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    console.log(
      `✅ Found work: ${work.id}, status: ${work.status}, progress: ${work.progress_percent}%`
    );

    // Map database status to response
    const progress = work.progress_percent || 0;
    const status = work.status; // "processing", "published", "failed"

    let message = "Processing...";
    if (status === "published") {
      message = "Audio generation complete!";
    } else if (status === "failed") {
      message = "Processing failed";
    } else if (progress < 10) {
      message = "Preparing text and splitting into chunks...";
    } else if (progress < 95) {
      message = "Generating speech with RunPod TTS...";
    } else {
      message = "Finalizing and uploading audio...";
    }

    return NextResponse.json({
      bookId: workId,
      status,
      progress,
      message,
      hasAudio: status === "published",
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
