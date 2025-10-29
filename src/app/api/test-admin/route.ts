import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  try {
    console.log("Testing Supabase admin connection...");

    const supabaseAdmin = getSupabaseAdmin();

    // Test storage bucket access
    const { data: buckets, error: bucketError } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
      console.error("Bucket list error:", bucketError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to list buckets",
          details: bucketError.message,
        },
        { status: 500 }
      );
    }

    console.log("Available buckets:", buckets);

    // Check if audiobooks bucket exists
    const audiobooksBucket = buckets?.find((b) => b.id === "audiobooks");

    if (!audiobooksBucket) {
      return NextResponse.json(
        {
          success: false,
          error: "Audiobooks bucket not found",
          availableBuckets: buckets?.map((b) => b.id),
        },
        { status: 404 }
      );
    }

    // Test database access
    const { data: profiles, error: dbError } = await supabaseAdmin
      .from("profiles")
      .select("count", { count: "exact", head: true });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database access failed",
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase admin connection working",
      buckets: buckets?.map((b) => ({
        id: b.id,
        name: b.name,
        public: b.public,
      })),
      profileCount: profiles?.length || 0,
    });
  } catch (error) {
    console.error("Admin test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Admin client test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
