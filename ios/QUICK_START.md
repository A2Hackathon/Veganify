# Quick Start Guide - Opening the Xcode Project

## Option 1: Open Directly in Xcode (macOS)

1. **Navigate to the project:**
   ```bash
   cd ios
   ```

2. **Open the Xcode project:**
   ```bash
   open Sprout.xcodeproj
   ```
   
   Or double-click `Sprout.xcodeproj` in Finder.

3. **Select a simulator or device:**
   - Choose an iOS Simulator from the device dropdown (top toolbar)
   - Or connect a physical iOS device

4. **Build and run:**
   - Press `⌘R` (Command + R) or click the Play button
   - The app will build and launch in the simulator

## Option 2: Using XcodeGen (Alternative)

If you prefer to regenerate the project using XcodeGen:

1. **Install XcodeGen** (if not installed):
   ```bash
   brew install xcodegen
   ```

2. **Generate the project:**
   ```bash
   cd ios
   ./generate-project.sh
   ```

## Important Notes

### File Structure
The Xcode project expects all Swift files to be in the same directory as the `.xcodeproj` file (the `ios/` directory). The project file references:
- All `.swift` files directly
- `Info.plist` in the same directory
- Optional `Assets.xcassets` for app icons (you can add this later)

### First Time Setup

1. **Add Assets (Optional):**
   - Right-click in Xcode navigator → New File
   - Choose "Asset Catalog"
   - Name it `Assets.xcassets`
   - Add your app icon and accent colors

2. **Verify Info.plist:**
   - Make sure `Info.plist` includes camera and photo library permissions
   - These are already configured in the existing `Info.plist`

3. **Check Build Settings:**
   - Deployment Target: iOS 16.0
   - Swift Version: 5.0
   - Bundle Identifier: `com.veganify.Sprout`

### Troubleshooting

**"No such module" errors:**
- Make sure all Swift files are added to the target
- Clean build folder: `⌘ShiftK` then rebuild

**"Missing Info.plist":**
- The project references `Info.plist` in the same directory
- Make sure it exists in the `ios/` folder

**Build errors:**
- Check that all files are included in the "Compile Sources" build phase
- Verify Swift version compatibility (iOS 16.0+)

**Camera not working:**
- Verify `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` are in Info.plist
- Test on a real device (simulator camera access may be limited)

## Project Structure

```
ios/
├── Sprout.xcodeproj/          # Xcode project file
│   ├── project.pbxproj        # Project configuration
│   └── xcshareddata/          # Shared schemes
├── SproutApp.swift            # App entry point
├── RootView.swift             # Tab navigation
├── Models.swift               # Data models
├── SproutViewModel.swift      # View model
├── DesignSystem.swift         # Design system
├── HomeView.swift            # Home tab
├── ScanView.swift             # Scan tab
├── CookView.swift             # Cook tab
├── GroceryListView.swift      # Grocery list
├── SavedRecipesView.swift      # Saved recipes
├── SettingsView.swift         # Settings tab
├── ImagePicker.swift          # Image picker helper
└── Info.plist                 # App configuration
```

## Next Steps

1. ✅ Open the project in Xcode
2. ✅ Build and run in simulator
3. 🔄 Add app icons and assets
4. 🔄 Connect to backend API
5. 🔄 Add real OCR functionality
6. 🔄 Integrate AI recipe generation

Happy coding! 🌱

