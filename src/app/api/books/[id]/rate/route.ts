import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rate a book (1-5 stars)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workId = id;

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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if book exists and is public
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("id, is_public")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (!work.is_public) {
      return NextResponse.json(
        { error: "Cannot rate private books" },
        { status: 403 }
      );
    }

    // Upsert rating (insert or update)
    const { error: upsertError } = await supabase.from("book_ratings").upsert(
      {
        user_id: user.id,
        work_id: workId,
        rating: rating,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,work_id",
      }
    );

    if (upsertError) throw upsertError;

    // Get updated average rating
    const { data: updatedWork } = await supabase
      .from("works")
      .select("average_rating, ratings_count")
      .eq("id", workId)
      .single();

    return NextResponse.json({
      rating,
      averageRating: updatedWork?.average_rating || 0,
      ratingsCount: updatedWork?.ratings_count || 0,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

// Get rating for current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workId = id;

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");

    // If no auth, just return public data
    if (!authorization || !authorization.startsWith("Bearer ")) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: work } = await supabase
        .from("works")
        .select("average_rating, ratings_count")
        .eq("id", workId)
        .single();

      return NextResponse.json({
        userRating: null,
        averageRating: work?.average_rating || 0,
        ratingsCount: work?.ratings_count || 0,
      });
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated client
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ userRating: null });
    }

    // Get user's rating
    const { data: rating } = await supabase
      .from("book_ratings")
      .select("rating")
      .eq("user_id", user.id)
      .eq("work_id", workId)
      .single();

    // Get book's average rating
    const { data: work } = await supabase
      .from("works")
      .select("average_rating, ratings_count")
      .eq("id", workId)
      .single();

    return NextResponse.json({
      userRating: rating?.rating || null,
      averageRating: work?.average_rating || 0,
      ratingsCount: work?.ratings_count || 0,
    });
  } catch (error) {
    console.error("Error getting rating:", error);
    return NextResponse.json(
      { error: "Failed to get rating" },
      { status: 500 }
    );
  }
}

// Delete user's rating
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workId = id;

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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from("book_ratings")
      .delete()
      .eq("user_id", user.id)
      .eq("work_id", workId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: "Rating removed successfully",
    });
  } catch (error) {
    console.error("Error removing rating:", error);
    return NextResponse.json(
      { error: "Failed to remove rating" },
      { status: 500 }
    );
  }
}
