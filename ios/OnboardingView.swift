import SwiftUI

// MARK: - Onboarding Container

struct OnboardingView: View {
    @StateObject private var viewModel = OnboardingViewModel()
    @State private var currentStep = 0
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var sproutViewModel: SproutViewModel
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.sproutBackground,
                    Color.sproutGreen.opacity(0.05),
                    Color(.systemBackground)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Progress indicator
                if currentStep > 0 && currentStep < 6 {
                    ProgressView(value: Double(currentStep), total: 6)
                        .progressViewStyle(.linear)
                        .tint(
                            LinearGradient(
                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .scaleEffect(x: 1, y: 2, anchor: .center)
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                }
                
                // Step content
                TabView(selection: $currentStep) {
                    WelcomeStep(currentStep: $currentStep)
                        .tag(0)
                    
                    EatingStyleStep(viewModel: viewModel, currentStep: $currentStep)
                        .tag(1)
                    
                    DietaryRestrictionsStep(viewModel: viewModel, currentStep: $currentStep)
                        .tag(2)
                    
                    CuisinePreferencesStep(viewModel: viewModel, currentStep: $currentStep)
                        .tag(3)
                    
                    CookingStyleStep(viewModel: viewModel, currentStep: $currentStep)
                        .tag(4)
                    
                    ReviewStep(viewModel: viewModel, currentStep: $currentStep)
                        .tag(5)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
    }
}

// MARK: - Step 1: Welcome

struct WelcomeStep: View {
    @Binding var currentStep: Int
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            // Sprout icon
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.sproutGreen.opacity(0.3),
                                Color.sproutGreen.opacity(0.1),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 40,
                            endRadius: 150
                        )
                    )
                    .frame(width: 300, height: 300)
                
                Image(systemName: "leaf.fill")
                    .font(.system(size: 120))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: Color.sproutGreen.opacity(0.4), radius: 20, x: 0, y: 10)
            }
            
            VStack(spacing: 16) {
                Text("Welcome to Sprout")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(.sproutGreenDark)
                
                Text("Grow with every bite.")
                    .font(.system(size: 20, weight: .medium, design: .rounded))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(spacing: 16) {
                Button {
                    withAnimation {
                        currentStep = 1
                    }
                } label: {
                    Text("Get Started")
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
                        .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 60)
        }
    }
}

// MARK: - Step 2: Eating Style

