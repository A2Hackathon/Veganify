# Quick GitHub Setup Guide

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Repository name: `Sprout` or `Veganify-iOS`
4. Description: "iOS app for vegan cooking assistance"
5. Choose **Public** or **Private**
6. **Don't** check "Initialize with README" (we already have files)
7. Click **"Create repository"**

## Step 2: Upload Files via Web (Easiest)

1. After creating the repo, you'll see a page with upload instructions
2. Click **"uploading an existing file"**
3. Drag and drop all files from your `ios/` folder:
   - All `.swift` files
   - `Sprout.xcodeproj/` folder (drag the entire folder)
   - `Info.plist`
   - `README.md` (optional)
4. Scroll down, add commit message: "Initial iOS project"
5. Click **"Commit changes"**

## Step 3: Clone on Mac

1. On your Mac, open Terminal
2. Navigate to where you want the project:
   ```bash
   cd ~/Desktop  # or wherever you want it
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   (Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values)
4. Navigate into the project:
   ```bash
   cd YOUR_REPO_NAME/ios
   ```
5. Open in Xcode:
   ```bash
   open Sprout.xcodeproj
   ```

## Alternative: Using Git Command Line (Windows)

If you have Git installed on Windows:

1. Open PowerShell or Command Prompt in the `ios` folder
2. Run these commands:

```bash
# Initialize Git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial iOS project setup"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Getting Your Repository URL

After creating the repo on GitHub, you'll see a page with:
- **HTTPS URL:** `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`
- **SSH URL:** `git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git`

Use the HTTPS URL (easier, no SSH setup needed).

## Next Steps

Once on your Mac:
1. ✅ Clone the repository
2. ✅ Open `Sprout.xcodeproj` in Xcode
3. ✅ Build and run (`⌘R`)
4. ✅ Start coding!

## Updating Changes

When you make changes on Windows:

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

2. **On Mac, pull changes:**
   ```bash
   git pull
   ```

This keeps both machines in sync! 🎉

