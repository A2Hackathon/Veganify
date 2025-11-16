# App Icon Quick Setup 🌱

## Super Simple Method

Your sprout logo → App icon. Here's the fastest way:

### Option 1: Use Online Tool (Recommended) ⭐

1. **Export your logo** at **1024x1024 pixels** (square)
2. **Go to** [AppIcon.co](https://www.appicon.co/)
3. **Upload** your image
4. **Download** the generated icon set
5. **In Xcode**: Open `Assets.xcassets` → `AppIcon`
6. **Drag all images** into their slots
7. **Done!** ✅

### Option 2: Just 3 Images (Quick Start)

If you want to start immediately:

1. **Create 3 sizes** from your logo:
   - `AppIcon-1024@1x.png` (1024x1024px) - App Store
   - `AppIcon-60@3x.png` (180x180px) - Modern iPhones
   - `AppIcon-60@2x.png` (120x120px) - Older iPhones

2. **Add to Xcode**:
   - Open `Assets.xcassets` → `AppIcon`
   - Drag these 3 images into their slots
   - iOS will scale them for other sizes

3. **Build and run** - Your icon appears!

### That's It!

Your sprout logo is now your app icon. You can add more sizes later for perfect quality on all devices.

See `APP_ICON_SETUP.md` for complete details.

