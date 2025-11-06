# Content Moderation Database Setup

## Run this SQL in Supabase SQL Editor

Copy and paste the contents of `docs/content-agreements-table.sql` into your Supabase SQL Editor and run it.

Or use the Supabase CLI:

```bash
# Navigate to project root
cd c:\Users\dane\hearo

# Push the migration to Supabase
# First, copy the SQL file to supabase/migrations folder if you have one
# Otherwise, run directly in Supabase SQL Editor
```

## Quick SQL (Copy-Paste This)

```sql
-- Create content_agreements table to track terms acceptance
CREATE TABLE IF NOT EXISTS content_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,

  -- Agreement details
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Terms version tracking
  terms_version TEXT DEFAULT '1.0',

  -- Indexes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_content_agreements_user_id ON content_agreements(user_id);
CREATE INDEX idx_content_agreements_work_id ON content_agreements(work_id);
CREATE INDEX idx_content_agreements_agreed_at ON content_agreements(agreed_at);

-- Enable RLS
ALTER TABLE content_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own agreements"
  ON content_agreements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agreements"
  ON content_agreements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_content_agreements_updated_at
  BEFORE UPDATE ON content_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Verification

After running the SQL, verify the table exists:

```sql
SELECT * FROM content_agreements LIMIT 1;
```

You should see the table structure with no rows (or test data if you've uploaded something).
