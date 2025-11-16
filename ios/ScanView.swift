import SwiftUI
import Foundation

// -----------------------------------------------------
// MARK: - Models
// -----------------------------------------------------

struct IngredientResult: Codable, Identifiable {
    let id = UUID()
    let name: String
    let status: String      // allowed | not_allowed | ambiguous
    let reason: String
    let suggestions: [String]
}

struct ScanResponse: Codable {
    let ingredients: [IngredientResult]
}

// -----------------------------------------------------
// MARK: - Network Service
// -----------------------------------------------------

class ScanIngredientsService {
    private let endpoint = "https://YOUR_SERVER_URL/scan/ingredients/text"

    /// Sends the user's ingredient text to the backend and returns results
    func analyzeTextIngredients(userId: String, text: String) async throws -> [IngredientResult] {
        guard let url = URL(string: endpoint) else {
            throw URLError(.badURL)
        }

        let payload: [String: Any] = [
            "userId": userId,
            "text": text
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: payload)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData

        let (data, _) = try await URLSession.shared.data(for: request)
        let decoded = try JSONDecoder().decode(ScanResponse.self, from: data)

        return decoded.ingredients
    }
}

// -----------------------------------------------------
// MARK: - ViewModel
// -----------------------------------------------------

@MainActor
class ScanViewModel: ObservableObject {
    @Published var inputText = ""
    @Published var results: [IngredientResult] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ScanIngredientsService()

    func analyze(userId: String) async {
        guard !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter your ingredients."
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            results = try await service.analyzeTextIngredients(
                userId: userId,
                text: inputText
            )
        } catch {
            errorMessage = "Failed to analyze ingredients."
        }

        isLoading = false
    }
}

// -----------------------------------------------------
// MARK: - Main Scan View
// -----------------------------------------------------

struct ScanView: View {
    @StateObject private var vm = ScanViewModel()
    let userId: String

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                
                Text("Enter Ingredients")
                    .font(.title2)
                    .bold()

                TextEditor(text: $vm.inputText)
                    .frame(height: 140)
                    .padding(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.4), lineWidth: 1)
                    )

                Button {
                    Task { await vm.analyze(userId: userId) }
                } label: {
                    Text("Scan Ingredients")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.green)
                        .cornerRadius(12)
                }

                if vm.isLoading {
                    ProgressView("Analyzing…")
                        .padding(.top, 10)
                }

                if let error = vm.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .padding(.top, 5)
                }

                List(vm.results) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(item.name)
                                .font(.headline)

                            Spacer()

                            statusTag(item.status)
                        }

                        if !item.reason.isEmpty {
                            Text(item.reason)
                                .foregroundColor(.gray)
                                .font(.subheadline)
                        }

                        if !item.suggestions.isEmpty {
                            Text("Suggestions: " + item.suggestions.joined(separator: ", "))
                                .foregroundColor(.blue)
                                .font(.footnote)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .padding()
            .navigationTitle("Scan Ingredients")
        }
    }

    // Badge next to ingredient
    @ViewBuilder
    private func statusTag(_ status: String) -> some View {
        switch status {
        case "allowed":
            Text("✓ Allowed").foregroundColor(.green).font(.caption)
        case "not_allowed":
            Text("✗ Not Allowed").foregroundColor(.red).font(.caption)
        default:
            Text("? Ambiguous").foregroundColor(.orange).font(.caption)
        }
    }
}

// -----------------------------------------------------
// MARK: - Preview
// -----------------------------------------------------

struct ScanView_Previews: PreviewProvider {
    static var previews: some View {
        ScanView(userId: "12345")
    }
}
