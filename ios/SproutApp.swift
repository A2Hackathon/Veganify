import SwiftUI

@main
struct SproutApp: App {
    @StateObject private var viewModel = SproutViewModel()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(viewModel)
                .preferredColorScheme(darkModeEnabled ? .dark : .light)
                .task {
                    // Always try to load or create profile on app launch
                    await viewModel.loadProfile()
                }
        }
    }
}

