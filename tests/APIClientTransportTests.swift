import Foundation

@main
struct TransportChecks {
    static func main() async throws {
        let args = CommandLine.arguments
        precondition(args.count == 4)
        let client = APIClient(environment: [
            "VEGANIFY_BASE_URL": args[1],
            "VEGANIFY_API_TOKEN": "transport-test-token-0123456789abcdef"
        ], retryStore: GenerationRetryStore(directory: URL(fileURLWithPath: args[2])))
        if args[3] == "lost" {
            do {
                _ = try await client.generateRecipe(userId: "transport-user")
                preconditionFailure("Lost response unexpectedly succeeded")
            } catch let error as URLError {
                precondition([.networkConnectionLost, .cannotConnectToHost, .timedOut, .badServerResponse].contains(error.code))
            }
        } else {
            let recovered = try await client.generateRecipe(userId: "transport-user")
            precondition(recovered.id == "recipe-1", "Retry must recover the committed batch")
            let next = try await client.generateRecipe(userId: "transport-user")
            precondition(next.id == "recipe-2", "Successful completion must start a new attempt next time")
        }
        print("Actual API client transport phase passed: \(args[3])")
    }
}
