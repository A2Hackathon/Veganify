# Setting Up the Xcode Project

There are two ways to set up the Xcode project:

## Option 1: Using XcodeGen (Recommended)

XcodeGen is a tool that generates Xcode projects from a YAML file. This is the recommended approach as it keeps the project configuration in a simple, readable format.

### Steps:

1. **Install XcodeGen** (if not already installed):
   ```bash
   brew install xcodegen
   ```

2. **Generate the Xcode project**:
   ```bash
   cd ios
   xcodegen generate
   ```

3. **Open the project**:
   ```bash
   open Sprout.xcodeproj
   ```

## Option 2: Manual Setup in Xcode

If you prefer to create the project manually:

1. **Open Xcode** and create a new project:
   - File → New → Project
   - Choose "iOS" → "App"
   - Product Name: `Sprout`
   - Interface: `SwiftUI`
   - Language: `Swift`
   - Use Core Data: No
   - Include Tests: Optional

2. **Add all Swift files**:
   - Drag all `.swift` files from the `ios/` directory into your Xcode project
   - Make sure "Copy items if needed" is checked
   - Add to target: `Sprout`

3. **Configure Info.plist**:
   - Add camera and photo library permissions:
     - `NSCameraUsageDescription`: "We need camera access to scan ingredient lists and menus."
     - `NSPhotoLibraryUsageDescription`: "We need photo library access to upload images for scanning."

4. **Set deployment target**:
   - Select the project in the navigator
   - Under "Deployment Info", set iOS Deployment Target to `16.0` or higher

5. **Set the entry point**:
   - Make sure `SproutApp.swift` is set as the main entry point
   - The `@main` attribute should be on `SproutApp`

6. **Build and run**:
   - Select a simulator or device
   - Press ⌘R to build and run

## File Structure

After setup, your project should have:

```
Sprout/
├── SproutApp.swift          # App entry point
├── RootView.swift           # Tab navigation
├── Models.swift             # Data models
├── SproutViewModel.swift    # View model
├── DesignSystem.swift       # Design system & colors
├── HomeView.swift           # Home tab
├── ScanView.swift           # Scan tab
├── CookView.swift           # Cook tab
├── GroceryListView.swift    # Grocery list
├── SavedRecipesView.swift   # Saved recipes
├── SettingsView.swift       # Settings tab
├── ImagePicker.swift        # Image picker helper
└── Info.plist               # App configuration
```

## Troubleshooting

- **Build errors**: Make sure all files are added to the target
- **Camera not working**: Verify Info.plist has camera permissions
- **Missing colors**: Ensure `DesignSystem.swift` is included in the target
- **Preview not working**: Make sure you're using Xcode 14+ with SwiftUI preview support

## Next Steps

Once the project is set up:
1. Run the app in the simulator
2. Test all tabs and features
3. Connect to your backend API
4. Add real OCR functionality
5. Integrate AI recipe generation

