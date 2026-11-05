import Foundation

struct APIConfiguration {
    let baseURL: URL
    let token: String

    init(environment: [String: String] = ProcessInfo.processInfo.environment) throws {
        guard let address = environment["VEGANIFY_BASE_URL"],
              let url = URL(string: address),
              let host = url.host, !host.isEmpty,
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.isEmpty || url.path == "/",
              let token = environment["VEGANIFY_API_TOKEN"],
              token.count >= 32, token.count <= 128,
              token.utf8.allSatisfy({ (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0) || $0 == 45 || $0 == 95 }) else {
            throw ConfigurationError.missingOrInvalid
        }
        #if DEBUG
        let loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].contains(host)
        guard url.scheme == "https" || (url.scheme == "http" && loopback) else {
            throw ConfigurationError.insecureTransport
        }
        #else
        guard url.scheme == "https" else { throw ConfigurationError.insecureTransport }
        #endif
        self.baseURL = url
        self.token = token
    }

    enum ConfigurationError: LocalizedError {
        case missingOrInvalid, insecureTransport
        var errorDescription: String? {
            switch self {
            case .missingOrInvalid: return "Configure the demo server URL and access token before connecting."
            case .insecureTransport: return "Use HTTPS for the demo server connection."
            }
        }
    }
}
