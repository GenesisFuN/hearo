# Quick Git Installation Guide

## Install Git for Windows

1. **Download:** Click the link shown in the image - "Git for Windows/x64 Setup"
   - Or go directly to: https://git-scm.com/download/win
   - Download the 64-bit version (2.51.2 x64)

2. **Install:**
   - Run the installer
   - Use default settings (just keep clicking "Next")
   - **Important:** Make sure "Git from the command line and also from 3rd-party software" is selected

3. **Restart PowerShell:**
   - Close all PowerShell windows
   - Open a new PowerShell window
   - Navigate back to your project: `cd C:\Users\dane\hearo`

4. **Verify Installation:**
   ```powershell
   git --version
   ```
   Should show: `git version 2.51.2.windows.1`

## Then Continue Deployment

Once Git is installed, run these commands:

```powershell
# Stage all changes
git add .

# Commit changes
git commit -m "Production ready - Inngest workers + cleaned code"

# Push to GitHub (if you have a repository)
git push
```

**If you don't have a GitHub repository yet:**

```powershell
# Initialize Git repository
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit - Production ready"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hearo.git
git branch -M main
git push -u origin main
```

## Alternative: Deploy with Vercel CLI (No Git needed)

If you want to deploy immediately without setting up Git:

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy directly
vercel

# Follow the prompts and your app will be deployed!
```

The Vercel CLI will upload your files directly without needing Git.
