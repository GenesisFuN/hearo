// Example: How to integrate TTS Queue into your existing upload flow
// This shows how to modify your publish/upload API to use the queue

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TTSQueue, getPriorityForUser } from "@/lib/queue";

export async function POST(request: NextRequest) {
try {
// ... (your existing auth code) ...

    const body = await request.json();
    const { title, chapters, genre, coverImage } = body;

    // Step 1: Create the work in database (as before)
    const { data: work, error: workError } = await supabase
      .from("works")
      .insert({
        user_id: user.id,
        title,
        genre,
        cover_image_url: coverImage,
        status: "processing", // ← Set to processing instead of published
      })
      .select()
      .single();

    if (workError) {
      return NextResponse.json({ error: workError.message }, { status: 500 });
    }

    // Step 2: Queue TTS generation (NEW!)
    const jobId = await TTSQueue.addJob(
      {
        workId: work.id,
        userId: user.id,
        jobType: "full_book",
        chapters: chapters.map((ch: any, idx: number) => ({
          chapterId: `ch-${idx + 1}`,
          text: ch.content,
          title: ch.title || `Chapter ${idx + 1}`,
        })),
        voiceSettings: {
          voiceId: user.preferredVoice || "default",
          speed: 1.0,
        },
        metadata: {
          workTitle: title,
          genre,
        },
      },
      getPriorityForUser(user.isPremium || false)
    );

    // Step 3: Store job ID with work (for status checking)
    await supabase
      .from("works")
      .update({ tts_job_id: jobId })
      .eq("id", work.id);

    // Step 4: Return success with job info
    return NextResponse.json({
      success: true,
      work: {
        id: work.id,
        title: work.title,
        status: "processing",
      },
      job: {
        id: jobId,
        status: "pending",
        message: "Your audiobook is being generated. This may take a few minutes.",
      },
    });

} catch (error: any) {
console.error("Upload error:", error);
return NextResponse.json(
{ error: "Failed to upload", details: error.message },
{ status: 500 }
);
}
}

// ============================================
// Example: Status checking endpoint
// GET /api/works/:workId/status
// ============================================

export async function GET(
request: NextRequest,
{ params }: { params: { workId: string } }
) {
try {
const { workId } = params;

    // Get work and job ID
    const { data: work, error } = await supabase
      .from("works")
      .select("id, title, status, tts_job_id")
      .eq("id", workId)
      .single();

    if (error || !work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // If no job ID, return work status
    if (!work.tts_job_id) {
      return NextResponse.json({
        work,
        job: null,
      });
    }

    // Get job status
    const job = await TTSQueue.getJob(work.tts_job_id);

    // If job is completed, update work status
    if (job?.status === "completed" && work.status === "processing") {
      await supabase
        .from("works")
        .update({ status: "published" })
        .eq("id", workId);

      work.status = "published";
    }

    return NextResponse.json({
      work,
      job: job
        ? {
            id: job.id,
            status: job.status,
            progress: job.progressPercent,
            message: job.progressMessage,
            currentChapter: job.currentChapter,
            totalChapters: job.totalChapters,
          }
        : null,
    });

} catch (error: any) {
console.error("Status check error:", error);
return NextResponse.json(
{ error: "Failed to get status", details: error.message },
{ status: 500 }
);
}
}

// ============================================
// Example: UI Component for Upload Status
// ============================================

/\*
// components/UploadStatus.tsx
import { useEffect, useState } from 'react';
import { TTSJob } from '@/lib/queue';

interface UploadStatusProps {
workId: string;
jobId: string;
}

export function UploadStatus({ workId, jobId }: UploadStatusProps) {
const [job, setJob] = useState<TTSJob | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
const pollStatus = async () => {
try {
const res = await fetch(`/api/works/${workId}/status`);
const data = await res.json();
setJob(data.job);

        // Stop polling if completed or failed
        if (data.job?.status === 'completed' || data.job?.status === 'failed') {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);
    pollStatus(); // Initial call

    return () => clearInterval(interval);

}, [workId]);

if (!job) {
return <div>Loading...</div>;
}

return (
<div className="space-y-4">
<h2>Generating Audiobook</h2>

      {job.status === 'pending' && (
        <p>⏳ Waiting in queue...</p>
      )}

      {job.status === 'processing' && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all"
              style={{ width: `${job.progressPercent}%` }}
            />
          </div>
          <p>{job.progressMessage}</p>
          <p className="text-sm text-gray-600">
            Chapter {job.currentChapter} of {job.totalChapters}
          </p>
        </>
      )}

      {job.status === 'completed' && (
        <div className="text-green-600">
          ✅ Audiobook generated successfully!
          <a href={`/works/${workId}`}>View Book</a>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="text-red-600">
          ❌ Generation failed. Please try again.
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
    </div>

);
}
\*/

// ============================================
// Example: Database Schema Update
// ============================================

/\*
-- Add job tracking to works table
ALTER TABLE works
ADD COLUMN IF NOT EXISTS tts_job_id UUID REFERENCES tts_jobs(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
-- status: 'draft', 'processing', 'published', 'failed'

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_works_tts_job_id ON works(tts_job_id);
\*/

// ============================================
// Example: Worker Integration
// ============================================

/\*
// In scripts/tts-worker.ts, replace generateTTS() with:

async function generateTTS(text: string, voiceSettings: any) {
// Call your Coqui/Chatterbox server
const response = await fetch('http://localhost:5000/tts', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
text,
voice: voiceSettings.voiceId || 'default',
speed: voiceSettings.speed || 1.0
})
});

if (!response.ok) {
throw new Error(`TTS API error: ${response.statusText}`);
}

const data = await response.json();

// Upload to Supabase Storage
const audioBuffer = await fetch(data.audioUrl).then(r => r.arrayBuffer());
const fileName = `${Date.now()}_${Math.random().toString(36)}.mp3`;

const { data: uploadData, error } = await supabase.storage
.from('audio-files')
.upload(fileName, audioBuffer, {
contentType: 'audio/mpeg'
});

if (error) throw error;

return {
audioFileId: uploadData.path,
duration: data.duration
};
}
\*/
