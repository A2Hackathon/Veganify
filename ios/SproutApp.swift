import SwiftUI

@main
struct SproutApp: App {
    @StateObject private var viewModel = SproutViewModel()
    @State private var hasCompletedOnboarding = false
    @State private var userProfile: UserProfile?
    
    var body: some Scene {
        WindowGroup {
            if !hasCompletedOnboarding || userProfile == nil {
                OnboardingView(
                    isComplete: $hasCompletedOnboarding,
                    userProfile: $userProfile
                )
                .onChange(of: userProfile) { newProfile in
                    if let profile = newProfile {
                        viewModel.userProfile = profile
                        Task {
                            await viewModel.loadHomeData()
                        }
                    }
                }
            } else {
                RootView()
                    .environmentObject(viewModel)
                    .task {
                        await viewModel.loadProfile()
                    }
            }
        }
    }
}

