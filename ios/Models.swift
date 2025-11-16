import SwiftUI

// MARK: - Models

enum SproutTab: Int {
    case home, scan, cook, settings
}

// MARK: - User Profile Models

enum EatingStyle: String, CaseIterable, Identifiable {
    case vegan = "Vegan"
    case ovoVegetarian = "Ovo-vegetarian"
    case lactoVegetarian = "Lacto-vegetarian"
    case lactoOvoVegetarian = "Lacto-ovo vegetarian"
    case pescatarian = "Pescatarian"
    case flexitarian = "Flexitarian"
    
    var id: String { rawValue }
    
    var description: String {
        switch self {
        case .vegan: return "No animal products or by-products"
        case .ovoVegetarian: return "Vegetarian + eggs"
        case .lactoVegetarian: return "Vegetarian + dairy"
        case .lactoOvoVegetarian: return "Vegetarian + eggs and dairy"
        case .pescatarian: return "Vegetarian + fish and seafood"
        case .flexitarian: return "Mostly plant-based, occasional meat"
        }
    }
}

struct UserProfile: Codable, Equatable {
    var id: String
    var userName: String
    var eatingStyle: String
    var dietaryRestrictions: [String]
    var cuisinePreferences: [String]
    var cookingStylePreferences: [String]
    var sproutName: String
    var level: Int
    var xp: Int
    var xpToNextLevel: Int
    var coins: Int
    var streakDays: Int
    
    static let `default` = UserProfile(
        id: UUID().uuidString,
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
}

// MARK: - Mission Models

struct Mission: Identifiable, Codable {
    let id: String
    let title: String
    let xpReward: Int
    let coinReward: Int
    var isCompleted: Bool
}

// MARK: - Chat Models

struct ChatMessage: Identifiable {
    let id: UUID
    let isUser: Bool
    let text: String
    let recipe: Recipe?
    let timestamp: Date
    
    init(isUser: Bool, text: String, recipe: Recipe? = nil) {
        self.id = UUID()
        self.isUser = isUser
        self.text = text
        self.recipe = recipe
        self.timestamp = Date()
    }
}

// MARK: - Grocery Models

struct GroceryItem: Identifiable, Codable {
    let id: String
    var name: String
    var category: String
    var isChecked: Bool
    var userId: String?
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

// MARK: - Recipe Models

struct Recipe: Identifiable, Codable {
    let id: String
    let userId: String?
    let title: String
    let tags: [String]
    let duration: String
    let ingredients: [RecipeIngredient]
    let steps: [String]
    let previewImageUrl: String
    let originalPrompt: String?
    let type: RecipeType
    let substitutionMap: [String: String]?
    
    enum RecipeType: String, Codable {
        case simplified = "simplified"
        case veganized = "veganized"
    }
}

struct RecipeIngredient: Codable {
    let name: String
    let amount: String?
    let unit: String?
}

// MARK: - Scan Models

enum IngredientStatus: String, Codable {
    case allowed = "allowed"
    case ambiguous = "ambiguous"
    case notAllowed = "not_allowed"
}

struct IngredientClassification: Identifiable, Codable {
    let id: UUID
    let name: String
    let status: IngredientStatus
    let reason: String
    let suggestions: [String]?
    
    init(name: String, status: IngredientStatus, reason: String, suggestions: [String]? = nil) {
        self.id = UUID()
        self.name = name
        self.status = status
        self.reason = reason
        self.suggestions = suggestions
    }
}

struct MenuDish: Identifiable, Codable {
    let id: UUID
    let name: String
    let status: DishStatus
    let modificationSuggestion: String?
    
    init(name: String, status: DishStatus, modificationSuggestion: String? = nil) {
        self.id = UUID()
        self.name = name
        self.status = status
        self.modificationSuggestion = modificationSuggestion
    }
    
    enum CodingKeys: String, CodingKey {
        case name, status, modificationSuggestion
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.name = try container.decode(String.self, forKey: .name)
        self.status = try container.decode(DishStatus.self, forKey: .status)
        self.modificationSuggestion = try container.decodeIfPresent(String.self, forKey: .modificationSuggestion)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(modificationSuggestion, forKey: .modificationSuggestion)
    }
    
    enum DishStatus: String, Codable {
        case suitable = "suitable"
        case modifiable = "modifiable"
        case notSuitable = "not_suitable"
    }
}

// MARK: - Onboarding Models

struct OnboardingData {
    var eatingStyle: EatingStyle?
    var dietaryRestrictions: [String] = []
    var cuisinePreferences: [String] = []
    var cookingStylePreferences: [String] = []
    var sproutName: String = ""
}

// MARK: - Cuisine Options

enum CuisineOption: String, CaseIterable, Identifiable {
    case korean = "Korean"
    case japanese = "Japanese"
    case chinese = "Chinese"
    case italian = "Italian"
    case mediterranean = "Mediterranean"
    case american = "American"
    case mexican = "Mexican"
    case thai = "Thai"
    case indian = "Indian"
    case french = "French"
    case other = "Other"
    
    var id: String { rawValue }
}

// MARK: - Cooking Style Options

enum CookingStyleOption: String, CaseIterable, Identifiable {
    case quickMeals = "Quick meals"
    case comfortFood = "Comfort food"
    case highProtein = "High-protein"
    case budgetFriendly = "Budget-friendly"
    case spicy = "Spicy"
    case onePot = "One-pot meals"
    case mealPrep = "Meal-prep friendly"
    case treats = "Treats/Dessert"
    case healthy = "Healthy/Low-cal"
    case indulgent = "Indulgent"
    case kidFriendly = "Kid-friendly"
    
    var id: String { rawValue }
}

// MARK: - Dietary Restriction Chips

enum DietaryRestrictionChip: String, CaseIterable, Identifiable {
    case glutenFree = "gluten-free"
    case nutFree = "nut-free"
    case soyFree = "soy-free"
    case dairyFree = "dairy-free"
    case eggFree = "egg-free"
    case shellfishFree = "shellfish-free"
    case sesameFree = "sesame-free"
    case noHoney = "no honey"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
}
