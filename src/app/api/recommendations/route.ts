import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AppError, ErrorCodes, logError } from "@/lib/errorHandling";

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      logError(
        new Error("Missing Supabase environment variables"),
        "Recommendations API"
      );
      return NextResponse.json(
        {
          error: "Server configuration error",
          code: ErrorCodes.SERVER_ERROR,
          userMessage:
            "Service temporarily unavailable. Please try again later.",
        },
        { status: 500 }
      );
    }

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: ErrorCodes.AUTH_REQUIRED,
          userMessage: "Please sign in to view recommendations.",
        },
        { status: 401 }
      );
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
      logError(
        userError || new Error("Invalid token"),
        "Recommendations API - Auth"
      );
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: ErrorCodes.AUTH_INVALID,
          userMessage: "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 50)
      : 10; // Clamp between 1-50

    console.log(`📊 Fetching recommendations for user ${user.id}`);

    // Call the personalized recommendations function
    const { data: recommendations, error: recError } = await supabase.rpc(
      "get_personalized_recommendations",
      {
        p_user_id: user.id,
        p_limit: limit,
      }
    );

    if (recError) {
      logError(recError, "Recommendations API - RPC call");
      return NextResponse.json(
        {
          error: "Failed to fetch recommendations",
          code: ErrorCodes.DB_QUERY_ERROR,
          userMessage: "Unable to load recommendations. Please try again.",
        },
        { status: 500 }
      );
    }

    // If we have recommendations, fetch additional details
    if (recommendations && recommendations.length > 0) {
      const workIds = recommendations.map((r: any) => r.work_id);

      // Get audio file paths and author details
      const { data: worksWithDetails, error: detailsError } = await supabase
        .from("works")
        .select(
          `
          id,
          title,
          description,
          genre,
          cover_image,
          duration_seconds,
          views_count,
          average_rating,
          ratings_count,
          published_at,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url
          ),
          audio_files!inner (
            file_path
          )
        `
        )
        .in("id", workIds);

      if (detailsError) {
        logError(detailsError, "Recommendations API - Fetch details");
        // Continue with basic data even if details fail
        console.warn(
          "⚠️ Details error, using basic recommendation data:",
          detailsError
        );
      }

      // Merge recommendations with full details
      const enrichedRecommendations = recommendations.map((rec: any) => {
        const workDetails = worksWithDetails?.find(
          (w: any) => w.id === rec.work_id
        );
        const creator = Array.isArray(workDetails?.creator)
          ? workDetails.creator[0]
          : workDetails?.creator;

        return {
          id: rec.work_id,
          title: rec.title,
          description: workDetails?.description,
          genre: rec.genre,
          coverImage: rec.cover_image,
          audioPath: workDetails?.audio_files?.[0]?.file_path || "",
          durationSeconds: rec.duration_seconds,
          views: rec.views_count || 0,
          rating: rec.average_rating || 0,
          ratingsCount: workDetails?.ratings_count || 0,
          publishedAt: workDetails?.published_at,
          author: {
            id: creator?.id || rec.creator_id,
            name: creator?.display_name || creator?.username || "Unknown",
            username: creator?.username || "",
            avatar: creator?.avatar_url,
          },
          recommendationScore: rec.recommendation_score,
          recommendationReason: rec.recommendation_reason,
        };
      });

      console.log(
        `✅ Returning ${enrichedRecommendations.length} recommendations`
      );

      return NextResponse.json({
        recommendations: enrichedRecommendations,
        userId: user.id,
      });
    }

    // No recommendations yet - user might be new
    console.log("ℹ️ No recommendations available for this user");
    return NextResponse.json({
      recommendations: [],
      userId: user.id,
      message: "Start listening to books to get personalized recommendations!",
    });
  } catch (error: any) {
    logError(error, "Recommendations API - Unexpected error");

    // Return appropriate error based on type
    if (
      error.message?.includes("fetch") ||
      error.message?.includes("network")
    ) {
      return NextResponse.json(
        {
          error: "Network error",
          code: ErrorCodes.NETWORK_ERROR,
          userMessage:
            "Network connection error. Please check your internet and try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        code: ErrorCodes.SERVER_ERROR,
        userMessage: "Something went wrong. Please try again later.",
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      },
      { status: 500 }
    );
  }
}
