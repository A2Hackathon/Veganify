import SwiftUI

@MainActor
class SproutViewModel: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Home data
    @Published var missions: [Mission] = []
    
    // Chat data
    @Published var chatMessages: [ChatMessage] = []
    
    // Grocery list
    @Published var groceryItems: [GroceryItem] = []
    
    // Saved recipes
    @Published var savedRecipes: [Recipe] = []
    
    // Scan data
    @Published var scannedIngredients: [IngredientClassification] = []
    @Published var scannedMenu: [MenuDish] = []
        
    private let apiClient = APIClient.shared
    
    init() {
        // Initialize with welcome message
        chatMessages = [
            ChatMessage(isUser: false, text: "Hi! What should we cook today?")
        ]
    }
    
    // MARK: - Profile Management
    
    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }
        
        // Try to get userId from UserDefaults first (saved during onboarding)
        if let userId = UserDefaults.standard.string(forKey: "currentUserId") ?? userProfile?.id {
            // Profile exists, load it
            do {
                print("🔄 Loading profile for userId: \(userId)")
                let loadedProfile = try await apiClient.getProfile(userId: userId)
                await MainActor.run {
                    userProfile = loadedProfile
                    print("✅ Profile loaded successfully: \(loadedProfile.id)")
                }
                await loadHomeData()
            } catch {
                print("❌ Failed to load profile: \(error)")
                // If loading fails, try creating a new profile
                if error.localizedDescription.contains("404") || error.localizedDescription.contains("not found") {
                    print("🔄 Profile not found in database, creating default profile...")
                    await createDefaultProfile()
                } else {
                    await MainActor.run {
                        errorMessage = "Failed to load profile: \(error.localizedDescription)"
                    }
                }
            }
        } else {
            // No profile exists, create a default one
            print("🌱 No profile found. Creating default profile...")
            await createDefaultProfile()
        }
    }
    
    private func createDefaultProfile() async {
        // Create default vegan profile
        let defaultProfile = UserProfile(
            id: "", // Backend will assign the real ID
            userName: "User",
            eatingStyle: EatingStyle.vegan.rawValue,
            dietaryRestrictions: [],
            cuisinePreferences: [],
            cookingStylePreferences: [],
            sproutName: "Bud",
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            coins: 0,
            streakDays: 0
        )
        
        do {
            print("🌱 Creating default profile in MongoDB...")
            let createdProfile = try await apiClient.createProfile(defaultProfile)
            print("✅ Default profile created with ID: \(createdProfile.id)")
            
            // Save userId to UserDefaults
            UserDefaults.standard.set(createdProfile.id, forKey: "currentUserId")
            print("💾 Saved userId to UserDefaults: \(createdProfile.id)")
            
            // Set the profile in viewModel
            await MainActor.run {
                userProfile = createdProfile
            }
            
            // Mark onboarding as completed since we have a profile
            UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
            
            // Load home data
            await loadHomeData()
        } catch {
            print("❌ Error creating default profile: \(error)")
            errorMessage = "Failed to create profile: \(error.localizedDescription)"
        }
    }
    
    func updateProfile(_ profile: UserProfile) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            print("📝 Updating profile with:", profile)
            let updated = try await apiClient.updateProfile(profile)
            print("✅ Profile updated successfully:", updated)
            await MainActor.run {
                userProfile = updated
                // Force UI update
                objectWillChange.send()
            }
        } catch {
            print("❌ Error updating profile: \(error)")
            errorMessage = "Failed to update profile: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Home Data
    
    func loadHomeData() async {
        guard let userId = userProfile?.id else { return }
        do {
            let summary = try await apiClient.getHomeSummary(userId: userId)
            await MainActor.run {
                if let profile = userProfile {
                    userProfile = UserProfile(
                        id: profile.id,
                        userName: profile.userName,
                        eatingStyle: profile.eatingStyle,
                        dietaryRestrictions: profile.dietaryRestrictions,
                        cuisinePreferences: profile.cuisinePreferences,
                        cookingStylePreferences: profile.cookingStylePreferences,
                        sproutName: profile.sproutName,
                        level: summary.level,
                        xp: summary.xp,
                        xpToNextLevel: summary.xpToNextLevel,
                        coins: summary.coins,
                        streakDays: summary.streakDays
                    )
                }
                missions = summary.missions
            }
        } catch {
            errorMessage = "Failed to load home data: \(error.localizedDescription)"
        }
    }
    
    func completeMission(_ mission: Mission) async {
        guard let userId = userProfile?.id else { return }
        
        do {
            let updatedProfile = try await apiClient.completeMission(userId: userId, missionId: mission.id)
            userProfile = updatedProfile
            
            // Update mission status locally
            if let index = missions.firstIndex(where: { $0.id == mission.id }) {
                missions[index].isCompleted = true
            }
            
            // Reload home data to get updated missions
            await loadHomeData()
        } catch {
            errorMessage = "Failed to complete mission: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Chat & Recipes
    
    func addUserChat(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        chatMessages.append(ChatMessage(isUser: true, text: text))
    }
    
    func sendChatMessage(_ text: String) async {
        // Ensure profile is loaded before sending chat message
        if userProfile == nil {
            print("🔄 Profile not loaded for chatbot, loading now...")
            await loadProfile()
        }
        
        guard let userId = userProfile?.id else {
            print("❌ No user ID for chatbot after loading attempt")
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Unable to load profile. Please try again."))
            }
            return
        }
        isLoading = true
        defer { isLoading = false }
        
        print("💬 Sending chat message to backend:", text)
        do {
            let response = try await apiClient.sendChatMessage(userId: userId, question: text)
            print("✅ Received AI response:", response.answer)
            await MainActor.run {
                let message = ChatMessage(isUser: false, text: response.answer)
                chatMessages.append(message)
            }
        } catch {
            print("❌ Chatbot error: \(error)")
            errorMessage = "Failed to send message: \(error.localizedDescription)"
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Sorry, I couldn't process that. Please try again."))
            }
        }
    }
    
    func generateRecipe() async {
        guard let userId = userProfile?.id else {
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Please complete onboarding first to generate recipes."))
            }
            return
        }
        isLoading = true
        defer { isLoading = false }
        
        // Add loading message
        await MainActor.run {
            chatMessages.append(ChatMessage(isUser: false, text: "🌱 Generating a vegan recipe based on your groceries and preferences using AI..."))
        }
        
        do {
            print("🍳 Generating recipe with LLM (generateRecipes)...")
            print("   User ID:", userId)
            let recipe = try await apiClient.generateRecipe(userId: userId)
            print("✅ Recipe generated:", recipe.title)
            print("   Steps count:", recipe.steps.count)
            await MainActor.run {
                let message = ChatMessage(isUser: false, text: "Here's a personalized vegan recipe for you! 🎉", recipe: recipe)
                chatMessages.append(message)
            }
        } catch {
            print("❌ Recipe generation error: \(error)")
            errorMessage = "Failed to generate recipe: \(error.localizedDescription)"
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Sorry, I couldn't generate a recipe right now. Please try again."))
            }
        }
    }
    
    func veganizeRecipe(inputText: String) async {
        guard let userId = userProfile?.id else {
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Please complete onboarding first to veganize recipes."))
            }
            return
        }
        isLoading = true
        defer { isLoading = false }
        
        // Add user message with the recipe they want to veganize
        await MainActor.run {
            chatMessages.append(ChatMessage(isUser: true, text: inputText))
        }
        
        // Add loading message
        await MainActor.run {
            chatMessages.append(ChatMessage(isUser: false, text: "✨ Analyzing and veganizing your recipe with AI..."))
        }
        
        do {
            print("🌿 Veganizing recipe with LLM (extractIngredients + rewriteRecipeSteps)...")
            print("   User ID:", userId)
            print("   Recipe text length:", inputText.count, "characters")
            let recipe = try await apiClient.veganizeRecipe(userId: userId, inputText: inputText)
            print("✅ Recipe veganized:", recipe.title)
            print("   Steps count:", recipe.steps.count)
            await MainActor.run {
                let message = ChatMessage(isUser: false, text: "Here's your veganized recipe! 🌱✨", recipe: recipe)
                chatMessages.append(message)
            }
        } catch {
            print("❌ Recipe veganization error: \(error)")
            errorMessage = "Failed to veganize recipe: \(error.localizedDescription)"
            await MainActor.run {
                chatMessages.append(ChatMessage(isUser: false, text: "Sorry, I couldn't veganize that recipe. Please try again."))
            }
        }
    }
    
    func saveRecipe(_ recipe: Recipe) async {
        guard let userId = userProfile?.id else { return }
        do {
            let saved = try await apiClient.saveRecipe(userId: userId, recipe: recipe)
            if !savedRecipes.contains(where: { $0.id == saved.id }) {
                savedRecipes.append(saved)
            }
        } catch {
            errorMessage = "Failed to save recipe: \(error.localizedDescription)"
        }
    }
    
    func loadSavedRecipes() async {
        guard let userId = userProfile?.id else { return }
        do {
            savedRecipes = try await apiClient.getSavedRecipes(userId: userId)
        } catch {
            errorMessage = "Failed to load saved recipes: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Grocery List
    
    func loadGroceryList() async {
        guard let userId = userProfile?.id else { return }
        do {
            groceryItems = try await apiClient.getGroceryList(userId: userId)
        } catch {
            errorMessage = "Failed to load grocery list: \(error.localizedDescription)"
        }
    }
    
    func addGroceryItem(name: String, category: String) async {
        guard let userId = userProfile?.id else { return }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        let item = GroceryItem(
            id: UUID().uuidString,
            name: trimmed,
            category: category,
            isChecked: false,
            userId: userId
        )
        
        do {
            let added = try await apiClient.addGroceryItem(userId: userId, item: item)
            groceryItems.append(added)
        } catch {
            errorMessage = "Failed to add item: \(error.localizedDescription)"
        }
    }
    
    func toggleGroceryItem(_ item: GroceryItem) {
        guard let idx = groceryItems.firstIndex(where: { $0.id == item.id }) else { return }
        groceryItems[idx].isChecked.toggle()
    }
    
    func scanFridge(image: UIImage) async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            let items = try await apiClient.scanFridge(image: image, userId: userId)
            groceryItems.append(contentsOf: items)
        } catch {
            errorMessage = "Failed to scan fridge: \(error.localizedDescription)"
        }
    }
    
    func scanReceipt(image: UIImage) async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            print("🧾 Scanning receipt with LLM...")
            let items = try await apiClient.scanReceipt(image: image, userId: userId)
            print("✅ Receipt scanned:", items.count, "items found")
            await MainActor.run {
                groceryItems.append(contentsOf: items)
            }
        } catch {
            print("❌ Receipt scan error: \(error)")
            errorMessage = "Failed to scan receipt: \(error.localizedDescription)"
        }
    }
    
    
    func scanIngredients(imageData: Data) async {
        guard let userId = userProfile?.id,
              let image = UIImage(data: imageData) else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            // Use APIClient which handles the mapping
            let response = try await apiClient.scanIngredients(image: image, userId: userId)
            scannedIngredients = response.ingredients

        } catch {
            print("Error scanning ingredients:", error)
            errorMessage = "Failed to scan ingredients: \(error.localizedDescription)"
        }
    }

    
    func scanMenu(image: UIImage) async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            print("📸 Scanning menu with LLM...")
            let response = try await apiClient.scanMenu(image: image, userId: userId)
            print("✅ Menu scanned:", response.dishes.count, "dishes found")
            await MainActor.run {
                scannedMenu = response.dishes
            }
        } catch {
            print("❌ Menu scan error: \(error)")
            errorMessage = "Failed to scan menu: \(error.localizedDescription)"
        }
    }
    
    func analyzeIngredientsList(ingredients: [String], userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let response = try await apiClient.analyzeIngredientsText(ingredients: ingredients, userId: userId)
            scannedIngredients = response.ingredients
        } catch {
            print("Error analyzing ingredients: \(error)")
            errorMessage = "Failed to analyze ingredients: \(error.localizedDescription)"
        }
    }
    
    func getAlternativeProduct(productType: String, context: String) async -> [String] {
        guard let userId = userProfile?.id else { return [] }
        do {
            let response = try await apiClient.analyzeIngredient(
                ingredient: productType,
                context: context,
                userID: userId
            )
            return response.problematicIngredients.first?.suggestions ?? []
        } catch {
            print("Error fetching alternatives:", error)
            return []
        }
    }
}

extension SproutViewModel {
    var userName: String {
        userProfile?.userName ?? "User"
    }
    
    var sproutName: String {
        userProfile?.sproutName ?? "Bud"
    }
    
    var sproutLevel: Int {
        userProfile?.level ?? 1
    }
    
    var xp: Int {
        userProfile?.xp ?? 0
    }
    
    var xpToNextLevel: Int {
        userProfile?.xpToNextLevel ?? 100
    }
    
    var coins: Int {
        userProfile?.coins ?? 0
    }
    
    var streakDays: Int {
        userProfile?.streakDays ?? 0
    }
}
