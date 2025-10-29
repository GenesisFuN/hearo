import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query books with saved progress
    // Only include books that are in progress (>0% and <95% complete)
    const { data: progressData, error: progressError } = await supabase
      .from("playback_sessions")
      .select(
        `
        work_id,
        progress_seconds,
        duration_seconds,
        completion_percentage,
        updated_at,
        works (
          id,
          title,
          description,
          genre,
          cover_image,
          is_public,
          created_at,
          creator_id,
          profiles (
            username,
            display_name
          ),
          audio_files (
            file_path
          )
        )
      `
      )
      .eq("user_id", user.id)
      .gt("progress_seconds", 0) // Has started listening
      .order("updated_at", { ascending: false });

    if (progressError) {
      console.error("Error fetching continue listening:", progressError);
      return NextResponse.json(
        { error: "Failed to fetch continue listening" },
        { status: 500 }
      );
    }

    // Filter and format the results
    const continueListening =
      progressData
        ?.filter((item: any) => {
          if (
            !item.works ||
            !item.duration_seconds ||
            item.duration_seconds === 0
          )
            return false;

          // Calculate completion percentage (use stored value or calculate)
          const progress =
            item.completion_percentage ||
            (item.progress_seconds / item.duration_seconds) * 100;

          // Only include books that are in progress (not finished)
          // Consider <95% as "in progress" to catch near-complete books
          return progress > 0 && progress < 95;
        })
        .map((item: any) => {
          const work = item.works as any;
          const profile = work.profiles as any;
          const progress =
            item.completion_percentage ||
            (item.progress_seconds / item.duration_seconds) * 100;

          return {
            id: work.id,
            title: work.title,
            description: work.description,
            genre: work.genre,
            coverImage: work.cover_image,
            audioPath: work.audio_files?.[0]?.file_path,
            artist:
              profile?.display_name || profile?.username || "Unknown Artist",
            creatorId: work.creator_id,
            creatorUsername: profile?.username,
            currentTime: item.progress_seconds,
            duration: item.duration_seconds,
            progress: Math.round(progress),
            lastListened: item.last_updated,
          };
        }) || [];

    return NextResponse.json({ books: continueListening });
  } catch (error) {
    console.error("Error in continue-listening API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
