import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ saved: false });
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
      return NextResponse.json({ saved: false });
    }

    const { id: bookId } = await params;

    // Check if book is saved
    const { data, error } = await supabase
      .from("saved_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("work_id", bookId)
      .maybeSingle();

    if (error) {
      console.error("Error checking saved status:", error);
      return NextResponse.json({ saved: false });
    }

    return NextResponse.json({ saved: !!data });
  } catch (error) {
    console.error("Error in is-saved API:", error);
    return NextResponse.json({ saved: false });
  }
}
