# Book Editing Feature Setup

## Overview

This feature allows creators to edit their books in the Studio's "My Books" section. They can:

1. **Upload/change cover images** - Add beautiful cover art to books
2. **Rename books** - Update book titles after publishing

## Database Changes Required

### 1. Add Cover Image Column

Run this SQL in your Supabase SQL Editor:

```sql
-- Add cover_image column to works table
ALTER TABLE works ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_works_cover_image ON works(cover_image) WHERE cover_image IS NOT NULL;

-- Add comment
COMMENT ON COLUMN works.cover_image IS 'Public URL of the book cover image stored in Supabase Storage';
```

Or run the migration file:

```bash
# In Supabase SQL Editor, paste contents of:
docs/add-cover-image-column.sql
```

### 2. Storage Bucket Setup

The cover images are stored in the **`covers`** bucket in Supabase Storage.

**Required Storage Policies:**

Run `docs/covers-bucket-policies.sql` in Supabase SQL Editor to create:

- ✅ Public read access (anyone can view covers)
- ✅ Authenticated users can upload covers for their own books
- ✅ Users can update their own book covers
- ✅ Users can delete their own book covers

**Bucket Configuration:**

- Bucket name: `covers`
- Public: Yes (for displaying images)
- File size limit: 5MB (enforced in code)
- Allowed file types: image/\* (enforced in code)

## Features Implemented

### 1. Edit Book Modal (`EditBookModal.tsx`)

A beautiful modal dialog that appears when clicking "Edit" on a book.

**Features:**

- Title editing with live validation
- Cover image upload with preview
- Image validation (type check, 5MB size limit)
- Upload progress indicator
- Drag-and-drop ready (file input)

**Recommended cover specs:**

- **Aspect Ratio:** 2:3 (portrait, like a book cover)
- **Resolution:** 800x1200px or higher
- **Max Size:** 5MB
- **Formats:** JPG, PNG, WebP

### 2. API Endpoint (`/api/books/[id]/update`)

Secure API endpoint for updating book details.

**Features:**

- Authentication required (must be book owner)
- Validates ownership before allowing edits
- Supports partial updates (title only, image only, or both)
- Returns updated book data

**Security:**

- Uses Supabase RLS (Row Level Security)
- Verifies JWT token from Authorization header
- Checks creator_id matches authenticated user

### 3. BookLibrary Integration

Updated the My Books page to include edit functionality.

**Changes:**

- Added "Edit" button next to Download button
- Only shows for published books with audio
- Opens EditBookModal when clicked
- Updates local state after successful edit
- Refreshes book list to show new title/cover

## Usage

### For Creators:

1. **Navigate to Studio → My Books**
2. Find a published book (with Play button visible)
3. Click the **Edit** button (pencil icon)
4. **Update Title:**
   - Type new title in the text field
   - Changes are saved when you click "Save Changes"
5. **Upload Cover:**
   - Click "Upload Cover" button
   - Select an image file (JPG, PNG, WebP)
   - See preview immediately
   - Cover is uploaded when you click "Save Changes"
6. **Save Changes:**
   - Both title and cover are updated together
   - Progress bar shows upload status
   - Success message confirms save

### For Developers:

**File Structure:**

```
src/
├── components/
│   ├── EditBookModal.tsx           # New modal component
│   └── BookLibrary.tsx             # Updated with edit functionality
└── app/
    └── api/
        └── books/
            └── [id]/
                └── update/
                    └── route.ts    # New API endpoint

docs/
└── add-cover-image-column.sql      # Database migration
```

**State Management:**

- `editModalOpen`: Controls modal visibility
- `bookToEdit`: Currently selected book for editing
- `handleBookUpdate`: Callback after successful update
- Local state updates prevent full page refresh

**API Request:**

```typescript
PATCH /api/books/{bookId}/update
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "New Book Title",        // Optional
  "coverImage": "https://..."       // Optional (public URL)
}
```

**API Response:**

```json
{
  "success": true,
  "message": "Book updated successfully",
  "book": {
    /* updated book object */
  }
}
```

## Testing Checklist

- [ ] Run SQL migration to add `cover_image` column
- [ ] Verify storage bucket policies allow uploads
- [ ] Navigate to Studio → My Books
- [ ] Click Edit on a published book
- [ ] Try renaming the book
- [ ] Try uploading a cover image
- [ ] Verify both updates save correctly
- [ ] Check that cover displays on book cards
- [ ] Test with different image formats (JPG, PNG)
- [ ] Test file size validation (try >5MB)
- [ ] Test with non-image file (should reject)
- [ ] Verify only book owner can edit (RLS)

## Future Enhancements

Possible additions:

- [ ] Crop/resize tool for cover images
- [ ] Bulk edit multiple books at once
- [ ] Edit book description/synopsis
- [ ] Change book genre after publishing
- [ ] Image optimization (auto-resize to optimal dimensions)
- [ ] Cover image templates/generator
- [ ] Edit metadata (author name, publication date)
- [ ] Change audio quality settings

## Troubleshooting

**"Not authenticated" error:**

- User must be signed in
- Check that JWT token is valid
- Verify Authorization header is being sent

**"You don't have permission" error:**

- User must be the book's creator
- Check that creator_id matches user.id in database
- Verify RLS policies on works table

**Image upload fails:**

- Check file size < 5MB
- Verify file is an image type
- Check storage bucket permissions
- Look for CORS errors in browser console

**Cover doesn't display:**

- Verify public URL is correct
- Check storage bucket has public read access
- Clear browser cache
- Check image URL in database

## Notes

- Cover images are stored permanently in Supabase Storage
- Old cover images are NOT automatically deleted when uploading new ones
- Consider implementing cleanup job for orphaned images
- Cover URLs are public (anyone with link can view)
- Title changes affect all references (published books, playlists, etc.)
