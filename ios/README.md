# Xcode Project Setup

## ✅ Xcode Project Created!

The Xcode project file has been created at:
```
ios/Sprout.xcodeproj
```

## How to Open

### On macOS:

1. **Navigate to the ios directory:**
   ```bash
   cd ios
   ```

2. **Open in Xcode:**
   ```bash
   open Sprout.xcodeproj
   ```
   
   Or simply double-click `Sprout.xcodeproj` in Finder.

### On Windows (Transfer to macOS):

Since you're on Windows, you'll need to:
1. Transfer the entire `ios/` folder to a Mac
2. Open the project in Xcode on macOS
3. Build and run

## Project Configuration

The project is configured with:
- **Bundle Identifier:** `com.veganify.Sprout`
- **Deployment Target:** iOS 16.0
- **Swift Version:** 5.0
- **Language:** Swift
- **Interface:** SwiftUI

## Included Files

All Swift files are included in the project:
- ✅ SproutApp.swift (entry point)
- ✅ RootView.swift
- ✅ Models.swift
- ✅ SproutViewModel.swift
- ✅ DesignSystem.swift
- ✅ HomeView.swift
- ✅ ScanView.swift
- ✅ CookView.swift
- ✅ GroceryListView.swift
- ✅ SavedRecipesView.swift
- ✅ SettingsView.swift
- ✅ ImagePicker.swift
- ✅ Info.plist (with camera permissions)

## First Steps After Opening

1. **Select a Simulator:**
   - Choose an iOS Simulator from the device dropdown (top toolbar)
   - Recommended: iPhone 15 Pro or iPhone 15

2. **Build the Project:**
   - Press `⌘B` (Command + B) to build
   - Check for any errors in the Issue Navigator

3. **Run the App:**
   - Press `⌘R` (Command + R) or click the Play button
   - The app should launch in the simulator

## Optional: Add App Icons

1. In Xcode, right-click in the navigator
2. Select "New File..."
3. Choose "Asset Catalog"
4. Name it `Assets.xcassets`
5. Add your app icon images

## Troubleshooting

### "No such module" errors
- Make sure all Swift files are added to the target
- Clean build folder: `⌘ShiftK` then rebuild

### Build errors
- Verify all files are in the "Compile Sources" build phase
- Check that Info.plist is properly referenced

### Camera permissions
- Info.plist already includes camera and photo library permissions
- Test on a real device for full camera functionality

## Project Structure

```
ios/
├── Sprout.xcodeproj/              # Xcode project
│   ├── project.pbxproj            # Project configuration
│   ├── project.xcworkspace/       # Workspace settings
│   └── xcshareddata/              # Shared schemes
├── SproutApp.swift                # App entry point
├── RootView.swift                 # Tab navigation
├── Models.swift                   # Data models
├── SproutViewModel.swift          # View model
├── DesignSystem.swift             # Design system
├── HomeView.swift                 # Home tab
├── ScanView.swift                 # Scan tab
├── CookView.swift                 # Cook tab
├── GroceryListView.swift          # Grocery list
├── SavedRecipesView.swift         # Saved recipes
├── SettingsView.swift             # Settings tab
├── ImagePicker.swift              # Image picker helper
└── Info.plist                     # App configuration
```

## Next Steps

1. ✅ Open project in Xcode
2. ✅ Build and test in simulator
3. 🔄 Add app icons and assets
4. 🔄 Connect to backend API
5. 🔄 Implement real OCR
6. 🔄 Add AI recipe generation

Happy coding! 🌱

