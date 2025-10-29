import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create unauthenticated client for public searches
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const genre = searchParams.get("genre");
    const genres = searchParams.get("genres"); // Multi-select: "Fantasy,Sci-fi,Mystery"
    const sortBy = searchParams.get("sort") || "newest";
    const duration = searchParams.get("duration"); // short, medium, long
    const dateRange = searchParams.get("dateRange"); // week, month, year
    const author = searchParams.get("author"); // Author name/username search
    const contentTags = searchParams.get("contentTags"); // "family-friendly,educational"

    console.log("🔍 Search request:", {
      query,
      genre,
      genres,
      sortBy,
      duration,
      dateRange,
      author,
      contentTags,
    });

    // Build the query
    let supabaseQuery = supabase
      .from("works")
      .select(
        `
        id,
        title,
        description,
        genre,
        created_at,
        published_at,
        views_count,
        likes_count,
        average_rating,
        ratings_count,
        comments_count,
        duration_seconds,
        tags,
        content_tags,
        creator:profiles!creator_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        audio_files!inner (
          id,
          file_path
        )
      `
      )
      .eq("is_public", true)
      .eq("status", "published");

    // Apply text search if query provided
    if (query.trim()) {
      // Search in title, description, and tags
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%`
      );
    }

    // Apply author filter
    if (author && author.trim()) {
      // Note: Author filtering requires client-side filtering since we can't use .or() on joined tables
      // We'll filter this in the results transformation
    }

    // Apply multi-genre filter (OR logic)
    if (genres && genres !== "all") {
      const genreList = genres.split(",").map((g) => g.trim());
      if (genreList.length > 0) {
        supabaseQuery = supabaseQuery.in("genre", genreList);
      }
    } else if (genre && genre !== "all") {
      // Fallback to single genre for backwards compatibility
      supabaseQuery = supabaseQuery.eq("genre", genre);
    }

    // Apply duration filter
    if (duration && duration !== "all") {
      switch (duration) {
        case "short":
          supabaseQuery = supabaseQuery.lt("duration_seconds", 7200); // < 2 hours
          break;
        case "medium":
          supabaseQuery = supabaseQuery
            .gte("duration_seconds", 7200)
            .lt("duration_seconds", 18000); // 2-5 hours
          break;
        case "long":
          supabaseQuery = supabaseQuery.gte("duration_seconds", 18000); // 5+ hours
          break;
      }
    }

    // Apply date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateRange) {
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      supabaseQuery = supabaseQuery.gte(
        "published_at",
        cutoffDate.toISOString()
      );
    }

    // Apply content tags filter (matches ANY of the provided tags)
    if (contentTags && contentTags !== "all") {
      const tagList = contentTags.split(",").map((t) => t.trim());
      if (tagList.length > 0) {
        supabaseQuery = supabaseQuery.overlaps("content_tags", tagList);
      }
    }

    // Apply sorting
    switch (sortBy) {
      case "popular":
        supabaseQuery = supabaseQuery.order("views_count", {
          ascending: false,
        });
        break;
      case "top-rated":
        supabaseQuery = supabaseQuery.order("average_rating", {
          ascending: false,
        });
        break;
      case "newest":
      default:
        supabaseQuery = supabaseQuery.order("published_at", {
          ascending: false,
          nullsFirst: false,
        });
        break;
    }

    // Limit results
    supabaseQuery = supabaseQuery.limit(50);

    const { data: works, error } = await supabaseQuery;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Failed to search books", details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${works?.length || 0} results`);

    // Transform to match expected format
    let results = (works || []).map((work: any) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      genre: work.genre,
      audioPath: work.audio_files?.[0]?.file_path || "",
      publishedAt: work.published_at || work.created_at,
      views: work.views_count || 0,
      likes: work.likes_count || 0,
      rating: work.average_rating || 0,
      ratingsCount: work.ratings_count || 0,
      comments: work.comments_count || 0,
      durationSeconds: work.duration_seconds || 0,
      tags: work.tags || [],
      contentTags: work.content_tags || [],
      author: {
        id: work.creator?.id || "",
        name: work.creator?.display_name || work.creator?.username || "Unknown",
        username: work.creator?.username || "",
        avatar: work.creator?.avatar_url,
      },
    }));

    // Client-side author filtering (since we can't use .or() on joined tables in Supabase)
    if (author && author.trim()) {
      const authorLower = author.toLowerCase();
      results = results.filter(
        (book) =>
          book.author.name.toLowerCase().includes(authorLower) ||
          book.author.username.toLowerCase().includes(authorLower)
      );
    }

    // Client-side text search in author names if query provided
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      // Already filtered by title/description in DB, now also include author matches
      const authorMatches = results.filter(
        (book) =>
          book.author.name.toLowerCase().includes(queryLower) ||
          book.author.username.toLowerCase().includes(queryLower)
      );
      // Merge with existing results (remove duplicates)
      const resultIds = new Set(results.map((r) => r.id));
      authorMatches.forEach((match) => {
        if (!resultIds.has(match.id)) {
          results.push(match);
        }
      });
    }

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query: {
        q: query,
        genre,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Failed to process search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
