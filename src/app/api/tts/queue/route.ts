// API endpoint to queue TTS generation
// POST /api/tts/queue

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TTSQueue, getPriorityForUser } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { workId, chapters, voiceSettings, jobType = "full_book" } = body;

    if (!workId || !chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: "Missing required fields: workId, chapters" },
        { status: 400 }
      );
    }

    // Verify user owns this work
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("id, user_id, title")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    if (work.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't own this work" },
        { status: 403 }
      );
    }

    // Check if there's already a pending/processing job for this work
    const existingJobs = await TTSQueue.getUserJobs(user.id, 50);
    const activeJob = existingJobs.find(
      (job) =>
        job.workId === workId &&
        (job.status === "pending" || job.status === "processing")
    );

    if (activeJob) {
      return NextResponse.json(
        {
          error: "There's already an active job for this work",
          jobId: activeJob.id,
          status: activeJob.status,
        },
        { status: 409 }
      );
    }

    // Get user's premium status (you'll need to add this to your profiles table)
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium || false;

    // Add job to queue
    const jobId = await TTSQueue.addJob(
      {
        workId,
        userId: user.id,
        jobType,
        chapters: chapters.map((ch: any) => ({
          chapterId: ch.id || ch.chapterId,
          text: ch.text,
          title: ch.title || `Chapter ${ch.number || ""}`,
        })),
        voiceSettings: voiceSettings || {},
        metadata: {
          workTitle: work.title,
        },
      },
      getPriorityForUser(isPremium)
    );

    // Get the created job
    const job = await TTSQueue.getJob(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      job,
      message: `Job queued successfully. ${chapters.length} chapters will be processed.`,
    });
  } catch (error: any) {
    console.error("Failed to queue TTS job:", error);
    return NextResponse.json(
      { error: "Failed to queue job", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/tts/queue?jobId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const userId = searchParams.get("userId");

    // Get auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get specific job
    if (jobId) {
      const job = await TTSQueue.getJob(jobId);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Verify user owns this job
      if (job.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json({ job });
    }

    // Get user's jobs
    const jobs = await TTSQueue.getUserJobs(userId || user.id);

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Failed to get TTS jobs:", error);
    return NextResponse.json(
      { error: "Failed to get jobs", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tts/queue?jobId=xxx (cancel job)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    // Get auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns this job
    const job = await TTSQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel the job
    await TTSQueue.cancelJob(jobId);

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error: any) {
    console.error("Failed to cancel TTS job:", error);
    return NextResponse.json(
      { error: "Failed to cancel job", details: error.message },
      { status: 500 }
    );
  }
}
