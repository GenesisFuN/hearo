import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * API endpoint to check and track progress for secret achievements
 * Called during playback sessions to detect special listening patterns
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { sessionData } = body;

    // Get all secret achievements
    const { data: secretAchievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("is_secret", true);

    if (!secretAchievements || secretAchievements.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    const newlyUnlocked: string[] = [];

    // Check each secret achievement
    for (const achievement of secretAchievements) {
      // Skip if already unlocked
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_id", achievement.id)
        .single();

      if (existing) continue;

      let shouldUnlock = false;

      // Check specific achievement types
      switch (achievement.requirement_type) {
        case "night_sessions": {
          // Night Owl: Listen between 12 AM - 4 AM for X nights
          const { data: nightSessions } = await supabase
            .from("playback_sessions")
            .select("session_start, created_at")
            .eq("user_id", userId)
            .gte("actual_listening_seconds", 600); // At least 10 minutes

          const uniqueNights = new Set<string>();
          nightSessions?.forEach((session) => {
            const timestamp = new Date(
              session.session_start || session.created_at
            );
            const hour = timestamp.getHours();
            // Between midnight and 4 AM
            if (hour >= 0 && hour < 4) {
              const dateKey = timestamp.toISOString().split("T")[0];
              uniqueNights.add(dateKey);
            }
          });

          if (uniqueNights.size >= achievement.requirement_value) {
            shouldUnlock = true;
          }
          break;
        }

        case "morning_sessions": {
          // Early Bird: Listen between 5 AM - 7 AM for X mornings
          const { data: morningSessions } = await supabase
            .from("playback_sessions")
            .select("session_start, created_at")
            .eq("user_id", userId)
            .gte("actual_listening_seconds", 600);

          const uniqueMornings = new Set<string>();
          morningSessions?.forEach((session) => {
            const timestamp = new Date(
              session.session_start || session.created_at
            );
            const hour = timestamp.getHours();
            if (hour >= 5 && hour < 7) {
              const dateKey = timestamp.toISOString().split("T")[0];
              uniqueMornings.add(dateKey);
            }
          });

          if (uniqueMornings.size >= achievement.requirement_value) {
            shouldUnlock = true;
          }
          break;
        }

        case "session_length": {
          // Marathon Listener: Listen for X hours in a single session
          const { data: longSessions } = await supabase
            .from("playback_sessions")
            .select("actual_listening_seconds")
            .eq("user_id", userId)
            .gte(
              "actual_listening_seconds",
              achievement.requirement_value * 3600
            );

          if (longSessions && longSessions.length > 0) {
            shouldUnlock = true;
          }
          break;
        }

        case "weekend_books": {
          // Weekend Warrior: Complete X books entirely on weekends
          const { data: sessions } = await supabase
            .from("playback_sessions")
            .select(
              "book_id, session_start, session_end, progress_seconds, duration_seconds"
            )
            .eq("user_id", userId)
            .not("book_id", "is", null);

          // Group by book and check if completed on weekend
          const bookSessions = new Map<string, any[]>();
          sessions?.forEach((s) => {
            if (!bookSessions.has(s.book_id)) {
              bookSessions.set(s.book_id, []);
            }
            bookSessions.get(s.book_id)!.push(s);
          });

          let weekendBooks = 0;
          for (const [bookId, sessions] of bookSessions) {
            // Check if book was completed (95%+)
            const lastSession = sessions[sessions.length - 1];
            if (lastSession.duration_seconds && lastSession.progress_seconds) {
              const completion =
                lastSession.progress_seconds / lastSession.duration_seconds;
              if (completion >= 0.95) {
                // Check if completion happened on weekend
                const completionDate = new Date(
                  lastSession.session_end || lastSession.session_start
                );
                const dayOfWeek = completionDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                  // Sunday or Saturday
                  weekendBooks++;
                }
              }
            }
          }

          if (weekendBooks >= achievement.requirement_value) {
            shouldUnlock = true;
          }
          break;
        }

        case "speed_book": {
          // Speed Reader: Listen to entire book at 2x+ speed
          // This would require tracking playback speed in sessions
          // For now, we'll skip this until we add speed tracking
          break;
        }

        case "midnight_finish": {
          // Midnight Reader: Finish a book between 11 PM - 1 AM
          const { data: completions } = await supabase
            .from("playback_sessions")
            .select("session_end, progress_seconds, duration_seconds")
            .eq("user_id", userId)
            .not("session_end", "is", null);

          let midnightFinish = false;
          completions?.forEach((session) => {
            if (session.duration_seconds && session.progress_seconds) {
              const completion =
                session.progress_seconds / session.duration_seconds;
              if (completion >= 0.95) {
                const endTime = new Date(session.session_end);
                const hour = endTime.getHours();
                // Between 11 PM and 1 AM (23:00-01:00)
                if (hour === 23 || hour === 0) {
                  midnightFinish = true;
                }
              }
            }
          });

          if (midnightFinish) {
            shouldUnlock = true;
          }
          break;
        }

        case "genre_variety": {
          // Genre Explorer: Listen to at least 1 book from each genre
          const { data: completedBooks } = await supabase
            .from("playback_sessions")
            .select(
              `
              book_id,
              progress_seconds,
              duration_seconds,
              works!inner(genre)
            `
            )
            .eq("user_id", userId)
            .not("works.genre", "is", null);

          // Filter to completed books (95%+) and collect unique genres
          const uniqueGenres = new Set<string>();
          completedBooks?.forEach((session: any) => {
            if (session.duration_seconds && session.progress_seconds) {
              const completion =
                session.progress_seconds / session.duration_seconds;
              if (completion >= 0.95 && session.works?.genre) {
                uniqueGenres.add(session.works.genre.toLowerCase());
              }
            }
          });

          // Get total available genres
          const { data: allGenres } = await supabase
            .from("works")
            .select("genre")
            .not("genre", "is", null);

          const totalGenres = new Set(
            allGenres?.map((w: any) => w.genre.toLowerCase()).filter(Boolean)
          );

          // Unlock if user has listened to all available genres
          if (uniqueGenres.size >= totalGenres.size && totalGenres.size > 0) {
            shouldUnlock = true;
          }
          break;
        }
      }

      // Unlock the achievement if conditions met
      if (shouldUnlock) {
        const { error } = await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString(),
        });

        if (!error) {
          console.log(`🎉 Secret achievement unlocked: ${achievement.name}`);
          newlyUnlocked.push(achievement.name);
        }
      }
    }

    return NextResponse.json({
      checked: secretAchievements.length,
      newlyUnlocked,
    });
  } catch (error) {
    console.error("Error checking secret achievements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