struct EatingStyleStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("What's your eating style?")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                        .multilineTextAlignment(.center)
                    
                    Text("Choose the option that best describes you")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                
                VStack(spacing: 16) {
                    ForEach(EatingStyle.allCases) { style in
                        EatingStyleCard(
                            style: style,
                            isSelected: viewModel.data.eatingStyle == style
                        ) {
                            viewModel.data.eatingStyle = style
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Button {
                    if viewModel.data.eatingStyle != nil {
                        withAnimation {
                            currentStep = 2
                        }
                    }
                } label: {
                    Text("Continue")
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            viewModel.data.eatingStyle != nil ?
                            LinearGradient(
                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                startPoint: .leading,
                                endPoint: .trailing
                            ) :
                            LinearGradient(colors: [Color.gray, Color.gray], startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(16)
                        .shadow(color: viewModel.data.eatingStyle != nil ? Color.sproutGreen.opacity(0.3) : Color.clear, radius: 8, x: 0, y: 4)
                }
                .disabled(viewModel.data.eatingStyle == nil)
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
    }
}

struct EatingStyleCard: View {
    let style: EatingStyle
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(style.rawValue)
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                    
                    Text(style.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
                
                ZStack {
                    Circle()
                        .fill(isSelected ? Color.sproutGreen : Color(.secondarySystemBackground))
                        .frame(width: 24, height: 24)
                    
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(20)
            .background(
                isSelected ?
                LinearGradient(
                    colors: [Color.sproutGreen.opacity(0.15), Color.sproutGreen.opacity(0.05)],
                    startPoint: .leading,
                    endPoint: .trailing
                ) :
                LinearGradient(
                    colors: [Color(.systemBackground), Color(.systemBackground)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.sproutGreen : Color.clear, lineWidth: 2)
            )
            .shadow(color: isSelected ? Color.sproutGreen.opacity(0.2) : Color.black.opacity(0.05), radius: isSelected ? 8 : 4, x: 0, y: 2)
        }
    }
}

// MARK: - Step 3: Dietary Restrictions

struct DietaryRestrictionsStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    @State private var freeText: String = ""
    @State private var isParsing: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Any dietary restrictions?")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                        .multilineTextAlignment(.center)
                    
                    Text("Select from common options or describe your restrictions")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 60)
                .padding(.horizontal, 20)
                
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
                                isSelected: viewModel.data.dietaryRestrictions.contains(chip.rawValue)
                            ) {
                                if viewModel.data.dietaryRestrictions.contains(chip.rawValue) {
                                    viewModel.data.dietaryRestrictions.removeAll { $0 == chip.rawValue }
                                } else {
                                    viewModel.data.dietaryRestrictions.append(chip.rawValue)
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
                        TextField("e.g., allergic to peanuts, avoid palm oil", text: $freeText, axis: .vertical)
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
                    withAnimation {
                        currentStep = 3
                    }
                } label: {
                    Text("Continue")
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
                        .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
    }
    
    private func parseFreeText() {
        guard !freeText.isEmpty else { return }
        isParsing = true
        
        Task {
            do {
                let response = try await APIClient.shared.parseDietaryRestrictions(
                    text: freeText,
                    userId: "temp" // Will be replaced with actual user ID
                )
                
                await MainActor.run {
                    // Add parsed restrictions
                    for restriction in response.restrictions {
                        if !viewModel.data.dietaryRestrictions.contains(restriction) {
                            viewModel.data.dietaryRestrictions.append(restriction)
                        }
                    }
                    freeText = ""
                    isParsing = false
                }
            } catch {
                await MainActor.run {
                    isParsing = false
                    // Show error or add as-is
                    if !viewModel.data.dietaryRestrictions.contains(freeText) {
                        viewModel.data.dietaryRestrictions.append(freeText)
                    }
                    freeText = ""
                }
            }
        }
    }
}

struct DietaryRestrictionChipView: View {
    let chip: DietaryRestrictionChip
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(chip.displayName)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(isSelected ? .white : .sproutGreenDark)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    isSelected ?
                    LinearGradient(
                        colors: [Color.sproutGreen, Color.sproutGreenDark],
                        startPoint: .leading,
                        endPoint: .trailing
                    ) :
                    LinearGradient(
                        colors: [Color.sproutGreen.opacity(0.1), Color.sproutGreen.opacity(0.05)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? Color.clear : Color.sproutGreen.opacity(0.3), lineWidth: 1)
                )
        }
    }
}

// MARK: - Step 4: Cuisine Preferences

