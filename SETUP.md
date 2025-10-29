# Hearo Backend Setup Guide

## 🚀 Quick Start

Your authentication system and subscription gates are now ready! Follow these steps to complete the backend integration:

### 1. Supabase Setup (5 minutes)

1. **Create Supabase Project**

   ```bash
   # Go to https://supabase.com
   # Create new project
   # Get your project URL and anon key
   ```

2. **Update Environment Variables**
   - Open `.env.local`
   - Replace `your-project-url-here` with your Supabase project URL
   - Replace `your-anon-key-here` with your Supabase anon key

3. **Deploy Database Schema**
   ```sql
   # Copy the contents of docs/database-schema.sql
   # Go to your Supabase project → SQL Editor
   # Paste and run the schema
   ```

### 2. ElevenLabs Setup (AI Narration)

1. **Get API Key**
   ```bash
   # Go to https://elevenlabs.io
   # Create account → Get API key
   # Update ELEVENLABS_API_KEY in .env.local
   ```

### 3. Test Authentication

1. **Start Development Server**

   ```bash
   npm run dev
   ```

2. **Test Features**
   - Visit `/studio` → Should show sign-up form
   - Create account → Should redirect to subscription upgrade
   - Upload content → Protected by subscription gate

## 🔒 Current Protection Status

✅ **Studio Page**: Protected by Creator subscription tier  
✅ **Upload Manager**: Ready for file storage integration  
✅ **Authentication**: Complete signup/signin/signout system  
✅ **Subscription Gates**: Tier-based access control

## 🎯 Next Steps

1. **Deploy Schema** → Enable user registration
2. **Add ElevenLabs Key** → Enable AI narration
3. **Test Upload Flow** → Verify file storage
4. **Configure Storage** → Set up bucket policies in Supabase

## 📱 Mobile App Ready

The authentication and subscription system is designed to work seamlessly with future mobile app development using React Native or Expo.

---

**Ready to go live?** Just update those environment variables and deploy your database schema!
