# App Icon Setup - Logo Only 🌱

## Overview

Your sprout logo will be used **only as the app icon** (the icon on the home screen). The app UI uses SF Symbols (leaf icons) instead.

## Quick Setup

### Step 1: Prepare Your Logo

1. Export your sprout logo at **1024x1024 pixels** (square)
2. Format: PNG
3. Save as: `AppIcon-1024@1x.png`

### Step 2: Generate All Sizes

**Easiest method:** Use [AppIcon.co](https://www.appicon.co/)

1. Upload your 1024x1024 image
2. Download the generated icon set
3. Extract all PNG files

### Step 3: Add to Xcode

1. Open `Assets.xcassets` → `AppIcon`
2. Drag all generated images into their corresponding slots
3. Build and run - your logo appears as the app icon!

## Minimum Required (Quick Start)

If you want to start immediately, you only need:

1. **AppIcon-1024@1x.png** (1024x1024) - App Store
2. **AppIcon-60@3x.png** (180x180) - iPhone home screen
3. **AppIcon-60@2x.png** (120x120) - Older iPhones

Add these 3 to Xcode. iOS will scale them for other sizes.

## What Changed

- ✅ App icon setup created (`AppIcon.appiconset`)
- ✅ Views updated to use SF Symbols (leaf icon) instead of logo
- ✅ Logo component still exists but not used in UI
- ✅ Your logo will appear as the app icon on home screen

## File Location

Your app icon images go here:
```
ios/Assets.xcassets/AppIcon.appiconset/
```

## Notes

- The app UI uses SF Symbols (leaf.fill) for consistency
- Your logo appears only as the app icon
- App icons must be square
- iOS automatically adds rounded corners

Your sprout logo will look perfect as the app icon! 🌱

