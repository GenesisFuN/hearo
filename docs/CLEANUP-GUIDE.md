# Cleanup Guide - Remove Unused Files and Code

## ✅ What's Working Now

- Supabase Storage (audiobooks, text-uploads, covers buckets)
- Supabase Database (works, audio_files, profiles tables)
- RLS policies for security
- Authenticated API routes
- Real-time progress tracking (0-100%)
- Status enum: draft, processing, published, failed
- Complete upload → TTS → storage → database → play flow

## 🗑️ Files to Delete

### 1. Local Upload Directories (No longer used - using Supabase Storage)

```
/uploads/audio/
/uploads/text/
/uploads/voices/
```

**Why:** All files now stored in Supabase Storage buckets

### 2. Obsolete Documentation Files

```
docs/CLEANUP-UPLOADS.md
docs/debug-glass-forest.sql
docs/cleanup-stuck-glass-forest.sql
docs/fix-stuck-upload.sql
docs/delete-all-glass-forest.sql
```

**Why:** These were temporary debugging files for the stuck upload issues

### 3. Old Demo/Test Files

```
chatterbox-server-demo.py
test-upload.js
test-voice-cloning-simple.ps1
test-voice-cloning.ps1
test-mastering-comparison.ps1
```

**Why:** Testing/demo files not needed for production

## 📝 Code to Remove

### 1. Debug Logging (Optional - can keep for troubleshooting)

In `src/app/api/upload/text/route.ts`, remove or reduce verbose logging:

- Lines with "VOICE SELECTION DEBUG"
- Lines with "VOICE DEBUG"
- Excessive emoji logging (keep essential ones)

### 2. Unused TypeScript Status Values

In type definitions, the old status values are no longer used:

- "uploading" → now "draft"
- "complete" → now "published"
- "error" → now "failed"

These are already fixed in the code, no action needed.

## 📚 Documentation to Keep

### Essential Documentation (KEEP)

```
docs/STATUS-ENUM-FIX.md - Important reference for status values
docs/audio-files-rls-policies.sql - RLS policies for audio_files
docs/STORAGE-MIGRATION-COMPLETE.md - Storage migration reference
docs/storage-policies-only.sql - Storage bucket policies
docs/FIX-DANE-PROFILE.sql - Profile creation reference
docs/REAL-TIME-PROGRESS.md - Progress tracking documentation
docs/check-audio-files-schema.sql - Schema reference
docs/check-audio-files-columns.sql - Column reference
```

### Can Archive/Delete

```
docs/AUTH-SETUP.md - If auth is fully working
docs/AUTH-TOKEN-FIX.md - If auth is fully working
docs/QUICKSTART.md - May be outdated
docs/IMPLEMENTATION-GUIDE.md - May be outdated
docs/backend-example.js - If not using
```

## 🧹 Cleanup Commands

### Delete Upload Directories (Windows PowerShell)

```powershell
# Remove local upload folders (files now in Supabase)
Remove-Item -Recurse -Force .\uploads\audio
Remove-Item -Recurse -Force .\uploads\text
Remove-Item -Recurse -Force .\uploads\voices
```

### Delete Obsolete Docs

```powershell
# Remove debugging/temporary docs
Remove-Item .\docs\CLEANUP-UPLOADS.md
Remove-Item .\docs\debug-glass-forest.sql
Remove-Item .\docs\cleanup-stuck-glass-forest.sql
Remove-Item .\docs\fix-stuck-upload.sql
Remove-Item .\docs\delete-all-glass-forest.sql
```

### Delete Test Files

```powershell
# Remove test/demo files
Remove-Item .\chatterbox-server-demo.py
Remove-Item .\test-upload.js
Remove-Item .\test-voice-cloning-simple.ps1
Remove-Item .\test-voice-cloning.ps1
Remove-Item .\test-mastering-comparison.ps1
```

## 🔄 Database Cleanup (Optional)

### Delete Stuck/Test Uploads

Run in Supabase SQL Editor:

```sql
-- Delete any remaining stuck uploads
DELETE FROM works
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Delete orphaned audio_files (no associated work)
DELETE FROM audio_files
WHERE work_id NOT IN (SELECT id FROM works);
```

## ⚠️ What NOT to Delete

### Keep These Directories

```
fine-tune-data/ - For future voice model training
public/books/ - Public book assets
scripts/ - Utility scripts
src/ - All source code
```

### Keep These Files

```
coqui-server.py - TTS server (actively used)
chatterbox-server.py - Alternative TTS (may be used)
extract-voice-reference.py - Voice cloning utility
coqui-requirements.txt - Dependencies
chatterbox-requirements.txt - Dependencies
```

### Keep These Config Files

```
.env.local - Environment variables
next.config.ts - Next.js config
tsconfig.json - TypeScript config
package.json - Dependencies
tailwind.config.js - Styling
components.json - UI components
```

## 📊 Summary

**Safe to Delete:**

- 3 local upload directories (audio, text, voices)
- 5 debugging SQL files
- 5 test/demo files
- ~10 older documentation files (optional)

**Estimated Space Saved:** Depends on local uploads, likely 50-500MB

**Risk Level:** Low - All deleted items are either:

- Local copies (data safe in Supabase)
- Temporary debugging files
- Outdated documentation

## 🎯 Recommended Cleanup Order

1. **First:** Delete test files (lowest risk)
2. **Second:** Delete debugging SQL files
3. **Third:** Delete old docs (review first)
4. **Fourth:** Delete local upload folders (ONLY after verifying all data in Supabase)
5. **Last:** Clean database stuck records

## ✅ Verification Steps

After cleanup, verify everything works:

1. Upload a new text file
2. Watch progress: 5% → 21% → 37% → 53% → 69% → 85% → 90% → 95% → 100%
3. Verify book appears as "Published" with play button
4. Play the audio
5. Delete the book
6. Check Supabase Storage - files should be deleted too

Everything working? Cleanup complete! 🎉
