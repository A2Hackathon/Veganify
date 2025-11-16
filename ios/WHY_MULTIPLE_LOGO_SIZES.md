# Why Multiple Logo Sizes?

## The Short Answer

You **don't strictly need** 3 different sizes, but it's recommended for the best quality on all devices.

## The Technical Reason

iOS devices have different screen densities:

- **1x devices** (older): iPhone 6, iPad Mini 2
  - 1 pixel = 1 point
  - Needs: `sprout-logo.png` (200x200px)

- **2x devices** (most common): iPhone 12, 13, 14, 15
  - 1 point = 2 pixels
  - Needs: `sprout-logo@2x.png` (400x400px) for crisp display

- **3x devices** (high-end): iPhone 15 Pro Max, newer iPads
  - 1 point = 3 pixels
  - Needs: `sprout-logo@3x.png` (600x600px) for sharpest display

## What Happens Without Multiple Sizes?

If you only provide one size:

- **iOS will scale it** up or down as needed
- **Quality may suffer** - logo might look blurry or pixelated
- **Performance** - scaling happens at runtime

## The Simple Solution

### Option 1: Just Use One High-Resolution Image (Easiest)

You can add just **one high-resolution image** (600x600px) to the **3x slot**:

1. Export your logo at **600x600px** (highest quality)
2. Save as `sprout-logo@3x.png`
3. Add it to the **3x slot** in Xcode
4. **Leave 1x and 2x empty** - iOS will scale down automatically

**Pros:**
- ✅ Only one file to manage
- ✅ Still looks good on most devices
- ✅ Much simpler

**Cons:**
- ⚠️ Might be slightly less crisp on 1x devices (rare these days)
- ⚠️ Slightly larger file size

### Option 2: Use All 3 Sizes (Best Quality)

Create 3 sizes for optimal quality on all devices.

**Pros:**
- ✅ Perfect quality on all devices
- ✅ Smaller file sizes (each device loads only what it needs)
- ✅ Best performance

**Cons:**
- ⚠️ More work to prepare 3 files

## My Recommendation

**For a hackathon/prototype:** Use **Option 1** (just the 3x image)
- Quick and easy
- Still looks great
- You can add other sizes later if needed

**For production:** Use **Option 2** (all 3 sizes)
- Best user experience
- Professional quality

## How to Do the Simple Version

1. Export your logo at **600x600px** (or higher)
2. Save as `sprout-logo@3x.png`
3. In Xcode, open `Assets.xcassets` → `sprout-logo.imageset`
4. Drag `sprout-logo@3x.png` into the **3x slot only**
5. Leave 1x and 2x empty
6. Done! ✅

iOS will automatically use the 3x image and scale it down for 2x and 1x devices. It will look great!

## Summary

- **Technically required?** No
- **Recommended?** Yes (for best quality)
- **Can you use just one?** Yes! (Use the 3x size)

For your use case, just adding one high-resolution image (600x600px) to the 3x slot is perfectly fine! 🌱

