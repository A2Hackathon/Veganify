import SwiftUI

// MARK: - Root View

struct RootView: View {
    @StateObject private var vm = SproutViewModel()
    @State private var selectedTab: SproutTab = .home
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    
    var body: some View {
        Group {
            if !hasCompletedOnboarding {
                // Onboarding flow
                OnboardingView()
                    .environmentObject(vm)
            } else {
                // Main app tabs
                TabView(selection: $selectedTab) {
                    HomeView()
                        .tabItem {
                            Image(systemName: "house.fill")
                            Text("Home")
                        }
                        .tag(SproutTab.home)
                    
                    // Only show Scan tab if we have a userId.
                    // The 'else { EmptyView() }' resolves the generic inference issue.
                    if let userId = vm.userProfile?.id {
                        ScanView(userId: userId)
                            .tabItem {
                                Image(systemName: "camera.viewfinder")
                                Text("Scan")
                            }
                            .tag(SproutTab.scan)
                    } else {
                        EmptyView() // Fix is here!
                    }
                    
                    CookView()
                        .tabItem {
                            Image(systemName: "fork.knife")
                            Text("Cook")
                        }
                        .tag(SproutTab.cook)
                    
                    SettingsView()
                        .tabItem {
                            Image(systemName: "gearshape.fill")
                            Text("Settings")
                        }
                        .tag(SproutTab.settings)
                }
            }
        }
        // One place to inject the view model
        .environmentObject(vm)
        .accentColor(.sproutGreen)
        .preferredColorScheme(darkModeEnabled ? .dark : .light)
        // Single async startup task
        .task {
            // Load profile first
            await vm.loadProfile()
            
            // If a profile already exists, skip onboarding
            if vm.userProfile != nil {
                hasCompletedOnboarding = true
            }
            
            // Then load home + cook data
            await vm.loadHomeData()
            await vm.loadGroceryList()
            await vm.loadSavedRecipes()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("OnboardingCompleted"))) { _ in
            // Force refresh when onboarding completes
            hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
        }
    }
}