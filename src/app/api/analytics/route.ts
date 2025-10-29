import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const getAuthenticatedClient = (token: string) => {
  return createClient(
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
};

// GET - Fetch analytics overview for creator
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedClient = getAuthenticatedClient(token);
    const {
      data: { user },
      error: authError,
    } = await authenticatedClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (workId) {
      // Get analytics for specific work
      return await getWorkAnalytics(user.id, workId, startDate);
    } else {
      // Get overall analytics for all creator's works
      return await getOverallAnalytics(user.id, startDate);
    }
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getOverallAnalytics(userId: string, startDate: Date) {
  // Get all works by creator
  const { data: works } = await supabaseAdmin
    .from("works")
    .select(
      "id, title, views_count, likes_count, comments_count, average_rating"
    )
    .eq("creator_id", userId)
    .eq("status", "published");

  if (!works || works.length === 0) {
    return NextResponse.json({
      success: true,
      overview: {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalBooks: 0,
        publishedBooks: 0,
        averageRating: 0,
        followersCount: 0,
        followingCount: 0,
      },
      chartData: [],
      topBooks: [],
      recentActivity: [],
    });
  }

  const workIds = works.map((w) => w.id);

  // Get ALL event counts (not filtered by date) for overview stats
  const { data: allEventCounts } = await supabaseAdmin
    .from("analytics_events")
    .select("event_type, work_id")
    .in("work_id", workIds);

  const totalViews = (allEventCounts || []).filter(
    (e) => e.event_type === "view"
  ).length;
  const totalLikes = (allEventCounts || []).filter(
    (e) => e.event_type === "like"
  ).length;
  const totalComments = (allEventCounts || []).filter(
    (e) => e.event_type === "comment"
  ).length;

  // Calculate completion rate
  const totalPlays = (allEventCounts || []).filter(
    (e) => e.event_type === "play_start"
  ).length;
  const totalCompletions = (allEventCounts || []).filter(
    (e) => e.event_type === "play_complete"
  ).length;
  const completionRate =
    totalPlays > 0 ? (totalCompletions / totalPlays) * 100 : 0;

  // Get event counts for the date range (for charts and time-based stats)
  const { data: eventCounts } = await supabaseAdmin
    .from("analytics_events")
    .select("event_type, work_id, created_at")
    .in("work_id", workIds)
    .gte("created_at", startDate.toISOString());

  const avgRating =
    works.reduce((sum, w) => sum + (w.average_rating || 0), 0) / works.length;

  // Generate chart data from raw events (real-time aggregation)
  const statsByDate: Record<string, any> = {};

  (eventCounts || []).forEach((event: any) => {
    const date = new Date(event.created_at).toISOString().split("T")[0];
    if (!statsByDate[date]) {
      statsByDate[date] = {
        date,
        views: 0,
        plays: 0,
        completions: 0,
        likes: 0,
        comments: 0,
      };
    }
    if (event.event_type === "view") statsByDate[date].views++;
    if (event.event_type === "play_start") statsByDate[date].plays++;
    if (event.event_type === "play_complete") statsByDate[date].completions++;
    if (event.event_type === "like") statsByDate[date].likes++;
    if (event.event_type === "comment") statsByDate[date].comments++;
  });

  const chartData = Object.values(statsByDate)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((stat: any) => ({
      date: stat.date,
      views: stat.views,
      plays: stat.plays,
      completions: stat.completions,
    }));

  // Get top performing books by counting ALL events (not filtered by date)
  const workStats: Record<
    string,
    { views: number; likes: number; comments: number }
  > = {};
  works.forEach((work) => {
    workStats[work.id] = { views: 0, likes: 0, comments: 0 };
  });

  (allEventCounts || []).forEach((event: any) => {
    if (workStats[event.work_id]) {
      if (event.event_type === "view") workStats[event.work_id].views++;
      if (event.event_type === "like") workStats[event.work_id].likes++;
      if (event.event_type === "comment") workStats[event.work_id].comments++;
    }
  });

  const topBooks = works
    .map((work) => ({
      id: work.id,
      title: work.title,
      views: workStats[work.id].views,
      likes: workStats[work.id].likes,
      comments: workStats[work.id].comments,
      rating: work.average_rating || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Get recent analytics events
  const { data: recentEvents } = await supabaseAdmin
    .from("analytics_events")
    .select("*")
    .in("work_id", workIds)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get follower stats
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("followers_count, following_count")
    .eq("id", userId)
    .single();

  return NextResponse.json({
    success: true,
    overview: {
      totalViews,
      totalLikes,
      totalComments,
      totalPlays,
      totalCompletions,
      completionRate,
      totalBooks: works.length,
      publishedBooks: works.length, // All fetched works are published
      averageRating: avgRating,
      followersCount: profile?.followers_count || 0,
      followingCount: profile?.following_count || 0,
    },
    chartData,
    topBooks,
    recentActivity: (recentEvents || []).slice(0, 20).map((event: any) => ({
      eventType: event.event_type,
      workId: event.work_id,
      timestamp: event.created_at,
      data: event.event_data,
    })),
  });
}

async function getWorkAnalytics(
  userId: string,
  workId: string,
  startDate: Date
) {
  // Verify ownership
  const { data: work } = await supabaseAdmin
    .from("works")
    .select(
      "id, title, creator_id, views_count, likes_count, comments_count, average_rating"
    )
    .eq("id", workId)
    .single();

  if (!work || work.creator_id !== userId) {
    return NextResponse.json(
      { error: "Work not found or access denied" },
      { status: 403 }
    );
  }

  // Get daily stats
  const { data: dailyStats } = await supabaseAdmin
    .from("daily_stats")
    .select("*")
    .eq("work_id", workId)
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: true });

  // Get playback sessions
  const { data: sessions } = await supabaseAdmin
    .from("playback_sessions")
    .select("*")
    .eq("work_id", workId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  // Calculate completion rate
  const completedSessions = (sessions || []).filter(
    (s: any) => s.is_completed
  ).length;
  const completionRate =
    sessions && sessions.length > 0
      ? (completedSessions / sessions.length) * 100
      : 0;

  // Calculate average listen time
  const totalListenTime = (sessions || []).reduce(
    (sum, s: any) => sum + (s.progress_seconds || 0),
    0
  );
  const avgListenTime =
    sessions && sessions.length > 0 ? totalListenTime / sessions.length : 0;

  const chartData = (dailyStats || []).map((stat: any) => ({
    date: stat.date,
    views: stat.views_count || 0,
    plays: stat.plays_count || 0,
    completions: stat.completions_count || 0,
    listeners: stat.unique_listeners || 0,
  }));

  return NextResponse.json({
    success: true,
    work: {
      id: work.id,
      title: work.title,
      totalViews: work.views_count || 0,
      totalLikes: work.likes_count || 0,
      totalComments: work.comments_count || 0,
      averageRating: work.average_rating || 0,
    },
    metrics: {
      totalSessions: sessions?.length || 0,
      completionRate,
      avgListenTime,
      completedListens: completedSessions,
    },
    chartData,
    recentSessions: (sessions || []).slice(0, 10).map((s: any) => ({
      startTime: s.session_start,
      duration: s.progress_seconds,
      completionPercentage: s.completion_percentage,
      isCompleted: s.is_completed,
    })),
  });
}
