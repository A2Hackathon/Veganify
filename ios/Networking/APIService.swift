
class APIService {
    static let shared = APIService()
    private let baseURL = "https://your-backend-url.com/api"
    
    // call /veganize/analyze
    func analyzeIngredient(ingredient: String, context: String, userID: String) async throws -> AnalyzeResponse {
        let url = URL(string: "\(baseURL)/veganize/analyze")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["userID": userID, "recipe": ingredient]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(AnalyzeResponse.self, from: data)
    }

    func commitSubstitutions(recipeText: String, chosenSubs: [ChosenSubstitute]) async throws -> String {
        let url = URL(string: "\(baseURL)/veganize/commit")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "recipe": ["text": recipeText],
            "chosenSubs": chosenSubs.map { ["original": $0.original, "substitute": $0.substitute] }
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(CommitResponse.self, from: data)
        return response.adaptedRecipe.text
    }

    func scanIngredients(imageData: Data, userID: String) async throws -> ScanIngredientsResponse {
        let url = URL(string: "\(baseURL)/scan-ingredients")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        // Boundary for multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Build multipart form body
        var body = Data()

        // Add userID field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"userID\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(userID)\r\n".data(using: .utf8)!)

        // Add image file field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"scan.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)

        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        // Send request
        let (data, response) = try await URLSession.shared.data(for: request)

        // Check HTTP status
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            throw NSError(domain: "APIService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Server error"])
        }

        // Decode response
        return try JSONDecoder().decode(ScanIngredientsResponse.self, from: data)
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
        let ingredients: [ChosenSubstitute]
        let text: String
    }

    
    struct ScanIngredientsResponse: Codable {
        let success: Bool
        let isConsumable: Bool
        let ingredients: [BackendIngredient]
    }

    struct BackendIngredient: Codable {
        let name: String      // map to "original" or "name" returned by backend
        let allowed: String   // "Allowed", "Not Allowed", etc.
        let reason: String?   // optional reason from backend
    }

}
