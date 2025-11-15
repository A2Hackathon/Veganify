import SwiftUI

// MARK: - Models

enum SproutTab: Int {
    case home, scan, cook, settings
}

struct Mission: Identifiable {
    let id = UUID()
    let title: String
    let xpReward: Int
    let coinReward: Int
    var isCompleted: Bool
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let isUser: Bool
    let text: String
}

struct GroceryItem: Identifiable {
    let id = UUID()
    var name: String
    var category: GroceryCategory
    var isChecked: Bool
}

enum GroceryCategory: String, CaseIterable, Identifiable {
    case produce = "Produce"
    case proteins = "Proteins"
    case grains = "Grains & Pasta"
    case canned = "Canned Goods"
    case herbsSpices = "Herbs & Spices"
    case sauces = "Sauces & Condiments"
    case snacks = "Snacks"
    
    var id: String { rawValue }
}

struct SavedRecipe: Identifiable {
    let id = UUID()
    let title: String
    let tags: [String]
    let duration: String
    let imageName: String // placeholder asset name
}

