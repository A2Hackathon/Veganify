# Xcode Project Setup

## Project Configuration

The project is configured with:
- **Bundle Identifier:** `com.veganify.Sprout`
- **Deployment Target:** iOS 16.0
- **Swift Version:** 5.0
- **Language:** Swift
- **Interface:** SwiftUI

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