struct CuisinePreferencesStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Favorite cuisines?")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                        .multilineTextAlignment(.center)
                    
                    Text("Select all that you enjoy")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                .padding(.horizontal, 20)
                
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 16) {
                    ForEach(CuisineOption.allCases) { cuisine in
                        CuisineCard(
                            cuisine: cuisine,
                            isSelected: viewModel.data.cuisinePreferences.contains(cuisine.rawValue)
                        ) {
                            if viewModel.data.cuisinePreferences.contains(cuisine.rawValue) {
                                viewModel.data.cuisinePreferences.removeAll { $0 == cuisine.rawValue }
                            } else {
                                viewModel.data.cuisinePreferences.append(cuisine.rawValue)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Button {
                    withAnimation {
                        currentStep = 5
                    }
                } label: {
                    Text("Continue")
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
                        .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
    }
}

struct CuisineCard: View {
    let cuisine: CuisineOption
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(cuisine.rawValue)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundColor(isSelected ? .white : .sproutGreenDark)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isSelected ?
                LinearGradient(
                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ) :
                LinearGradient(
                    colors: [Color.sproutGreen.opacity(0.1), Color.sproutGreen.opacity(0.05)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.clear : Color.sproutGreen.opacity(0.3), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? Color.sproutGreen.opacity(0.3) : Color.black.opacity(0.05), radius: isSelected ? 8 : 4, x: 0, y: 2)
        }
    }
}

// MARK: - Step 5: Cooking Style

struct CookingStyleStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Cooking preferences?")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                        .multilineTextAlignment(.center)
                    
                    Text("What do you like to cook?")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                .padding(.horizontal, 20)
                
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                    ForEach(CookingStyleOption.allCases) { style in
                        CookingStyleCard(
                            style: style,
                            isSelected: viewModel.data.cookingStylePreferences.contains(style.rawValue)
                        ) {
                            if viewModel.data.cookingStylePreferences.contains(style.rawValue) {
                                viewModel.data.cookingStylePreferences.removeAll { $0 == style.rawValue }
                            } else {
                                viewModel.data.cookingStylePreferences.append(style.rawValue)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Button {
                    withAnimation {
                        currentStep = 5
                    }
                } label: {
                    Text("Continue")
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
                        .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
    }
}

struct CookingStyleCard: View {
    let style: CookingStyleOption
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(style.rawValue)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundColor(isSelected ? .white : .sproutGreenDark)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isSelected ?
                LinearGradient(
                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ) :
                LinearGradient(
                    colors: [Color.sproutGreen.opacity(0.1), Color.sproutGreen.opacity(0.05)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.clear : Color.sproutGreen.opacity(0.3), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? Color.sproutGreen.opacity(0.3) : Color.black.opacity(0.05), radius: isSelected ? 8 : 4, x: 0, y: 2)
        }
    }
}

// MARK: - Step 6: Review

struct ReviewStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    @EnvironmentObject var sproutViewModel: SproutViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    Text("Review your preferences")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                        .multilineTextAlignment(.center)
                    
                    Text("Make sure everything looks good")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                .padding(.horizontal, 20)
                
                VStack(spacing: 20) {
                    ReviewSection(
                        title: "Eating Style",
                        value: viewModel.data.eatingStyle?.rawValue ?? "Not selected"
                    )
                    
                    ReviewSection(
                        title: "Dietary Restrictions",
                        value: viewModel.data.dietaryRestrictions.isEmpty ? "None" : viewModel.data.dietaryRestrictions.joined(separator: ", ")
                    )
                    
                    ReviewSection(
                        title: "Cuisine Preferences",
                        value: viewModel.data.cuisinePreferences.isEmpty ? "None selected" : viewModel.data.cuisinePreferences.joined(separator: ", ")
                    )
                    
                    ReviewSection(
                        title: "Cooking Style",
                        value: viewModel.data.cookingStylePreferences.isEmpty ? "None selected" : viewModel.data.cookingStylePreferences.joined(separator: ", ")
                    )
                }
                .padding(.horizontal, 20)
                
                HStack(spacing: 16) {
                    Button {
                        withAnimation {
                            currentStep = 1 // Go back to first step
                        }
                    } label: {
                        Text("Edit")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.sproutGreen)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.sproutGreen.opacity(0.1))
                            .cornerRadius(16)
                    }
                    
                    Button {
                        completeOnboarding()
                    } label: {
                        Text("Looks Good")
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
                            .shadow(color: Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
    }
    
    private func completeOnboarding() {
        // Set default sprout name if not already set
        if viewModel.data.sproutName.isEmpty {
            viewModel.data.sproutName = "Bud"
        }
        
        Task {
            await viewModel.completeOnboarding()
            // Only mark as completed if profile was successfully created
            if viewModel.isCompleted {
                // Load the profile into the shared viewModel so settings can access it
                if UserDefaults.standard.string(forKey: "currentUserId") != nil {
                    print("🔄 Loading profile into SproutViewModel after onboarding...")
                    await sproutViewModel.loadProfile()
                    print("✅ Profile loaded into SproutViewModel: \(sproutViewModel.userProfile != nil ? "Success" : "Failed")")
                }
                
                await MainActor.run {
                    // Update @AppStorage by setting UserDefaults
                    UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
                    // Force a small delay to ensure @AppStorage updates
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        // Trigger view refresh
                        NotificationCenter.default.post(name: NSNotification.Name("OnboardingCompleted"), object: nil)
                    }
                }
            } else {
                print("❌ Onboarding failed - profile was not created")
            }
        }
    }
}

struct ReviewSection: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.sproutGreenDark)
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Step 7: Name Your Sprout

