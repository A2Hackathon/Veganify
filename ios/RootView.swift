import SwiftUI

// MARK: - Root View

struct RootView: View {
    @StateObject private var vm = SproutViewModel()
    @State private var selectedTab: SproutTab = .home
    @State private var showOnboarding = false
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    
    var body: some View {
        Group {
            if !hasCompletedOnboarding {
                OnboardingView()
                    .onAppear {
                        Task {
                            await vm.loadProfile()
                            if vm.userProfile != nil {
                                hasCompletedOnboarding = true
                            }
                        }
                    }
            } else {
                TabView(selection: $selectedTab) {
                    HomeView()
                        .environmentObject(vm)
                        .tabItem {
                            Image(systemName: "house.fill")
                            Text("Home")
                        }
                        .tag(SproutTab.home)
                    
                    // Pass userId to ScanView
                    if let userId = vm.userProfile?._id {
                        ScanView(userId: userId)
                            .environmentObject(vm)
                            .tabItem {
                                Image(systemName: "camera.viewfinder")
                                Text("Scan")
                            }
                            .tag(SproutTab.scan)
                    }

                    CookView()
                        .environmentObject(vm)
                        .tabItem {
                            Image(systemName: "fork.knife")
                            Text("Cook")
                        }
                        .tag(SproutTab.cook)
                    
                    SettingsView()
                        .environmentObject(vm)
                        .tabItem {
                            Image(systemName: "gearshape.fill")
                            Text("Settings")
                        }
                        .tag(SproutTab.settings)
                }
                .accentColor(.sproutGreen)
                .preferredColorScheme(darkModeEnabled ? .dark : .light)
                .onAppear {
                    Task {
                        await vm.loadProfile()
                        await vm.loadHomeData()
                        await vm.loadGroceryList()
                        await vm.loadSavedRecipes()
                    }
                }
            }
        }
        .onChange(of: vm.userProfile) { profile in
            if profile != nil && !hasCompletedOnboarding {
                hasCompletedOnboarding = true
            }
        }
    }
}
