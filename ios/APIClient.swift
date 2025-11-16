import Foundation
import UIKit

class APIClient {
    static let shared = APIClient()
    
    private let baseURL: String
    private let session: URLSession
    
    init() {
        #if DEBUG
        #if targetEnvironment(simulator)
        self.baseURL = "http://10.5.174.193:4000"
        #else
        self.baseURL = "http://10.5.174.193:4000"
        #endif
        #else
        self.baseURL = "https://your-production-url.com"
        #endif
        self.session = URLSession.shared
        print("APIClient initialized with baseURL: \(self.baseURL)")
    }
    
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        imageData: Data? = nil
    ) async throws -> T {
        let fullURL = "\(baseURL)\(endpoint)"
        print("API Request: \(method) \(fullURL)")
        
        guard let url = URL(string: fullURL) else {
            print("Invalid URL: \(fullURL)")
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30.0
        
        if let body = body {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            request.httpBody = try encoder.encode(body)
            if let bodyString = String(data: request.httpBody!, encoding: .utf8) {
                print("Request body: \(bodyString)")
            }
        } else if let imageData = imageData {
            let boundary = UUID().uuidString
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            request.httpBody = createMultipartBody(imageData: imageData, boundary: boundary)
            print("Request body: multipart/form-data (\(imageData.count) bytes)")
        }
        
        do {
            print("Sending request...")
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("Invalid response type")
                throw APIError.invalidResponse
            }
            
            print("Response status: \(httpResponse.statusCode)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("Response body: \(responseString.prefix(500))\(responseString.count > 500 ? "..." : "")")
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorBody = String(data: data, encoding: .utf8) ?? "No error message"
                print("HTTP Error \(httpResponse.statusCode): \(errorBody)")
                throw APIError.httpError(httpResponse.statusCode)
            }
            
            let decoder = JSONDecoder()
            let decoded = try decoder.decode(T.self, from: data)
            print("Successfully decoded response")
            return decoded
        } catch let error as DecodingError {
            print("JSON Decoding Error: \(error)")
            throw error
        } catch {
            print("Network Error: \(error.localizedDescription)")
            if let urlError = error as? URLError {
                print("   URL Error code: \(urlError.code.rawValue)")
                print("   URL Error description: \(urlError.localizedDescription)")
                
                switch urlError.code {
                case .cannotConnectToHost:
                    print("   Cannot connect to server at \(fullURL)")
                    print("   Make sure:")
                    print("      1. Backend server is running (npm start or npm run dev)")
                    print("      2. Server is running on port 4000")
                    print("      3. If using physical device, use your computer's IP address instead of localhost")
                    print("      4. Check firewall settings")
                case .timedOut:
                    print("   Connection timed out")
                    print("   Server may be slow or unreachable")
                case .notConnectedToInternet:
                    print("   No internet connection")
                case .cannotFindHost:
                    print("   Cannot find host")
                    print("   Check if the server URL is correct: \(fullURL)")
                default:
                    break
                }
            }
            throw error
        }
    }
    
    private func createMultipartBody(imageData: Data, boundary: String) -> Data {
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }
    
    func createProfile(_ profile: UserProfile) async throws -> UserProfile {
        struct Request: Encodable {
            let eatingStyle: String
            let dietaryRestrictions: [String]
            let cuisinePreferences: [String]
            let cookingStylePreferences: [String]
            let sproutName: String
        }
        
        let requestBody = Request(
            eatingStyle: profile.eatingStyle,
            dietaryRestrictions: profile.dietaryRestrictions,
            cuisinePreferences: profile.cuisinePreferences,
            cookingStylePreferences: profile.cookingStylePreferences,
            sproutName: profile.sproutName
        )
        
        return try await request(endpoint: "/onboarding/profile", method: "POST", body: requestBody)
    }
    
    func getProfile(userId: String) async throws -> UserProfile {
        return try await request(endpoint: "/profile?userId=\(userId)")
    }
    
    func updateProfile(_ profile: UserProfile) async throws -> UserProfile {
        return try await request(endpoint: "/profile", method: "PATCH", body: profile)
    }
    
    struct HomeSummary: Codable {
        let level: Int
        let xp: Int
        let xpToNextLevel: Int
        let coins: Int
        let streakDays: Int
        let missions: [Mission]
    }
    
    func getHomeSummary(userId: String) async throws -> HomeSummary {
        return try await request(endpoint: "/home/summary?userId=\(userId)")
    }
    
    func completeMission(userId: String, missionId: String) async throws -> UserProfile {
        struct Request: Encodable {
            let userId: String
            let missionId: String
        }
        
        return try await request(
            endpoint: "/progress/complete-mission",
            method: "POST",
            body: Request(userId: userId, missionId: missionId)
        )
    }
    
    struct ScanIngredientsResponse: Codable {
        let ingredients: [IngredientClassification]
    }
    
    struct BackendScanIngredientsResponse: Codable {
        let success: Bool
        let isConsumable: Bool
        let ingredients: [BackendIngredientItem]
    }
    
    struct BackendIngredientItem: Codable {
        let name: String
        let allowed: String
        let reason: String
    }
    
    func scanIngredients(image: UIImage, userId: String) async throws -> ScanIngredientsResponse {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidImage
        }
        
        let backendResponse: BackendScanIngredientsResponse = try await request(
            endpoint: "/scan/ingredients?userId=\(userId)",
            method: "POST",
            imageData: imageData
        )
        
        return ScanIngredientsResponse(
            ingredients: backendResponse.ingredients.map { item in
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
                    reason: item.reason,
                    suggestions: nil
                )
            }
        )
    }
    
    struct ScanMenuResponse: Codable {
        let dishes: [MenuDish]
    }
    
    func scanMenu(image: UIImage, userId: String) async throws -> ScanMenuResponse {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidImage
        }
        
        return try await request(
            endpoint: "/scan/menu?userId=\(userId)",
            method: "POST",
            imageData: imageData
        )
    }
    
    func analyzeIngredientsText(ingredients: [String], userId: String) async throws -> ScanIngredientsResponse {
        struct Request: Encodable {
            let userId: String
            let ingredients: [String]
        }
        
        let backendResponse: BackendScanIngredientsResponse = try await request(
            endpoint: "/scan/ingredients/text",
            method: "POST",
            body: Request(userId: userId, ingredients: ingredients)
        )
        
        return ScanIngredientsResponse(
            ingredients: backendResponse.ingredients.map { item in
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
                    reason: item.reason
                )
            }
        )
    }
    
    struct AlternativeProductResponse: Codable {
        let suggestions: [String]
    }
    
    func getAlternativeProduct(userId: String, productType: String, context: String? = nil) async throws -> AlternativeProductResponse {
        struct Request: Encodable {
            let userId: String
            let productType: String
            let context: String?
        }
        
        return try await request(
            endpoint: "/scan/alternative-product",
            method: "POST",
            body: Request(userId: userId, productType: productType, context: context)
        )
    }
    
    func getGroceryList(userId: String) async throws -> [GroceryItem] {
        return try await request(endpoint: "/grocery-list?userId=\(userId)")
    }
    
    func addGroceryItem(userId: String, item: GroceryItem) async throws -> GroceryItem {
        struct Request: Encodable {
            let userId: String
            let name: String
            let category: String
        }
        
        let requestBody = Request(userId: userId, name: item.name, category: item.category)
        return try await request(endpoint: "/grocery-list", method: "POST", body: requestBody)
    }
    
    func scanFridge(image: UIImage, userId: String) async throws -> [GroceryItem] {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidImage
        }
        
        return try await request(
            endpoint: "/grocery-list/scan-fridge?userId=\(userId)",
            method: "POST",
            imageData: imageData
        )
    }
    
    func scanReceipt(image: UIImage, userId: String) async throws -> [GroceryItem] {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidImage
        }
        
        return try await request(
            endpoint: "/grocery-list/scan-receipt?userId=\(userId)",
            method: "POST",
            imageData: imageData
        )
    }
    
    func generateRecipe(userId: String) async throws -> Recipe {
        struct Request: Encodable {
            let userId: String
        }
        
        let recipes: [Recipe] = try await request(
            endpoint: "/recipes/generate",
            method: "POST",
            body: Request(userId: userId)
        )
        
        guard let firstRecipe = recipes.first else {
            throw APIError.invalidResponse
        }
        
        return firstRecipe
    }
    
    func veganizeRecipe(userId: String, inputText: String) async throws -> Recipe {
        struct Request: Encodable {
            let userId: String
            let inputText: String
        }
        
        return try await request(
            endpoint: "/recipes/veganize",
            method: "POST",
            body: Request(userId: userId, inputText: inputText)
        )
    }
    
    func getSavedRecipes(userId: String) async throws -> [Recipe] {
        return try await request(endpoint: "/recipes/saved?userId=\(userId)")
    }
    
    func saveRecipe(userId: String, recipe: Recipe) async throws -> Recipe {
        struct Request: Encodable {
            let userId: String
            let recipe: Recipe
        }
        
        return try await request(
            endpoint: "/recipes/save",
            method: "POST",
            body: Request(userId: userId, recipe: recipe)
        )
    }
    
    struct AnalyzeResponse: Codable {
        let success: Bool
        let violatesCount: Int
        let problematicIngredients: [ProblemIngredient]
    }
    
    struct ProblemIngredient: Codable {
        let original: String
        let suggestions: [String]
    }
    
    struct ChosenSubstitute: Codable {
        let original: String
        let substitute: String
    }
    
    struct CommitResponse: Codable {
        let adaptedRecipe: AdaptedRecipe
    }
    
    struct AdaptedRecipe: Codable {
        let id: String?
        let userId: String?
        let title: String?
        let tags: [String]?
        let duration: String?
        let ingredients: [ChosenSubstitute]?
        let steps: [String]?
        let text: String
        let previewImageUrl: String?
        let originalPrompt: String?
        let type: String?
        let substitutionMap: [String: String]?
    }
    
    func analyzeIngredient(ingredient: String, context: String, userID: String) async throws -> AnalyzeResponse {
        struct Request: Encodable {
            let userID: String
            let recipe: String
        }
        
        return try await request(
            endpoint: "/recipes/veganize/analyze",
            method: "POST",
            body: Request(userID: userID, recipe: ingredient)
        )
    }
    
    func commitSubstitutions(recipeText: String, chosenSubs: [ChosenSubstitute]) async throws -> String {
        struct Request: Encodable {
            let recipe: RecipeText
            let chosenSubs: [ChosenSubstitute]
        }
        
        struct RecipeText: Encodable {
            let text: String
        }
        
        let response: CommitResponse = try await request(
            endpoint: "/recipes/veganize/commit",
            method: "POST",
            body: Request(recipe: RecipeText(text: recipeText), chosenSubs: chosenSubs)
        )
        
        return response.adaptedRecipe.text
    }
    
    struct ChatResponse: Codable {
        let answer: String
    }
    
    func sendChatMessage(userId: String, question: String) async throws -> ChatResponse {
        struct Request: Encodable {
            let question: String
        }
        
        return try await request(
            endpoint: "/ai/ask",
            method: "POST",
            body: Request(question: question)
        )
    }
    
    struct ParseRestrictionsResponse: Codable {
        let restrictions: [String]
    }
    
    func parseDietaryRestrictions(text: String, userId: String) async throws -> ParseRestrictionsResponse {
        struct Request: Encodable {
            let userId: String
            let text: String
        }
        
        return try await request(
            endpoint: "/profile/parse-restrictions",
            method: "POST",
            body: Request(userId: userId, text: text)
        )
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case invalidImage
    case httpError(Int)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .invalidImage:
            return "Invalid image data"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}