struct NameSproutStep: View {
    @ObservedObject var viewModel: OnboardingViewModel
    @Binding var currentStep: Int
    @State private var sproutName: String = ""
    @State private var isCompleting: Bool = false
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [
                                    Color.sproutGreen.opacity(0.3),
                                    Color.sproutGreen.opacity(0.1),
                                    Color.clear
                                ],
                                center: .center,
                                startRadius: 30,
                                endRadius: 100
                            )
                        )
                        .frame(width: 200, height: 200)
                    
                    Image(systemName: "leaf.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.sproutGreen, Color.sproutGreenDark],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: Color.sproutGreen.opacity(0.4), radius: 12, x: 0, y: 6)
                }
                
                VStack(spacing: 12) {
                    Text("Name your Sprout")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.sproutGreenDark)
                    
                    Text("Give your plant companion a name")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            VStack(spacing: 16) {
                TextField("e.g., Bud, Leaf, Sprout", text: $sproutName)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(size: 18, design: .rounded))
                    .padding(.horizontal, 32)
                
                Button {
                    completeOnboarding()
                } label: {
                    if isCompleting {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.white)
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
                    } else {
                        Text("Complete Setup")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                sproutName.isEmpty ?
                                LinearGradient(colors: [Color.gray, Color.gray], startPoint: .leading, endPoint: .trailing) :
                                LinearGradient(
                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                            .shadow(color: sproutName.isEmpty ? Color.clear : Color.sproutGreen.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                }
                .disabled(sproutName.isEmpty || isCompleting)
                .padding(.horizontal, 32)
            }
            
            Spacer()
        }
        .onAppear {
            sproutName = viewModel.data.sproutName
        }
    }
    
    private func completeOnboarding() {
        guard !sproutName.isEmpty else { return }
        isCompleting = true
        viewModel.data.sproutName = sproutName
        
        Task {
            await viewModel.completeOnboarding()
            await MainActor.run {
                isCompleting = false
                // Onboarding completion is handled by RootView via @AppStorage
                UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
            }
        }
    }
}

// MARK: - Onboarding ViewModel

class OnboardingViewModel: ObservableObject {
    @Published var data = OnboardingData()
    @Published var isCompleted = false
    
    func completeOnboarding() async {
        guard let eatingStyle = data.eatingStyle else {
            print("❌ Cannot complete onboarding: eating style not selected")
            await MainActor.run {
                isCompleted = false
            }
            return
        }
        
        // Create profile with temporary ID - backend will assign the real MongoDB ID
        let profile = UserProfile(
            id: "", // Backend will assign the real ID
            userName: "User", // Will be updated later
            eatingStyle: eatingStyle.rawValue,
            dietaryRestrictions: data.dietaryRestrictions,
            cuisinePreferences: data.cuisinePreferences,
            cookingStylePreferences: data.cookingStylePreferences,
            sproutName: data.sproutName.isEmpty ? "Bud" : data.sproutName,
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            coins: 0,
            streakDays: 0
        )
        
        do {
            print("🌱 Creating profile via API...")
            let createdProfile = try await APIClient.shared.createProfile(profile)
            print("✅ Profile created successfully with ID: \(createdProfile.id)")
            
            await MainActor.run {
                // Save userId to UserDefaults for future use
                UserDefaults.standard.set(createdProfile.id, forKey: "currentUserId")
                print("💾 Saved userId to UserDefaults: \(createdProfile.id)")
                isCompleted = true
            }
        } catch let error {
            print("❌ Error completing onboarding: \(error)")
            print("   Error details: \(error.localizedDescription)")
            // Don't mark as completed if API call failed
            await MainActor.run {
                isCompleted = false
            }
        }
    }
}
