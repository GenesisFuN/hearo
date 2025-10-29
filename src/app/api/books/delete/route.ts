import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    console.log("🗑️ Deleting book:", bookId, "for user:", user.id);

    const deletedItems = [];
    const errors = [];

    // 1. Get the work details first
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("*")
      .eq("id", bookId)
      .eq("creator_id", user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json(
        { error: "Work not found or access denied" },
        { status: 404 }
      );
    }

    // 2. Get associated audio files to delete from storage
    const { data: audioFiles } = await supabase
      .from("audio_files")
      .select("storage_path, storage_bucket")
      .eq("work_id", bookId)
      .eq("user_id", user.id);

    // 3. Delete audio files from Supabase Storage
    if (audioFiles && audioFiles.length > 0) {
      for (const audioFile of audioFiles) {
        if (audioFile.storage_path && audioFile.storage_bucket) {
          const { error: storageError } = await supabase.storage
            .from(audioFile.storage_bucket)
            .remove([audioFile.storage_path]);

          if (storageError) {
            errors.push(
              `Failed to delete audio from storage: ${storageError.message}`
            );
            console.error("Storage delete error:", storageError);
          } else {
            deletedItems.push(`Audio file: ${audioFile.storage_path}`);
            console.log(
              "✅ Deleted audio from storage:",
              audioFile.storage_path
            );
          }
        }
      }
    }

    // 4. Delete audio_files records (will cascade or manual delete)
    const { error: audioDeleteError } = await supabase
      .from("audio_files")
      .delete()
      .eq("work_id", bookId)
      .eq("user_id", user.id);

    if (audioDeleteError) {
      errors.push(
        `Failed to delete audio records: ${audioDeleteError.message}`
      );
      console.error("Audio records delete error:", audioDeleteError);
    } else {
      deletedItems.push("Audio records from database");
      console.log("✅ Deleted audio records");
    }

    // 5. Delete text file from storage if exists
    if (work.text_file_path) {
      const { error: textStorageError } = await supabase.storage
        .from("text-uploads")
        .remove([work.text_file_path]);

      if (textStorageError) {
        errors.push(`Failed to delete text file: ${textStorageError.message}`);
        console.error("Text storage delete error:", textStorageError);
      } else {
        deletedItems.push(`Text file: ${work.text_file_path}`);
        console.log("✅ Deleted text from storage:", work.text_file_path);
      }
    }

    // 6. Finally, delete the work record
    const { error: workDeleteError } = await supabase
      .from("works")
      .delete()
      .eq("id", bookId)
      .eq("creator_id", user.id);

    if (workDeleteError) {
      errors.push(`Failed to delete work: ${workDeleteError.message}`);
      console.error("Work delete error:", workDeleteError);
      return NextResponse.json(
        { error: "Failed to delete work", details: errors },
        { status: 500 }
      );
    }

    deletedItems.push("Work record from database");
    console.log("✅ Deleted work record");

    return NextResponse.json({
      success: true,
      message: `Book "${work.title}" deleted successfully`,
      deletedItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete book",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
