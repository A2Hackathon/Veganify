import SwiftUI

// MARK: - ViewModel

class SproutViewModel: ObservableObject {
    @Published var userName: String = "Ellie"
    @Published var sproutName: String = "Bud"
    @Published var sproutLevel: Int = 6
    @Published var xp: Int = 246
    @Published var xpToNextLevel: Int = 300
    @Published var coins: Int = 245
    @Published var streakDays: Int = 4
    
    @Published var missions: [Mission] = [
        Mission(title: "Scan 1 new item", xpReward: 25, coinReward: 10, isCompleted: false),
        Mission(title: "Cook 1 recipe", xpReward: 50, coinReward: 20, isCompleted: false),
        Mission(title: "Update grocery list", xpReward: 10, coinReward: 5, isCompleted: true),
        Mission(title: "Try a new cuisine-style recipe", xpReward: 20, coinReward: 10, isCompleted: false)
    ]
    
    @Published var chatMessages: [ChatMessage] = [
        ChatMessage(isUser: false, text: "Hi Ellie! What should we cook today?")
    ]
    
    @Published var groceryItems: [GroceryItem] = [
        GroceryItem(name: "Tofu", category: .proteins, isChecked: false),
        GroceryItem(name: "Rice", category: .grains, isChecked: false),
        GroceryItem(name: "Spinach", category: .produce, isChecked: false)
    ]
    
    @Published var savedRecipes: [SavedRecipe] = [
        SavedRecipe(title: "Spicy Tofu Rice Bowl", tags: ["Quick", "Korean", "High-protein"], duration: "15 min", imageName: "recipePlaceholder"),
        SavedRecipe(title: "Creamy Vegan Carbonara", tags: ["Comfort", "Italian"], duration: "20 min", imageName: "recipePlaceholder")
    ]
    
    func completeMission(_ mission: Mission) {
        guard let idx = missions.firstIndex(where: { $0.id == mission.id }) else { return }
        missions[idx].isCompleted = true
        xp += mission.xpReward
        coins += mission.coinReward
        if xp >= xpToNextLevel {
            sproutLevel += 1
            xp = xp - xpToNextLevel
            xpToNextLevel += 100 // simple progression
        }
    }
    
    func addUserChat(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        chatMessages.append(ChatMessage(isUser: true, text: text))
        // placeholder AI reply
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            self.chatMessages.append(
                ChatMessage(isUser: false, text: "Got it! I'll come up with a recipe based on your preferences and grocery list.")
            )
        }
    }
    
    func toggleGroceryItem(_ item: GroceryItem) {
        guard let idx = groceryItems.firstIndex(where: { $0.id == item.id }) else { return }
        groceryItems[idx].isChecked.toggle()
    }
    
    func addGroceryItem(name: String, category: GroceryCategory) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        groceryItems.append(GroceryItem(name: trimmed, category: category, isChecked: false))
    }
}

extension SproutViewModel {
    var xpToNextLabel: Int {
        max(0, xpToNextLevel - xp)
    }
}

