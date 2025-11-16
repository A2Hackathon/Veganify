import SwiftUI

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var vm: SproutViewModel
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                List {
                    Section {
                        NavigationLink {
                            Text("Eating Style Editor Placeholder")
                                .navigationTitle("Eating Style")
                        } label: {
                            Label("Eating Style (Vegan Level)", systemImage: "leaf.fill")
                                .foregroundColor(.sproutGreen)
                        }
                        
                        NavigationLink {
                            Text("Dietary Restrictions Editor Placeholder")
                                .navigationTitle("Dietary Restrictions")
                        } label: {
                            Label("Dietary Restrictions", systemImage: "exclamationmark.shield.fill")
                                .foregroundColor(.sproutGreen)
                        }
                        
                        NavigationLink {
                            Text("Cuisine Preferences Editor Placeholder")
                                .navigationTitle("Cuisine Preferences")
                        } label: {
                            Label("Cuisine Preferences", systemImage: "globe.asia.australia.fill")
                                .foregroundColor(.sproutGreen)
                        }
                        
                        NavigationLink {
                            Text("Cooking Style Preferences Editor Placeholder")
                                .navigationTitle("Cooking Style")
                        } label: {
                            Label("Cooking Style Preferences", systemImage: "flame.fill")
                                .foregroundColor(.sproutGreen)
                        }
                    } header: {
                        Text("Adjust Preferences")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                    }
                    
                    Section {
                        NavigationLink {
                            ProfileEditView()
                                .environmentObject(vm)
                        } label: {
                            Label("Edit Name & Sprout Name", systemImage: "person.fill")
                                .foregroundColor(.sproutGreen)
                        }
                    } header: {
                        Text("Sprout Profile")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                    }
                    
                    Section {
                        Toggle(isOn: .constant(true)) {
                            Label("Daily mission reminders", systemImage: "bell.fill")
                        }
                        .tint(.sproutGreen)
                        
                        Toggle(isOn: .constant(true)) {
                            Label("Streak reminders", systemImage: "flame.fill")
                        }
                        .tint(.sproutOrange)
                        
                        Toggle(isOn: .constant(true)) {
                            Label("New recipe suggestions", systemImage: "sparkles")
                        }
                        .tint(.sproutGreen)
                    } header: {
                        Text("Notifications")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                    }
                    
                    Section {
                        Toggle(isOn: .constant(false)) {
                            Label("Dark Mode (system)", systemImage: "moon.fill")
                        }
                        .tint(.sproutGreen)
                        
                        NavigationLink {
                            Text("Theme Selector Placeholder")
                                .navigationTitle("Home Theme")
                        } label: {
                            Label("Home Theme", systemImage: "paintpalette.fill")
                                .foregroundColor(.sproutGreen)
                        }
                    } header: {
                        Text("Appearance")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                    }
                    
                    Section {
                        NavigationLink {
                            Text("FAQ Placeholder")
                        } label: {
                            Label("FAQ", systemImage: "questionmark.circle.fill")
                                .foregroundColor(.sproutGreen)
                        }
                        
                        NavigationLink {
                            Text("XP Explanation Placeholder")
                        } label: {
                            Label("How XP works", systemImage: "star.fill")
                                .foregroundColor(.sproutYellow)
                        }
                        
                        NavigationLink {
                            Text("Feedback Placeholder")
                        } label: {
                            Label("Send Feedback", systemImage: "envelope.fill")
                                .foregroundColor(.sproutGreen)
                        }
                    } header: {
                        Text("Help & Info")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                    }
                    
                    Section {
                        Button(role: .destructive) {
                            // logout logic
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Log Out")
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ProfileEditView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    @State private var userName: String = ""
    @State private var sproutName: String = ""
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.sproutBackground, Color(.systemBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            Form {
                Section {
                    TextField("Your name", text: $userName)
                        .font(.system(size: 16, design: .rounded))
                    TextField("Sprout name", text: $sproutName)
                        .font(.system(size: 16, design: .rounded))
                } header: {
                    Text("Profile")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                }
                
                Section {
                    Button {
                        Task {
                            if var profile = vm.userProfile {
                                if !userName.isEmpty {
                                    profile.userName = userName
                                }
                                if !sproutName.isEmpty {
                                    profile.sproutName = sproutName
                                }
                                await vm.updateProfile(profile)
                            }
                        }
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Save Changes")
                                .font(.system(size: 17, weight: .semibold, design: .rounded))
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.vertical, 8)
                        .background(
                            LinearGradient(
                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                    }
                    .listRowBackground(Color.clear)
                }
            }
            .scrollContentBackground(.hidden)
        }
        .onAppear {
            userName = vm.userName
            sproutName = vm.sproutName
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
    }
}

