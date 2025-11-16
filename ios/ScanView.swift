import SwiftUI

struct ScanView: View {
    @EnvironmentObject var vm: SproutViewModel
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var sourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var scanMode: ScanMode = .menu
    @State private var ingredientText: String = ""
    @State private var showingAlternatives = false
    @State private var selectedIngredient: IngredientClassification?
    @State private var alternatives: [String] = []
    
    enum ScanMode {
        case ingredients
        case menu
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color.sproutBackground, Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Mode selector
                    Picker("Scan Mode", selection: $scanMode) {
                        Text("Ingredients").tag(ScanMode.ingredients)
                        Text("Menu").tag(ScanMode.menu)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    if scanMode == .ingredients {
                        // Ingredients text input view
                        ScrollView {
                            VStack(spacing: 24) {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Paste or type ingredients")
                                        .font(.system(size: 22, weight: .bold, design: .rounded))
                                        .foregroundColor(.sproutGreenDark)
                                    
                                    Text("Enter ingredients separated by commas or new lines")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                                
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Ingredients")
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                        .foregroundColor(.sproutGreenDark)
                                        .padding(.horizontal, 20)
                                    
                                    TextEditor(text: $ingredientText)
                                        .frame(minHeight: 200)
                                        .padding(12)
                                        .background(Color(.systemBackground))
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.sproutGreen.opacity(0.3), lineWidth: 1)
                                        )
                                        .padding(.horizontal, 20)
                                    
                                    Button {
                                        analyzeIngredients()
                                    } label: {
                                        HStack {
                                            Spacer()
                                            if vm.isLoading {
                                                ProgressView()
                                                    .progressViewStyle(.circular)
                                                    .tint(.white)
                                            } else {
                                                Text("Analyze Ingredients")
                                                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                                            }
                                            Spacer()
                                        }
                                        .foregroundColor(.white)
                                        .padding(.vertical, 16)
                                        .background(
                                            LinearGradient(
                                                colors: ingredientText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? [Color.gray, Color.gray] : [Color.sproutGreen, Color.sproutGreenDark],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .cornerRadius(16)
                                    }
                                    .disabled(ingredientText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || vm.isLoading)
                                    .padding(.horizontal, 20)
                                }
                                
                                if !vm.scannedIngredients.isEmpty {
                                    VStack(alignment: .leading, spacing: 20) {
                                        HStack {
                                            Image(systemName: "checkmark.seal.fill")
                                                .font(.title3)
                                                .foregroundColor(.sproutGreen)
                                            Text("Analysis Results")
                                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                            Spacer()
                                        }
                                        
                                        VStack(spacing: 16) {
                                            ForEach(vm.scannedIngredients) { ingredient in
                                                IngredientResultRow(
                                                    ingredient: ingredient,
                                                    onRequestAlternative: {
                                                        selectedIngredient = ingredient
                                                        Task {
                                                            alternatives = await vm.getAlternativeProduct(
                                                                productType: ingredient.name,
                                                                context: ingredient.reason
                                                            )
                                                            showingAlternatives = true
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    }
                                    .padding(24)
                                    .cardStyle()
                                    .padding(.horizontal, 20)
                                }
                                
                                Spacer()
                            }
                        }
                    } else {
                        // Menu scan view
                        if let image = selectedImage {
                            ScrollView {
                                VStack(spacing: 20) {
                                    // Scanned image
                                    Image(uiImage: image)
                                        .resizable()
                                        .scaledToFit()
                                        .frame(maxWidth: .infinity)
                                        .cornerRadius(20)
                                        .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                                        .padding(.horizontal, 20)
                                        .padding(.top, 20)
                                    
                                    if vm.isLoading {
                                        ProgressView()
                                            .scaleEffect(1.5)
                                            .padding()
                                    } else if !vm.scannedMenu.isEmpty {
                                        // Menu results
                                        VStack(alignment: .leading, spacing: 20) {
                                            HStack {
                                                Image(systemName: "fork.knife")
                                                    .font(.title3)
                                                    .foregroundColor(.sproutGreen)
                                                Text("Menu Results")
                                                    .font(.system(size: 22, weight: .bold, design: .rounded))
                                                Spacer()
                                            }
                                            
                                            VStack(spacing: 16) {
                                                ForEach(vm.scannedMenu) { dish in
                                                    MenuDishRow(dish: dish)
                                                }
                                            }
                                        }
                                        .padding(24)
                                        .cardStyle()
                                        .padding(.horizontal, 20)
                                        .padding(.bottom, 24)
                                    }
                                }
                            }
                        } else {
                            VStack(spacing: 32) {
                                Spacer()
                                
                                // Empty state
                                VStack(spacing: 20) {
                                    ZStack {
                                        Circle()
                                            .fill(
                                                RadialGradient(
                                                    colors: [
                                                        Color.sproutGreen.opacity(0.2),
                                                        Color.sproutGreen.opacity(0.1),
                                                        Color.clear
                                                    ],
                                                    center: .center,
                                                    startRadius: 30,
                                                    endRadius: 100
                                                )
                                            )
                                            .frame(width: 200, height: 200)
                                        
                                        Image(systemName: "camera.viewfinder")
                                            .font(.system(size: 80))
                                            .foregroundStyle(
                                                LinearGradient(
                                                    colors: [Color.sproutGreen, Color.sproutGreenDark],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                            )
                                    }
                                    
                                    VStack(spacing: 8) {
                                        Text("Scan Menu")
                                            .font(.system(size: 28, weight: .bold, design: .rounded))
                                        Text("Take a photo of a menu to see which dishes fit your preferences.")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                            .multilineTextAlignment(.center)
                                            .padding(.horizontal, 40)
                                    }
                                }
                                
                                // Action buttons
                                VStack(spacing: 16) {
                                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                        ScanButton(
                                            title: "Take a Photo",
                                            icon: "camera.fill",
                                            color: .sproutGreen
                                        ) {
                                            sourceType = .camera
                                            showingImagePicker = true
                                        }
                                    }
                                    
                                    ScanButton(
                                        title: "Upload Image",
                                        icon: "photo.on.rectangle.angled",
                                        color: .sproutGreenDark
                                    ) {
                                        sourceType = .photoLibrary
                                        showingImagePicker = true
                                    }
                                }
                                .padding(.horizontal, 20)
                                
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Scan")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(image: $selectedImage, sourceType: sourceType)
            }
            .onChange(of: selectedImage) { newImage in
                if let image = newImage, scanMode == .menu {
                    Task {
                        await vm.scanMenu(image: image)
                    }
                }
            }
            .sheet(isPresented: $showingAlternatives) {
                if let ingredient = selectedIngredient {
                    AlternativesView(
                        ingredient: ingredient,
                        alternatives: alternatives
                    )
                }
            }
        }
    }
    
    private func analyzeIngredients() {
        let ingredients = ingredientText
            .components(separatedBy: CharacterSet(charactersIn: ",\n"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        
        guard !ingredients.isEmpty, let userId = vm.userProfile?.id else { return }
        
        Task {
            await vm.analyzeIngredientsList(ingredients: ingredients, userId: userId)
        }
    }
}

struct ScanButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color.opacity(0.2), color.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(color)
                }
                
                Text(title)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(20)
            .cardStyle()
        }
    }
}

struct IngredientResultRow: View {
    let ingredient: IngredientClassification
    let onRequestAlternative: () -> Void
    
    private var statusColor: Color {
        switch ingredient.status {
        case .allowed: return .sproutGreen
        case .ambiguous: return .sproutWarning
        case .notAllowed: return .sproutError
        }
    }
    
    private var statusIcon: String {
        switch ingredient.status {
        case .allowed: return "checkmark.circle.fill"
        case .ambiguous: return "exclamationmark.triangle.fill"
        case .notAllowed: return "xmark.circle.fill"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(statusColor.opacity(0.15))
                        .frame(width: 36, height: 36)
                    
                    Image(systemName: statusIcon)
                        .font(.system(size: 18))
                        .foregroundColor(statusColor)
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text(ingredient.name)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                    Text(ingredient.reason)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            
            if ingredient.status == .notAllowed {
                Button {
                    onRequestAlternative()
                } label: {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption)
                        Text("Suggest an alternative product")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Spacer()
                        Image(systemName: "arrow.right")
                            .font(.caption)
                    }
                    .foregroundColor(.white)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 14)
                    .frame(maxWidth: .infinity)
                    .background(
                        LinearGradient(
                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(10)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct MenuDishRow: View {
    let dish: MenuDish
    
    private var statusColor: Color {
        switch dish.status {
        case .suitable: return .sproutGreen
        case .modifiable: return .sproutWarning
        case .notSuitable: return .sproutError
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(dish.name)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text(dish.status.rawValue.capitalized)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.2))
                    .foregroundColor(statusColor)
                    .cornerRadius(8)
            }
            
            if let suggestion = dish.modificationSuggestion {
                Text(suggestion)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            if dish.status == .modifiable {
                Button {
                    // Navigate to Cook tab with dish name
                } label: {
                    HStack {
                        Text("Veganize this dish")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Spacer()
                        Image(systemName: "arrow.right")
                            .font(.caption)
                    }
                    .foregroundColor(.white)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 14)
                    .frame(maxWidth: .infinity)
                    .background(
                        LinearGradient(
                            colors: [Color.sproutGreen, Color.sproutGreenDark],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(10)
                }
            }
        }
        .padding(.vertical, 8)
    }
}

struct AlternativesView: View {
    let ingredient: IngredientClassification
    let alternatives: [String]
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Alternatives for \(ingredient.name):")
                        .font(.headline)
                        .foregroundColor(.sproutGreenDark)
                    
                    ForEach(alternatives, id: \.self) { alternative in
                        Text(alternative)
                            .font(.subheadline)
                    }
                }
            }
            .navigationTitle("Alternatives")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
