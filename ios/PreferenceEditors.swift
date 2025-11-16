import SwiftUI

// MARK: - Preference Editor Views

struct DietaryRestrictionsEditorView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedRestrictions: [String] = []
    @State private var freeText: String = ""
    @State private var isParsing: Bool = false
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.sproutBackground, Color(.systemBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // Predefined chips
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Common Restrictions")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.sproutGreenDark)
                            .padding(.horizontal, 20)
                        
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 12) {
                            ForEach(DietaryRestrictionChip.allCases) { chip in
                                DietaryRestrictionChipView(
                                    chip: chip,
                                    isSelected: selectedRestrictions.contains(chip.rawValue)
                                ) {
                                    if selectedRestrictions.contains(chip.rawValue) {
                                        selectedRestrictions.removeAll { $0 == chip.rawValue }
                                    } else {
                                        selectedRestrictions.append(chip.rawValue)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    // Free text input
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Or describe your restrictions")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.sproutGreenDark)
                            .padding(.horizontal, 20)
                        
                        HStack(spacing: 12) {
                            TextField("e.g., allergic to peanuts", text: $freeText, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(3...6)
                            
                            Button {
                                parseFreeText()
                            } label: {
                                if isParsing {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.sproutGreen)
                                } else {
                                    Image(systemName: "sparkles")
                                        .font(.title3)
                                        .foregroundColor(.sproutGreen)
                                }
                            }
                            .disabled(freeText.isEmpty || isParsing)
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Button {
                        saveRestrictions()
                    } label: {
                        Text("Save")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
                .padding(.top, 20)
            }
        }
        .onAppear {
            selectedRestrictions = vm.userProfile?.dietaryRestrictions ?? []
        }
        .onChange(of: vm.userProfile?.dietaryRestrictions) { newValue in
            if let newValue = newValue {
                selectedRestrictions = newValue
            }
        }
        .navigationTitle("Dietary Restrictions")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func parseFreeText() {
        guard !freeText.isEmpty, let userId = vm.userProfile?.id else { return }
        isParsing = true
        
        Task {
            do {
                let response = try await APIClient.shared.parseDietaryRestrictions(
                    text: freeText,
                    userId: userId
                )
                
                await MainActor.run {
                    for restriction in response.restrictions {
                        if !selectedRestrictions.contains(restriction) {
                            selectedRestrictions.append(restriction)
                        }
                    }
                    freeText = ""
                    isParsing = false
                }
            } catch {
                await MainActor.run {
                    isParsing = false
                    if !selectedRestrictions.contains(freeText) {
                        selectedRestrictions.append(freeText)
                    }
                    freeText = ""
                }
            }
        }
    }
    
    private func saveRestrictions() {
        Task {
            // Ensure profile is loaded before saving
            if vm.userProfile == nil {
                print("🔄 Profile not loaded, loading now...")
                await vm.loadProfile()
                
                // Wait a moment and check again
                try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
            }
            
            // Double-check profile is available
            if vm.userProfile == nil {
                print("❌ Profile still nil after loadProfile. Attempting to create default...")
                await vm.loadProfile() // Try again
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
            }
            
            guard var profile = vm.userProfile else {
                print("❌ Cannot save: No user profile after loading attempt")
                print("   UserDefaults userId: \(UserDefaults.standard.string(forKey: "currentUserId") ?? "nil")")
                await MainActor.run {
                    dismiss()
                }
                return
            }
            
            let userId = profile.id
            profile.dietaryRestrictions = selectedRestrictions
            await vm.updateProfile(profile)
            
            // Reload profile from server to verify it was saved
            do {
                print("🔄 Reloading profile from server to verify save...")
                let reloadedProfile = try await APIClient.shared.getProfile(userId: userId)
                await MainActor.run {
                    vm.userProfile = reloadedProfile
                    print("✅ Profile reloaded - restrictions: \(reloadedProfile.dietaryRestrictions)")
                    dismiss()
                }
            } catch {
                print("⚠️ Failed to reload profile, but update may have succeeded: \(error)")
                // Still dismiss even if reload fails
                await MainActor.run {
                    dismiss()
                }
            }
        }
    }
}

struct CuisinePreferencesEditorView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedCuisines: [String] = []
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.sproutBackground, Color(.systemBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 16) {
                        ForEach(CuisineOption.allCases) { cuisine in
                            CuisineCard(
                                cuisine: cuisine,
                                isSelected: selectedCuisines.contains(cuisine.rawValue)
                            ) {
                                if selectedCuisines.contains(cuisine.rawValue) {
                                    selectedCuisines.removeAll { $0 == cuisine.rawValue }
                                } else {
                                    selectedCuisines.append(cuisine.rawValue)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    Button {
                        saveCuisines()
                    } label: {
                        Text("Save")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
            selectedCuisines = vm.userProfile?.cuisinePreferences ?? []
        }
        .onChange(of: vm.userProfile?.cuisinePreferences) { newValue in
            if let newValue = newValue {
                selectedCuisines = newValue
            }
        }
        .navigationTitle("Cuisine Preferences")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func saveCuisines() {
        Task {
            // Ensure profile is loaded before saving
            if vm.userProfile == nil {
                print("🔄 Profile not loaded, loading now...")
                await vm.loadProfile()
                try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
            }
            
            if vm.userProfile == nil {
                print("❌ Profile still nil after loadProfile. Attempting to create default...")
                await vm.loadProfile() // Try again
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
            }
            
            guard var profile = vm.userProfile else {
                print("❌ Cannot save: No user profile after loading attempt")
                print("   UserDefaults userId: \(UserDefaults.standard.string(forKey: "currentUserId") ?? "nil")")
                await MainActor.run {
                    dismiss()
                }
                return
            }
            
            let userId = profile.id
            profile.cuisinePreferences = selectedCuisines
            await vm.updateProfile(profile)
            
            // Reload profile from server to verify it was saved
            do {
                print("🔄 Reloading profile from server to verify save...")
                let reloadedProfile = try await APIClient.shared.getProfile(userId: userId)
                await MainActor.run {
                    vm.userProfile = reloadedProfile
                    print("✅ Profile reloaded - cuisines: \(reloadedProfile.cuisinePreferences)")
                    dismiss()
                }
            } catch {
                print("⚠️ Failed to reload profile, but update may have succeeded: \(error)")
                await MainActor.run {
                    dismiss()
                }
            }
        }
    }
}

struct CookingStyleEditorView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedStyles: [String] = []
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.sproutBackground, Color(.systemBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                        ForEach(CookingStyleOption.allCases) { style in
                            CookingStyleCard(
                                style: style,
                                isSelected: selectedStyles.contains(style.rawValue)
                            ) {
                                if selectedStyles.contains(style.rawValue) {
                                    selectedStyles.removeAll { $0 == style.rawValue }
                                } else {
                                    selectedStyles.append(style.rawValue)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    Button {
                        saveStyles()
                    } label: {
                        Text("Save")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                    }
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
            selectedStyles = vm.userProfile?.cookingStylePreferences ?? []
        }
        .onChange(of: vm.userProfile?.cookingStylePreferences) { newValue in
            if let newValue = newValue {
                selectedStyles = newValue
            }
        }
        .navigationTitle("Cooking Style")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func saveStyles() {
        Task {
            // Ensure profile is loaded before saving
            if vm.userProfile == nil {
                print("🔄 Profile not loaded, loading now...")
                await vm.loadProfile()
                try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
            }
            
            if vm.userProfile == nil {
                print("❌ Profile still nil after loadProfile. Attempting to create default...")
                await vm.loadProfile() // Try again
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
            }
            
            guard var profile = vm.userProfile else {
                print("❌ Cannot save: No user profile after loading attempt")
                print("   UserDefaults userId: \(UserDefaults.standard.string(forKey: "currentUserId") ?? "nil")")
                await MainActor.run {
                    dismiss()
                }
                return
            }
            
            let userId = profile.id
            profile.cookingStylePreferences = selectedStyles
            await vm.updateProfile(profile)
            
            // Reload profile from server to verify it was saved
            do {
                print("🔄 Reloading profile from server to verify save...")
                let reloadedProfile = try await APIClient.shared.getProfile(userId: userId)
                await MainActor.run {
                    vm.userProfile = reloadedProfile
                    print("✅ Profile reloaded - cooking styles: \(reloadedProfile.cookingStylePreferences)")
                    dismiss()
                }
            } catch {
                print("⚠️ Failed to reload profile, but update may have succeeded: \(error)")
                await MainActor.run {
                    dismiss()
                }
            }
        }
    }
}

struct EatingStyleEditorView: View {
    @EnvironmentObject var vm: SproutViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedStyle: EatingStyle?
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.sproutBackground, Color(.systemBackground)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 16) {
                        ForEach(EatingStyle.allCases) { style in
                            EatingStyleCard(
                                style: style,
                                isSelected: selectedStyle == style
                            ) {
                                selectedStyle = style
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    Button {
                        saveStyle()
                    } label: {
                        Text("Save")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                    }
                    .disabled(selectedStyle == nil)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
            if let styleString = vm.userProfile?.eatingStyle,
               let style = EatingStyle.allCases.first(where: { $0.rawValue == styleString }) {
                selectedStyle = style
            }
        }
        .onChange(of: vm.userProfile?.eatingStyle) { newValue in
            if let styleString = newValue,
               let style = EatingStyle.allCases.first(where: { $0.rawValue == styleString }) {
                selectedStyle = style
            }
        }
        .navigationTitle("Eating Style")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func saveStyle() {
        guard let style = selectedStyle else { return }
        Task {
            // Ensure profile is loaded before saving
            if vm.userProfile == nil {
                print("🔄 Profile not loaded, loading now...")
                await vm.loadProfile()
                try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
            }
            
            if vm.userProfile == nil {
                print("❌ Profile still nil after loadProfile. Attempting to create default...")
                await vm.loadProfile() // Try again
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
            }
            
            guard var profile = vm.userProfile else {
                print("❌ Cannot save: No user profile after loading attempt")
                print("   UserDefaults userId: \(UserDefaults.standard.string(forKey: "currentUserId") ?? "nil")")
                await MainActor.run {
                    dismiss()
                }
                return
            }
            
            let userId = profile.id
            profile.eatingStyle = style.rawValue
            await vm.updateProfile(profile)
            
            // Reload profile from server to verify it was saved
            do {
                print("🔄 Reloading profile from server to verify save...")
                let reloadedProfile = try await APIClient.shared.getProfile(userId: userId)
                await MainActor.run {
                    vm.userProfile = reloadedProfile
                    print("✅ Profile reloaded - eating style: \(reloadedProfile.eatingStyle)")
                    dismiss()
                }
            } catch {
                print("⚠️ Failed to reload profile, but update may have succeeded: \(error)")
                await MainActor.run {
                    dismiss()
                }
            }
        }
    }
}

