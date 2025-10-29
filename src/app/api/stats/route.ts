import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
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
      console.error("❌ User auth error:", userError);
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    console.log("📊 Fetching stats for user:", user.id);

    const userId = user.id;

    console.log("📊 Step 1: Fetching playback_sessions for user:", userId);

    // Calculate stats from playback_sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("playback_sessions")
      .select(
        "work_id, progress_seconds, duration_seconds, created_at, session_start, session_end, actual_listening_seconds"
      )
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("❌ Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions", details: sessionsError.message },
        { status: 500 }
      );
    }

    console.log("✅ Sessions fetched:", sessions?.length || 0);

    // Calculate total listening time using actual_listening_seconds (skip-proof)
    // This tracks real time spent listening, not just progress position
    const totalListeningSeconds =
      sessions?.reduce((sum, s) => {
        // Use actual_listening_seconds if available (new tracking system)
        if (
          s.actual_listening_seconds != null &&
          s.actual_listening_seconds > 0
        ) {
          return sum + s.actual_listening_seconds;
        }

        // Fallback for old sessions without actual_listening_seconds
        // Use timestamp-based validation
        if (!s.progress_seconds) return sum;

        if (s.session_start && s.session_end) {
          const sessionDurationMs =
            new Date(s.session_end).getTime() -
            new Date(s.session_start).getTime();
          const sessionDurationSeconds = Math.max(0, sessionDurationMs / 1000);

          // Use the MINIMUM of progress_seconds and actual session time * 2
          // This allows up to 2x speed (our maximum playback speed)
          const maxAllowedProgress = sessionDurationSeconds * 2;
          const validProgress = Math.min(
            s.progress_seconds,
            maxAllowedProgress
          );

          if (validProgress < s.progress_seconds) {
            console.log(
              `⚠️ Adjusted suspicious progress: ${s.progress_seconds}s -> ${validProgress}s`
            );
          }

          return sum + validProgress;
        }

        // If no timestamp data, accept the progress value (legacy data)
        return sum + s.progress_seconds;
      }, 0) || 0;

    // Calculate books completed (progress >= 95% AND realistic listening time)
    // Anti-cheat: Only count if session duration is at least 50% of content duration
    // This prevents someone from skipping through an entire 10-hour book in 5 minutes
    // Anti-cheat: Only count UNIQUE books (prevent re-completing same book to inflate stats)
    const completedBookIds = new Set<string>();

    sessions?.forEach((s) => {
      if (!s.duration_seconds || !s.progress_seconds) return;

      const completionRate = s.progress_seconds / s.duration_seconds;

      // Must have listened to at least 95% of the book
      if (completionRate < 0.95) return;

      // Anti-cheat: Calculate actual time spent in session
      // If session has timestamps, verify realistic listening time
      if (s.session_start && s.session_end) {
        const sessionDurationMs =
          new Date(s.session_end).getTime() -
          new Date(s.session_start).getTime();
        const sessionDurationSeconds = sessionDurationMs / 1000;

        // Actual session time must be at least 50% of content duration
        // (allows for 2x speed listening, which is our maximum)
        const minRequiredTime = s.duration_seconds * 0.5;

        if (sessionDurationSeconds < minRequiredTime) {
          console.log(
            `🚫 Suspicious completion detected: ${s.work_id} (${sessionDurationSeconds}s / ${s.duration_seconds}s)`
          );
          return;
        }
      }

      // Add to completed books set (automatically prevents duplicates)
      completedBookIds.add(s.work_id);
    });

    const booksCompleted = completedBookIds.size;

    // Calculate books started
    const uniqueBooks = new Set(sessions?.map((s) => s.work_id) || []);
    const booksStarted = uniqueBooks.size;

    // Calculate streaks
    const listenedDates = [
      ...new Set(
        sessions?.map((s) => new Date(s.created_at).toISOString().split("T")[0])
      ),
    ].sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // Calculate current streak (must include today or yesterday)
    if (listenedDates.length > 0) {
      const mostRecentDate = listenedDates[listenedDates.length - 1];

      if (mostRecentDate === today || mostRecentDate === yesterday) {
        let checkDate = new Date(mostRecentDate);
        let streak = 1;

        for (let i = listenedDates.length - 2; i >= 0; i--) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDate = checkDate.toISOString().split("T")[0];

          if (listenedDates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
        currentStreak = streak;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < listenedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(listenedDates[i - 1]);
        const currDate = new Date(listenedDates[i]);
        const diffDays = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / 86400000
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    console.log("📊 Step 2: Fetching user achievements");

    // Get user's unlocked achievements
    const { data: unlockedAchievements, error: achievementsError } =
      await supabase
        .from("user_achievements")
        .select(
          `
        *,
        achievement:achievements(*)
      `
        )
        .eq("user_id", userId);

    if (achievementsError) {
      console.error("❌ Error fetching user achievements:", achievementsError);
      return NextResponse.json(
        {
          error: "Failed to fetch user achievements",
          details: achievementsError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "✅ User achievements fetched:",
      unlockedAchievements?.length || 0
    );
    console.log("📊 Step 3: Fetching all achievements");

    // Get all available achievements
    const { data: allAchievements, error: allAchievementsError } =
      await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

    if (allAchievementsError) {
      console.error(
        "❌ Error fetching all achievements:",
        allAchievementsError
      );
      return NextResponse.json(
        {
          error: "Failed to fetch achievements",
          details: allAchievementsError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ All achievements fetched:", allAchievements?.length || 0);

    // If no achievements found, return error to help debugging
    if (!allAchievements || allAchievements.length === 0) {
      console.error(
        "No achievements found in database. Please run listening-stats-schema.sql"
      );
      return NextResponse.json({
        totalListeningSeconds,
        totalHours: Math.floor(totalListeningSeconds / 3600),
        totalMinutes: Math.floor((totalListeningSeconds % 3600) / 60),
        booksCompleted,
        booksStarted,
        currentStreak,
        longestStreak,
        achievements: [],
        unlockedCount: 0,
        error: "No achievements configured. Please run the database migration.",
      });
    }

    // Calculate progress toward next achievements
    const stats = {
      hours: Math.floor(totalListeningSeconds / 3600),
      books: booksCompleted,
      streak_days: currentStreak,
    };

    // Get engagement stats (likes and comments)
    const { data: likesData } = await supabase
      .from("book_likes")
      .select("book_id")
      .eq("user_id", userId);

    const { data: commentsData } = await supabase
      .from("book_comments")
      .select("id")
      .eq("user_id", userId);

    const uniqueLikes = new Set(likesData?.map((l) => l.book_id)).size;
    const totalComments = commentsData?.length || 0;

    const achievementsWithProgress = allAchievements?.map((achievement) => {
      const unlocked = unlockedAchievements?.some(
        (ua: any) => ua.achievement_id === achievement.id
      );

      let currentValue = 0;
      if (achievement.requirement_type === "hours") {
        currentValue = stats.hours;
      } else if (achievement.requirement_type === "books") {
        currentValue = stats.books;
      } else if (achievement.requirement_type === "streak_days") {
        currentValue = stats.streak_days;
      } else if (achievement.requirement_type === "likes") {
        currentValue = uniqueLikes;
      } else if (achievement.requirement_type === "comments") {
        currentValue = totalComments;
      }

      const progress = Math.min(
        100,
        (currentValue / achievement.requirement_value) * 100
      );

      // Mask secret achievements if they're locked
      if (achievement.is_secret && !unlocked) {
        return {
          ...achievement,
          name: "???",
          description: "Secret Achievement - Unlock to reveal!",
          unlocked,
          progress,
          currentValue,
        };
      }

      return {
        ...achievement,
        unlocked,
        progress,
        currentValue,
      };
    });

    // Auto-unlock achievements that have been completed but not yet in user_achievements
    console.log("📊 Step 4: Auto-unlocking completed achievements");
    const newlyUnlocked: string[] = [];

    for (const achievement of achievementsWithProgress || []) {
      if (!achievement.unlocked && achievement.progress >= 100) {
        // Achievement is complete but not unlocked yet - unlock it!
        console.log(`🎉 Auto-unlocking achievement: ${achievement.name}`);

        const { error: unlockError } = await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            unlocked_at: new Date().toISOString(),
          });

        if (unlockError) {
          console.error(
            `❌ Failed to unlock ${achievement.name}:`,
            unlockError
          );
        } else {
          achievement.unlocked = true; // Update in memory
          newlyUnlocked.push(achievement.name);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      console.log(
        `✅ Newly unlocked ${newlyUnlocked.length} achievements:`,
        newlyUnlocked
      );
    }

    const response = {
      totalListeningSeconds,
      totalHours: Math.floor(totalListeningSeconds / 3600),
      totalMinutes: Math.floor((totalListeningSeconds % 3600) / 60),
      booksCompleted,
      booksStarted,
      currentStreak,
      longestStreak,
      achievements: achievementsWithProgress || [],
      unlockedCount:
        achievementsWithProgress?.filter((a) => a.unlocked).length || 0,
      newlyUnlocked, // Send newly unlocked achievements to show notifications
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
