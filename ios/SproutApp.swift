import SwiftUI

@main
struct SproutApp: App {
    @StateObject private var viewModel = SproutViewModel()
    @State private var hasCompletedOnboarding = false
    
    var body: some Scene {
        WindowGroup {
            if !hasCompletedOnboarding {
                OnboardingView()
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
                    .task {
                        await viewModel.loadProfile()
                    }
            }
        }
    }
}

