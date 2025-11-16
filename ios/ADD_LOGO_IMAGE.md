# How to Add Your Sprout Logo Image 🌱

## Quick Steps

### 1. Prepare Your Image Files

You need **3 versions** of your sprout logo image:

- **sprout-logo.png** - 200x200 pixels (1x)
- **sprout-logo@2x.png** - 400x400 pixels (2x)  
- **sprout-logo@3x.png** - 600x600 pixels (3x)

**Format:** PNG with transparency (to preserve the beige background)

### 2. Add to Xcode Asset Catalog

1. **Open Xcode**
2. **Navigate** to `ios/Assets.xcassets` in the Project Navigator
3. **Click** on `sprout-logo` image set
4. **Drag and drop** your images:
   - Drop `sprout-logo.png` into the **1x** slot
   - Drop `sprout-logo@2x.png` into the **2x** slot
   - Drop `sprout-logo@3x.png` into the **3x** slot

### 3. Verify

You should see all 3 images in the asset catalog preview. The structure should be:

```
Assets.xcassets/
└── sprout-logo.imageset/
    ├── Contents.json
    ├── sprout-logo.png (1x)
    ├── sprout-logo@2x.png (2x)
    └── sprout-logo@3x.png (3x)
```

### 4. Build and Test

1. **Clean build folder**: `⌘ShiftK` (Command + Shift + K)
2. **Build**: `⌘B` (Command + B)
3. **Run**: `⌘R` (Command + R)

Your logo should now appear:
- ✅ On the welcome screen (large, animated)
- ✅ On the home screen (in the sprout card)
- ✅ Throughout the app where the logo is used

## Where Your Logo Appears

1. **Welcome Screen** - Large animated logo with green glow
2. **Home Screen** - Medium logo in the sprout level card
3. **App Icon** - Can be configured as app icon

## If You Only Have One Image

If you only have one image file, you can:

1. **Export at highest quality** (600x600px recommended)
2. **Create 3 sizes** using:
   - **Mac Preview**: Tools → Adjust Size
   - **Online tools**: [ImageResizer.com](https://imageresizer.com/)
   - **Photoshop/GIMP**: Export at different sizes

3. **Save as:**
   - `sprout-logo.png` (200x200)
   - `sprout-logo@2x.png` (400x400)
   - `sprout-logo@3x.png` (600x600)

## Troubleshooting

**Logo not showing?**
- ✅ Check file names match exactly
- ✅ Verify images are in the correct slots (1x, 2x, 3x)
- ✅ Clean build folder and rebuild
- ✅ Check Xcode console for errors

**Logo looks blurry?**
- ✅ Use high-resolution source (at least 600x600px)
- ✅ Ensure all 3 sizes are properly added

**Logo too big/small?**
- ✅ The logo component sizes are customizable
- ✅ Edit `SproutLogo.swift` to adjust default sizes

## Current Logo Implementation

The logo is already integrated in the code:

- ✅ `SproutLogo.swift` - Reusable logo component
- ✅ `OnboardingView.swift` - Uses logo on welcome screen
- ✅ `HomeView.swift` - Uses logo in sprout card
- ✅ Asset catalog structure ready

**You just need to add the actual image files!**

## Image Requirements

- **Format**: PNG (supports transparency)
- **Background**: Can be transparent or beige (your choice)
- **Style**: Matches your green sprout design
- **Quality**: High resolution for crisp display

Once you add the images, your beautiful sprout logo will appear throughout the app! 🌱✨

