import SwiftUI

@main
struct SproutApp: App {
    @StateObject private var viewModel = SproutViewModel()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    
    var body: some Scene {
        WindowGroup {
            if !hasCompletedOnboarding {
                OnboardingView()
                    .environmentObject(viewModel)
                    .onAppear {
                        Task {
                            await viewModel.loadProfile()
                            if viewModel.userProfile != nil {
                                hasCompletedOnboarding = true
                            }
                        }
                    }
            } else {
                RootView()
                    .environmentObject(viewModel)
                    .preferredColorScheme(darkModeEnabled ? .dark : .light)
                    .task {
                        await viewModel.loadProfile()
                    }
            }
        }
    }
}

