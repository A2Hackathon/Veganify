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
        
        do {
            userProfile = try await apiClient.getProfile()
            await loadHomeData()
        } catch {
            errorMessage = "Failed to load profile: \(error.localizedDescription)"
        }
    }
    
    func updateProfile(_ profile: UserProfile) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            userProfile = try await apiClient.updateProfile(profile)
        } catch {
            errorMessage = "Failed to update profile: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Home Data
    
    func loadHomeData() async {
        do {
            let summary = try await apiClient.getHomeSummary()
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
    
    func generateRecipe() async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            let recipe = try await apiClient.generateRecipe(userId: userId)
            let message = ChatMessage(isUser: false, text: "Here's a recipe for you!", recipe: recipe)
            chatMessages.append(message)
        } catch {
            errorMessage = "Failed to generate recipe: \(error.localizedDescription)"
            chatMessages.append(ChatMessage(isUser: false, text: "Sorry, I couldn't generate a recipe right now. Please try again."))
        }
    }
    
    func veganizeRecipe(inputText: String) async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            let recipe = try await apiClient.veganizeRecipe(userId: userId, inputText: inputText)
            let message = ChatMessage(isUser: false, text: "Here's your veganized recipe!", recipe: recipe)
            chatMessages.append(message)
        } catch {
            errorMessage = "Failed to veganize recipe: \(error.localizedDescription)"
            chatMessages.append(ChatMessage(isUser: false, text: "Sorry, I couldn't veganize that recipe. Please try again."))
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
            let items = try await apiClient.scanReceipt(image: image, userId: userId)
            groceryItems.append(contentsOf: items)
        } catch {
            errorMessage = "Failed to scan receipt: \(error.localizedDescription)"
        }
    }
    
    
    func scanIngredients(imageData: Data) async {
        guard let userId = userProfile?.id else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            // Send image directly to backend
            let response = try await APIService.shared.scanIngredients(imageData: imageData, userID: userId)

            // Map backend results into your local model
            scannedIngredients = response.ingredients.map { item in
                let status: IngredientStatus
                let allowedStr = item.allowed.trimmingCharacters(in: .whitespaces)
                if allowedStr == "Allowed" {
                    status = .allowed
                } else if allowedStr == "NotAllowed" {
                    status = .notAllowed
                } else {
                    status = .ambiguous
                }
                return IngredientClassification(
                    name: item.name,
                    status: status,
                    reason: item.reason ?? "",
                    suggestions: nil
                )
            }

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
            let response = try await apiClient.scanMenu(image: image, userId: userId)
            scannedMenu = response.dishes
        } catch {
            errorMessage = "Failed to scan menu: \(error.localizedDescription)"
        }
    }
    
    func getAlternativeProduct(productType: String, context: String) async -> [String] {
        guard let userId = userProfile?.id else { return [] }
        do {
            let response = try await APIService.shared.analyzeIngredient(
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
