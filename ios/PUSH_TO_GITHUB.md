# How to Push to GitHub 🌱

## Step-by-Step Guide

### Step 1: Check if Git is Installed

Open PowerShell or Command Prompt and run:
```powershell
git --version
```

If Git is not installed, download it from: https://git-scm.com/download/win

### Step 2: Navigate to Your Project

```powershell
cd "C:\Users\김나영\OneDrive\바탕 화면\Veganify\Veganify"
```

### Step 3: Initialize Git (if not already done)

```powershell
git init
```

### Step 4: Create a .gitignore (if needed)

If you don't have a `.gitignore` in the root, create one. The `ios/.gitignore` is already set up for Xcode files.

### Step 5: Add All Files

```powershell
git add .
```

Or add specific folders:
```powershell
git add ios/
git add backend/
```

### Step 6: Make Your First Commit

```powershell
git commit -m "Initial commit: Sprout iOS app with backend integration"
```

### Step 7: Create GitHub Repository

1. **Go to GitHub.com** and sign in
2. **Click the "+" icon** (top right) → **"New repository"**
3. **Repository name**: `Sprout` or `Veganify` or `Sprout-iOS`
4. **Description**: "iOS app for vegan cooking assistance"
5. **Choose**: Public or Private
6. **DO NOT** check "Initialize with README" (you already have files)
7. **Click "Create repository"**

### Step 8: Connect to GitHub

After creating the repo, GitHub will show you commands. Use these:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO_NAME` with your repository name

### Step 9: Push Your Code

```powershell
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your password)
  - Get one at: https://github.com/settings/tokens
  - Create token with `repo` permissions

## Alternative: Using GitHub Desktop (Easier)

If you prefer a GUI:

1. **Download GitHub Desktop**: https://desktop.github.com/
2. **Install and sign in** with your GitHub account
3. **File → Add Local Repository**
4. **Select** your project folder
5. **Click "Publish repository"**
6. **Done!** ✅

## Alternative: Upload via Web Interface

If you don't want to use Git commands:

1. **Create repository on GitHub** (Step 7 above)
2. **Click "uploading an existing file"** on the repo page
3. **Drag and drop** your `ios/` folder contents
4. **Commit** with message: "Initial iOS app"
5. **Done!** ✅

## What Gets Pushed

The `.gitignore` file will exclude:
- ❌ Xcode user data (`xcuserdata/`)
- ❌ Build files (`build/`, `DerivedData/`)
- ❌ Temporary files
- ❌ Logs

These will be included:
- ✅ All Swift source files
- ✅ Xcode project file
- ✅ Assets (except actual logo images - you'll add those separately)
- ✅ Documentation files
- ✅ Configuration files

## Important: Don't Push These

- **App icon images** - Add manually in Xcode (they're large)
- **API keys** - Never commit `.env` files or API keys
- **Personal data** - User data, local databases

## Troubleshooting

**"fatal: not a git repository"**
- Run `git init` first

**"remote origin already exists"**
- Remove it: `git remote remove origin`
- Add again: `git remote add origin YOUR_URL`

**"Authentication failed"**
- Use Personal Access Token instead of password
- Or use SSH keys

**"Large file" errors**
- Check `.gitignore` is working
- Remove large files: `git rm --cached LARGE_FILE`

## Next Steps After Pushing

1. ✅ Clone on your Mac to work in Xcode
2. ✅ Share with team members
3. ✅ Set up CI/CD if needed
4. ✅ Add README with setup instructions

## Quick Command Summary

```powershell
# Initialize
git init

# Add files
git add .

# Commit
git commit -m "Initial commit"

# Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

That's it! Your code is now on GitHub! 🎉

