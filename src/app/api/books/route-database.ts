import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required - please sign in" },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid authentication - please sign in again" },
        { status: 401 }
      );
    }

    console.log("Fetching books for user:", user.id);

    // Query works table - RLS will automatically filter to user's works
    const { data: works, error: worksError } = await supabase
      .from("works")
      .select(
        `
        id,
        title,
        description,
        cover_image_url,
        status,
        is_public,
        created_at,
        audio_files (
          id,
          file_url,
          duration,
          status
        )
      `
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (worksError) {
      console.error("Error fetching works:", worksError);
      return NextResponse.json(
        { error: "Failed to fetch books from database" },
        { status: 500 }
      );
    }

    console.log(`Found ${works?.length || 0} works for user ${user.id}`);

    // Transform to match expected format
    const books = (works || []).map((work: any) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      coverImage: work.cover_image_url,
      type: work.audio_files?.length > 0 ? "audio" : "text",
      status: work.status,
      isPublic: work.is_public,
      hasAudio: work.audio_files?.length > 0,
      audioPath: work.audio_files?.[0]?.file_url,
      createdAt: work.created_at,
    }));

    return NextResponse.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}
