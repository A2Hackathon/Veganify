# Sprout Logo Setup Guide

## 📸 Adding Your Logo Image

Your sprout logo image has been integrated into the app! Now you need to add the actual image file to the project.

### Step 1: Prepare Your Image

You'll need **3 versions** of your logo for different screen densities:

1. **1x** (standard): `sprout-logo.png` - Original size (e.g., 120x120 pixels)
2. **2x** (Retina): `sprout-logo@2x.png` - Double size (e.g., 240x240 pixels)
3. **3x** (Retina HD): `sprout-logo@3x.png` - Triple size (e.g., 360x360 pixels)

**Recommended sizes:**
- 1x: 120x120 px
- 2x: 240x240 px  
- 3x: 360x360 px

**Format:** PNG with transparency (supports the beige background)

### Step 2: Add Images to Xcode

#### Option A: Via Xcode (Recommended)

1. **Open your project in Xcode**
   ```bash
   cd ios
   open Sprout.xcodeproj
   ```

2. **Locate Assets.xcassets**
   - In the Project Navigator (left sidebar), find `Assets.xcassets`
   - Expand it to see `sprout-logo.imageset`

3. **Add your images**
   - Click on `sprout-logo.imageset`
   - In the right panel, you'll see 3 slots: 1x, 2x, 3x
   - Drag and drop your images:
     - `sprout-logo.png` → 1x slot
     - `sprout-logo@2x.png` → 2x slot
     - `sprout-logo@3x.png` → 3x slot

4. **Verify**
   - You should see all 3 images in the asset catalog
   - The asset should show a preview

#### Option B: Manual File Copy

1. **Copy files to the correct location:**
   ```
   ios/Assets.xcassets/sprout-logo.imageset/
   ├── sprout-logo.png
   ├── sprout-logo@2x.png
   └── sprout-logo@3x.png
   ```

2. **Update Contents.json** (already done, but verify):
   - The `Contents.json` file should reference all 3 images
   - It's already configured correctly

3. **Add to Xcode project:**
   - Right-click `sprout-logo.imageset` in Xcode
   - Select "Add Files to Sprout..."
   - Select the 3 image files
   - Make sure "Copy items if needed" is checked
   - Add to target: `Sprout`

### Step 3: Verify It Works

1. **Build and run the app**
   - Press `⌘R` in Xcode
   - The logo should appear on:
     - Welcome screen (onboarding)
     - Home screen (sprout display)
     - Name your sprout screen

2. **Check different sizes**
   - The logo should look crisp on all devices
   - Test on different simulators (iPhone SE, iPhone 15 Pro, etc.)

## 🎨 Where the Logo Appears

The logo is used in several places:

1. **Onboarding Welcome Screen**
   - Large animated logo with glow effect
   - Uses `SproutLogoLarge()` component

2. **Home Screen**
   - Medium logo in the sprout card
   - Shows next to sprout name
   - Uses `SproutLogo(size: 72)` component

3. **Name Your Sprout Screen**
   - Medium logo
   - Uses `SproutLogoMedium()` component

## 🛠️ Logo Components Available

The app includes reusable logo components:

```swift
// Small logo (60pt)
SproutLogoSmall()

// Medium logo (120pt)
SproutLogoMedium()

// Large logo (180pt, animated)
SproutLogoLarge()

// Custom size
SproutLogo(size: 100, showGlow: true, animated: false)
```

## 📱 App Icon (Optional)

If you want to use the logo as the app icon:

1. **Create app icon sizes:**
   - iOS requires multiple sizes (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt)
   - Use a tool like [App Icon Generator](https://www.appicon.co/) or create manually

2. **Add to Assets.xcassets:**
   - Create `AppIcon.appiconset` folder
   - Add all required sizes
   - Or use the `AppIconView` component to generate programmatically

## 🎯 Quick Checklist

- [ ] Prepare 3 image sizes (1x, 2x, 3x)
- [ ] Add images to `Assets.xcassets/sprout-logo.imageset/`
- [ ] Verify images appear in Xcode asset catalog
- [ ] Build and run app
- [ ] Check logo appears on welcome screen
- [ ] Check logo appears on home screen
- [ ] Test on different device sizes

## 💡 Tips

- **Transparency**: Keep the PNG transparent background - the app will handle the background
- **Quality**: Use high-quality source images for best results
- **Colors**: The logo colors should work well with the green theme (#658354, #4b6043)
- **Size**: The logo scales automatically, so start with a high-resolution source

## 🐛 Troubleshooting

**Logo doesn't appear:**
- Check that images are in the correct folder
- Verify images are added to the Xcode target
- Clean build folder: `⌘ShiftK`, then rebuild
- Check that image names match exactly (case-sensitive)

**Logo looks blurry:**
- Ensure you have all 3 sizes (1x, 2x, 3x)
- Check image resolution matches recommended sizes
- Verify images are PNG format, not JPEG

**Logo doesn't show in simulator:**
- Try deleting the app and reinstalling
- Clean build folder and rebuild
- Check asset catalog in Xcode shows all images

## ✨ Next Steps

Once the logo is added:
1. Test on real device for best quality check
2. Consider creating app icon from the logo
3. Add logo to splash screen if desired
4. Use logo in marketing materials

Your beautiful sprout logo is now ready to grow with your app! 🌱

