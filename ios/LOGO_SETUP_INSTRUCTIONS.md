# Sprout Logo Setup Instructions

## 📸 Adding Your Logo Image

Your sprout logo image needs to be added to the asset catalog. Follow these steps:

### Step 1: Prepare Your Image

You need **3 versions** of your logo image for different screen densities:

1. **1x** (standard): `sprout-logo.png` - Base size (e.g., 200x200px)
2. **2x** (Retina): `sprout-logo@2x.png` - Double size (e.g., 400x400px)
3. **3x** (Retina HD): `sprout-logo@3x.png` - Triple size (e.g., 600x600px)

**Recommended sizes:**
- 1x: 200x200 pixels
- 2x: 400x400 pixels  
- 3x: 600x600 pixels

**Format:** PNG with transparency (supports the beige background)

### Step 2: Add Images to Xcode

1. **Open Xcode** and navigate to your project
2. **Open** `Assets.xcassets` in the Project Navigator
3. **Find** the `sprout-logo` image set
4. **Drag and drop** your images:
   - Drag `sprout-logo.png` to the **1x** slot
   - Drag `sprout-logo@2x.png` to the **2x** slot
   - Drag `sprout-logo@3x.png` to the **3x** slot

### Step 3: Verify

The asset catalog should show:
```
sprout-logo.imageset/
├── Contents.json
├── sprout-logo.png (1x)
├── sprout-logo@2x.png (2x)
└── sprout-logo@3x.png (3x)
```

### Step 4: Test

Build and run the app. The logo should appear:
- ✅ On the welcome screen (large, animated)
- ✅ On the home screen (in the sprout card)
- ✅ In the app icon (if configured)

## 🎨 Logo Usage in App

The logo is used in these places:

1. **Welcome Screen** - Large animated logo with glow effect
2. **Home Screen** - Medium logo in the sprout card
3. **App Icon** - Can be used as app icon (see below)

## 📱 Creating App Icon

To use your logo as the app icon:

1. Create app icon sizes (use online tools like [AppIcon.co](https://www.appicon.co/))
2. Add to `Assets.xcassets` → `AppIcon` image set
3. Or use the `AppIconView` component in code

## 🔧 Quick Setup (If you have one image)

If you only have one image file:

1. Export it at 600x600px (highest quality)
2. Use online tools to generate 1x, 2x, 3x versions:
   - [ImageResizer.com](https://imageresizer.com/)
   - Or use Preview on Mac: Tools → Adjust Size
3. Save as:
   - `sprout-logo.png` (200x200)
   - `sprout-logo@2x.png` (400x400)
   - `sprout-logo@3x.png` (600x600)

## ✅ Verification Checklist

- [ ] All 3 image sizes added to asset catalog
- [ ] Images show correctly in Xcode asset preview
- [ ] Logo appears on welcome screen
- [ ] Logo appears on home screen
- [ ] Logo scales properly on different devices
- [ ] No console errors about missing images

## 🎯 Logo Component Usage

The app includes a reusable `SproutLogo` component:

```swift
// Small logo (60pt)
SproutLogoSmall()

// Medium logo (120pt)
SproutLogoMedium()

// Large animated logo (180pt)
SproutLogoLarge()

// Custom size
SproutLogo(size: 100, showGlow: true, animated: true)
```

## 🐛 Troubleshooting

**Logo not showing?**
- Check that images are in `Assets.xcassets/sprout-logo.imageset/`
- Verify image names match exactly: `sprout-logo.png`, `sprout-logo@2x.png`, `sprout-logo@3x.png`
- Clean build folder: `⌘ShiftK` then rebuild

**Logo looks blurry?**
- Ensure you're using high-resolution images (at least 600x600 for 3x)
- Check that images are properly added to all 3 slots

**Logo too big/small?**
- Adjust the `size` parameter in `SproutLogo` component
- Or modify the preset sizes in `SproutLogo.swift`

## 📝 Notes

- The logo supports transparency (PNG with alpha channel)
- The beige background in your image will be preserved
- The logo component adds a green glow effect automatically
- You can disable the glow with `showGlow: false`

Your logo is now ready to use! 🌱

