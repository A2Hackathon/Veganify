import SwiftUI

// MARK: - Root View

struct RootView: View {
    @StateObject private var vm = SproutViewModel()
    @State private var selectedTab: SproutTab = .home
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .environmentObject(vm)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(SproutTab.home)
            
            ScanView()
                .environmentObject(vm)
                .tabItem {
                    Image(systemName: "camera.viewfinder")
                    Text("Scan")
                }
                .tag(SproutTab.scan)
            
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
    }
}

