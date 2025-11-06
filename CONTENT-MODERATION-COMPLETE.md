# Content Moderation Implementation

## ✅ Completed - Terms of Service & Publish Agreement Modal

### 1. Upload Agreement Modal

**Location**: `src/components/BookLibrary.tsx`

**User Flow**:

1. User uploads and generates audiobook (no terms required at upload)
2. User navigates to "My Books" library
3. User clicks "Publish" button on a completed audiobook
4. Genre selection dialog appears
5. User selects genre and clicks "Publish"
6. **Terms Agreement Modal appears**
7. Modal shows book title, selected genre, and full terms
8. User must click "I Agree - Publish Now" to proceed
9. Book is published to public library only after agreement

**Features**:

- **Pre-publish confirmation**: Modal appears after genre selection but before publishing
- **Book details**: Shows the book title and selected genre
- **Clear terms**: Lists all key requirements users must certify
- **Link to full ToS**: Direct link to complete Terms of Service page
- **Cancel option**: Users can decline and cancel publishing
- **Professional UI**: Backdrop blur, scrollable content, sticky footer, z-index 9999

**Key Certifications Displayed**:

- Content ownership/rights
- No copyright infringement
- No explicit/pornographic material
- No hate speech or violence
- Understanding of account suspension consequences

**State Management**:

```tsx
const [termsModalOpen, setTermsModalOpen] = useState(false);
const [selectedGenre, setSelectedGenre] = useState<string>("");
const [bookToPublish, setBookToPublish] = useState<Book | null>(null);
```

**Validation**:

- Client-side: Publishing blocked until "I Agree - Publish Now" clicked
- Server-side: API validates `agreedToTerms` field, returns 400 if not true

**Flow Sequence**:

1. `handlePublish()` → Opens genre dialog
2. User selects genre → `confirmPublish(genre)` called
3. Genre stored, genre dialog closed, terms modal opened
4. User accepts → `handleAcceptTermsAndPublish()` called
5. API publishes book with agreement logged

### 2. Terms of Service Page

**Location**: `src/app/terms/page.tsx`

**Sections Included**:

1. Acceptance of Terms
2. Content Rights and Ownership
   - User's content ownership
   - License granted to Hearo
3. Copyright Policy
   - Prohibited content types
   - Enforcement policy
4. DMCA Copyright Infringement Notice
   - Filing instructions
   - Required information
   - DMCA Agent contact: `dmca@hearo.app`
   - Counter-notice process
5. User Conduct rules
6. Account Termination policy
7. Disclaimer of Warranties
8. Limitation of Liability
9. Indemnification clause
10. Changes to Terms
11. Governing Law
12. Contact Information

**Prohibited Content** (clearly stated):

- Copyright/trademark infringement
- Explicit/pornographic material
- Hate speech, violence, discrimination
- Malware or harmful code
- Content violating laws

### 3. Database Logging

**Table**: `content_agreements`

**Schema** (`docs/content-agreements-table.sql`):

```sql
CREATE TABLE content_agreements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  work_id UUID REFERENCES works(id),
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies**:

- Users can view their own agreements
- Users can create their own agreements
- Indexed on user_id, work_id, agreed_at

**Logged Information**:

- User ID
- Work ID (linked to uploaded book)
- Timestamp of agreement
- IP address (from `x-forwarded-for` or `x-real-ip` headers)
- User agent (browser/device info)
- Terms version (for tracking policy changes)

### 4. API Changes

**Location**: `src/app/api/upload/text/route.ts`

**Validation**:

```typescript
const agreedToTerms = formData.get("agreedToTerms") === "true";

if (!agreedToTerms) {
  return NextResponse.json(
    {
      error: "Terms of Service must be accepted",
      userMessage: "You must agree to the Terms of Service to upload content.",
    },
    { status: 400 }
  );
}
```

**Agreement Logging**:

```typescript
await adminClient.from("content_agreements").insert({
  user_id: user.id,
  work_id: work.id,
  ip_address: ipAddress,
  user_agent: userAgent,
  terms_version: "1.0",
});
```

## 🔧 Setup Instructions

### Database Setup

Run the SQL migration to create the `content_agreements` table:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Paste contents of docs/content-agreements-table.sql
```

