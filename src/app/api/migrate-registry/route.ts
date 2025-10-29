import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const registryPath = join(
      process.cwd(),
      "public",
      "books",
      "registry.json"
    );

    // Read existing registry
    let registry = [];
    try {
      const existingRegistry = await readFile(registryPath, "utf-8");
      registry = JSON.parse(existingRegistry);
    } catch (error) {
      return NextResponse.json(
        { error: "Registry not found" },
        { status: 404 }
      );
    }

    // Migrate each book
    let updatedCount = 0;
    const updatedRegistry = registry.map((book: any) => {
      let updated = { ...book };

      // Add missing genre
      if (!book.genre) {
        updated.genre = "Others"; // Default genre for old books
        updatedCount++;
      }

      // Add missing author info (create a placeholder author)
      if (!book.author) {
        const creatorId = book.originalId.slice(-4);
        updated.author = {
          id: `legacy-creator-${creatorId}`,
          name: `Creator ${creatorId}`,
          username: `creator${creatorId}`,
          avatar: null,
        };
        updatedCount++;
      }

      return updated;
    });

    // Write updated registry
    await writeFile(registryPath, JSON.stringify(updatedRegistry, null, 2));

    return NextResponse.json({
      success: true,
      message: `Migrated ${updatedCount} books with missing data`,
      booksUpdated: updatedCount,
      totalBooks: registry.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Failed to migrate registry" },
      { status: 500 }
    );
  }
}
