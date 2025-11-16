# SPR🌱UT iOS App

A SwiftUI-based iOS app for vegan cooking assistance with ingredient scanning, recipe generation, and grocery list management.

## Project Structure

- `SproutApp.swift` - App entry point
- `RootView.swift` - Main tab navigation
- `Models.swift` - Data models (Mission, ChatMessage, GroceryItem, etc.)
- `SproutViewModel.swift` - Main view model with app state
- `HomeView.swift` - Home tab with sprout, missions, streak, and coins
- `ScanView.swift` - Camera/photo library scanning interface
- `CookView.swift` - Chat-style cooking assistant
- `GroceryListView.swift` - Grocery list manager
- `SavedRecipesView.swift` - Saved recipes display
- `SettingsView.swift` - App settings and preferences
- `ImagePicker.swift` - UIImagePickerController wrapper

## Setup Instructions

1. **Create a new Xcode project:**
   - Open Xcode
   - Create a new iOS App project
   - Choose SwiftUI as the interface
   - Name it "Sprout" (or your preferred name)

2. **Add the Swift files:**
   - Copy all `.swift` files from this `ios/` directory into your Xcode project
   - Make sure they're added to your app target

3. **Update Info.plist for camera access:**
   Add these keys to your `Info.plist`:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>We need camera access to scan ingredient lists and menus.</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>We need photo library access to upload images for scanning.</string>
   ```

4. **Run the app:**
   - Select an iOS Simulator or device
   - Build and run (⌘R)

## Features

- **Home Tab**: View your sprout, level, XP, coins, missions, and streak
- **Scan Tab**: Take photos or upload images to scan ingredient lists
- **Cook Tab**: Chat with AI assistant for recipe suggestions and veganization
- **Settings Tab**: Adjust preferences, profile, and app settings

## Next Steps

- Connect to backend API for real OCR and AI recipe generation
- Add image assets for recipe placeholders
- Implement real camera scanning with OCR
- Add persistence for user data
- Enhance UI with custom colors and animations

