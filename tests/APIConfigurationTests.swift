import Foundation

@main
struct ConfigurationChecks {
    static func main() throws {
        let token = "test-only-token-0123456789abcdef0123456789"
        func accepts(_ address: String, _ value: String? = nil) -> Bool {
            (try? APIConfiguration(environment: ["VEGANIFY_BASE_URL": address, "VEGANIFY_API_TOKEN": value ?? token])) != nil
        }
        precondition((try? APIConfiguration(environment: [:])) == nil)
        precondition(accepts("https://demo.example"))
        precondition(!accepts("https://demo.example", "short"))
        precondition(!accepts("https://demo.example", token + "\n"))
        precondition(!accepts("https://user:pass@demo.example"))
        precondition(!accepts("https://demo.example/path"))
        precondition(!accepts("https://demo.example?token=bad"))
        precondition(!accepts("http://192.168.1.2:4000"))
        precondition(!accepts("file:///tmp/demo"))
        #if DEBUG
        precondition(accepts("http://127.0.0.1:4000"))
        #else
        precondition(!accepts("http://127.0.0.1:4000"))
        #endif
        print("API configuration checks passed")
    }
}