### Email Configuration

Update the following email addresses in `src/app/terms/page.tsx` with real addresses:

- `dmca@hearo.app` - DMCA takedown notices
- `legal@hearo.app` - Legal inquiries
- `support@hearo.app` - General support

## 📋 Legal Checklist

### ✅ Implemented

- [x] Terms of Service page with comprehensive legal coverage
- [x] Upload agreement checkbox with clear language
- [x] Copyright infringement policy (DMCA compliance)
- [x] Prohibited content list (explicit, copyrighted, illegal)
- [x] Database logging of user agreements with timestamps
- [x] IP address and user agent tracking for legal proof
- [x] Account termination policy for violations
- [x] Disclaimer of warranties and limitation of liability
- [x] Indemnification clause protecting Hearo from user violations

### 🔜 Next Steps (Optional Enhancements)

- [x] **OpenAI Moderation API for text content screening** - ✅ IMPLEMENTED (See `OPENAI-MODERATION-COMPLETE.md`)
- [ ] Image moderation for book covers (AWS Rekognition or similar)
- [ ] Automated DMCA takedown workflow
- [ ] User warning system (3 strikes before suspension)
- [ ] Content review dashboard for admins
- [ ] Regular terms version updates with re-acceptance prompts

## 🛡️ Automated Content Moderation

### OpenAI Text Moderation - ✅ IMPLEMENTED

**See: `OPENAI-MODERATION-COMPLETE.md` for full details**

**What's Blocked:**

- Hate speech and hate-based threats
- Threatening harassment
- Sexual content involving minors (CRITICAL)
- Self-harm instructions

**What's Allowed:**

- Sexual content (romance novels, adult fiction)
- Violence (thrillers, action, horror)
- Regular character conflicts and harassment
- Mental health discussions

**Integration Point:**

- Text upload route checks content before storage
- Returns clear error if content flagged
- Free API, <1 second processing time
- Fail-open design (doesn't block if API fails)

**Setup Required:**

- Add `OPENAI_API_KEY` to `.env.local`
- No cost - Moderation API is free

## 🎯 Benefits

### Legal Protection

- **DMCA Safe Harbor**: Clear takedown process protects from liability
- **User Agreement**: Legally binding terms with logged acceptance
- **Content Ownership**: Clear declaration users own uploaded content
- **Audit Trail**: IP/timestamp logging proves agreement was made

### User Clarity

- **Upfront Disclosure**: Users know rules before uploading
- **Clear Consequences**: Account suspension policy stated clearly
- **DMCA Process**: Legitimate users know how to respond to false claims

### Platform Safety

- **Barrier to Abuse**: Checkbox adds friction for bad actors
- **Policy Enforcement**: Clear rules enable consistent moderation
- **Version Tracking**: Can update terms and track who agreed to which version

## 🚀 Production Deployment

1. **Run database migration** to create `content_agreements` table
2. **Update email addresses** in Terms page with real contact addresses
3. **Deploy changes** to production (Vercel)
4. **Test upload flow** to verify checkbox requirement works
5. **Verify database logging** - check content_agreements table after test upload
6. **Consider legal review** - have a lawyer review the Terms of Service
7. **Set up DMCA email** - configure `dmca@hearo.app` forwarding

## 📝 Notes

- Terms checkbox is **required** - users cannot upload without agreeing
- Agreement is logged **per upload** - each work has associated agreement
- Terms version is tracked - allows future policy updates
- IP address is logged for legal verification
- User agent helps identify automated vs manual uploads

This implementation provides MVP-ready legal protection while maintaining good UX. The OpenAI Moderation API can be added later for automated content screening.
