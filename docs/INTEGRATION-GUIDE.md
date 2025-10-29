# Quick Integration Guide - Error Handling

## 5-Minute Integration

Follow these steps to integrate the error handling system into your app.

### Step 1: Update Root Layout (2 minutes)

Find your root layout file and wrap your app with the providers:

**File:** `src/app/layout.tsx`

```tsx
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**What this does:**

- `ErrorBoundary` catches any React component errors
- `ToastProvider` enables toast notifications throughout app

---

### Step 2: Add Toast to Book Upload (1 minute)

**File:** `src/components/UploadBookForm.tsx` (or wherever you handle uploads)

Add to the top of your component:

```tsx
import { useToast } from "@/components/Toast";

export default function UploadBookForm() {
  const { showSuccess, showError } = useToast();

  const handleUpload = async (file) => {
    try {
      await uploadBook(file);
      showSuccess("Book uploaded successfully!");
    } catch (error) {
      showError(error); // Automatically shows user-friendly message
    }
  };
}
```

---

### Step 3: Add Toast to Playback Errors (1 minute)

**File:** `src/contexts/PlayerContext.tsx` (or your player component)

```tsx
import { useToast } from "@/components/Toast";

export function PlayerProvider({ children }) {
  const { showError } = useToast();

  const handlePlayError = (error) => {
    logError(error, "Audio Playback");
    showError(error);
  };

  // In your audio element
  <audio
    onError={handlePlayError}
    // ... other props
  />;
}
```

---

### Step 4: Add Toast to Social Actions (1 minute)

**File:** Components with likes/comments/ratings

```tsx
import { useToast } from "@/components/Toast";

export function LikeButton({ bookId }) {
  const { showSuccess, showError } = useToast();

  const handleLike = async () => {
    try {
      await likeBook(bookId);
      showSuccess("Book liked!");
    } catch (error) {
      showError(error);
    }
  };
}
```

---

## Common Use Cases

### Form Validation

```tsx
const { showToast } = useToast();

if (!title || title.length < 3) {
  showToast("Title must be at least 3 characters", "warning");
  return;
}
```

### Success Feedback

```tsx
const { showSuccess } = useToast();

await saveBook();
showSuccess("Book saved to library!");
```

### Network Errors

```tsx
const { showError } = useToast();

try {
  const response = await fetch("/api/books");
  if (!response.ok) {
    throw new Error("Failed to fetch");
  }
} catch (error) {
  showError(error); // Shows: "Network connection error. Please check your internet and try again."
}
```

### Custom Messages

```tsx
const { showToast } = useToast();

showToast("Processing your request...", "info");
// Do work
showToast("Request complete!", "success");
```

---

## Testing Your Integration

### 1. Test Toast Notifications

```tsx
// Add a test button temporarily
<button onClick={() => showSuccess("Test toast!")}>Test Toast</button>
```

### 2. Test Error Boundary

```tsx
// Add a component that throws
function BrokenComponent() {
  throw new Error("Test error boundary");
  return <div>This won't render</div>;
}

// Use it temporarily
<BrokenComponent />;
```

### 3. Test Error Messages

- Upload invalid file → See toast
- Try to play non-existent audio → See toast
- Disconnect internet and search → See network error toast

---

## Where to Add Toasts

### High Priority (Do These First)

- ✅ Book upload success/failure
- ✅ Audio playback errors
- ✅ Network errors on search/browse
- ✅ Authentication errors

### Medium Priority

- ✅ Like/unlike feedback
- ✅ Save/unsave book feedback
- ✅ Comment submission
- ✅ Rating submission
- ✅ Follow/unfollow

### Nice to Have

- ✅ Progress saved
- ✅ Settings updated
- ✅ Book published
- ✅ Profile updated

---

## API Error Handling Pattern

All your API routes should now return structured errors:

```typescript
// API Route
return NextResponse.json(
  {
    error: "Technical error",
    code: ErrorCodes.SOME_ERROR,
    userMessage: "User-friendly message",
  },
  { status: 500 }
);
```

Client-side handling:

```typescript
const response = await fetch("/api/something");
if (!response.ok) {
  const error = await response.json();
  showError(error); // Will show userMessage if available
}
```

---

## Troubleshooting

### Toast not showing

- Did you wrap app with `ToastProvider`?
- Check console for errors
- Verify toast is being called

### Error boundary not catching

- Error boundaries only catch React errors
- They don't catch async errors or event handlers
- Use try/catch for those

### Wrong error message showing

- Check `ErrorCodes` mapping in `errorHandling.ts`
- Add custom mapping if needed
- Use `userMessage` in API responses for custom messages

---

## Quick Reference

### Import Statements

```typescript
import { useToast } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  logError,
  getUserFriendlyMessage,
  ErrorCodes,
} from "@/lib/errorHandling";
```

### Hook Usage

```typescript
const { showToast, showError, showSuccess } = useToast();
```

### Toast Types

```typescript
showToast(message, "success"); // Green checkmark
showToast(message, "error"); // Red X
showToast(message, "info"); // Blue info icon
showToast(message, "warning"); // Yellow warning icon
```

---

## Done! 🎉

Your app now has:

- ✅ User-friendly error messages
- ✅ Toast notifications
- ✅ Error boundaries preventing crashes
- ✅ Consistent error handling

**Next:** Run through the testing plan to verify everything works!

See `docs/TESTING-QUICK-START.md` for testing procedures.
