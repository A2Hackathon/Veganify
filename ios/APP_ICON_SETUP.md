# App Icon Setup - Using Your Sprout Logo 🌱

## Quick Setup (One Image)

Your sprout logo will be used as the app icon. Here's how to set it up:

### Step 1: Prepare Your Image

1. Take your sprout logo image
2. Export it at **1024x1024 pixels** (square, high quality)
3. Save as: **`AppIcon-1024@1x.png`**
4. Format: PNG (can have transparency, but solid background recommended for app icon)

### Step 2: Generate All Required Sizes

iOS requires many different sizes. You have two options:

#### Option A: Use Online Tool (Easiest) ⭐

1. Go to [AppIcon.co](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/)
2. Upload your 1024x1024 image
3. Download the generated icon set
4. Extract all the PNG files

#### Option B: Generate Manually

Use your 1024x1024 image and create these sizes:

**iPhone:**
- 20x20: 40px (2x), 60px (3x)
- 29x29: 58px (2x), 87px (3x)
- 40x40: 80px (2x), 120px (3x)
- 60x60: 120px (2x), 180px (3x)

**iPad:**
- 20x20: 20px (1x), 40px (2x)
- 29x29: 29px (1x), 58px (2x)
- 40x40: 40px (1x), 80px (2x)
- 76x76: 76px (1x), 152px (2x)
- 83.5x83.5: 167px (2x)

**App Store:**
- 1024x1024: 1024px (1x)

### Step 3: Add to Xcode

1. **Open Xcode** and your project
2. **Navigate** to `Assets.xcassets` → `AppIcon`
3. **Drag and drop** each image into its corresponding slot:
   - Match the filename to the slot (e.g., `AppIcon-60@3x.png` goes in 60pt 3x slot)
   - Xcode will show you which slot each image belongs to

### Step 4: Verify

1. Build and run the app
2. Check the app icon on your home screen
3. Verify it looks good at different sizes

## File Structure

Your images should be here:
```
ios/Assets.xcassets/AppIcon.appiconset/
├── Contents.json
├── AppIcon-20@2x.png
├── AppIcon-20@3x.png
├── AppIcon-29@2x.png
├── AppIcon-29@3x.png
├── AppIcon-40@2x.png
├── AppIcon-40@3x.png
├── AppIcon-60@2x.png
├── AppIcon-60@3x.png
├── AppIcon-20@1x.png (iPad)
├── AppIcon-29@1x.png (iPad)
├── AppIcon-40@1x.png (iPad)
├── AppIcon-76@1x.png (iPad)
├── AppIcon-76@2x.png (iPad)
├── AppIcon-83.5@2x.png (iPad)
└── AppIcon-1024@1x.png (App Store)
```

## Quick Method (Minimum Required)

If you want to start quickly, you only **need** these sizes:

1. **AppIcon-1024@1x.png** (1024x1024) - For App Store
2. **AppIcon-60@3x.png** (180x180) - For iPhone home screen
3. **AppIcon-60@2x.png** (120x120) - For older iPhones

Add these 3 to Xcode, and iOS will scale them for other sizes. You can add the rest later for perfect quality.

## Tips

- **Square image**: App icons must be square
- **No transparency**: App Store requires solid background (but you can use transparency for development)
- **High quality**: Start with 1024x1024 for best results
- **Rounded corners**: iOS automatically adds rounded corners, so design your icon to look good with rounded corners

## Troubleshooting

**Icon not showing?**
- Make sure images are in `AppIcon.appiconset` folder
- Verify filenames match exactly
- Clean build folder: `⌘ShiftK`, then rebuild

**Icon looks blurry?**
- Use high-resolution source (1024x1024)
- Add all required sizes for best quality

**Icon not updating?**
- Delete the app from simulator/device
- Clean build folder
- Rebuild and reinstall

## Recommended Tools

- **[AppIcon.co](https://www.appicon.co/)** - Free, generates all sizes
- **[IconKitchen](https://icon.kitchen/)** - Google's tool, very easy
- **[MakeAppIcon](https://makeappicon.com/)** - Another good option

Your sprout logo will look great as the app icon! 🌱✨

