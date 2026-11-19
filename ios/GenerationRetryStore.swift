import Foundation

/// One pending generation per server/user. Persist before sending; failures keep the key.
actor GenerationRetryStore {
    static let shared = GenerationRetryStore()

    private struct Pending: Codable {
        let key: String
        let startedAt: Date
    }

    enum RetryError: LocalizedError {
        case inProgress, expired
        var errorDescription: String? {
            switch self {
            case .inProgress: return "A recipe request is already running."
            case .expired: return "This attempt is too old to retry safely. Check your recipes before choosing Start a new attempt."
            }
        }
    }

    private let directory: URL?
    private var active: Set<String> = []

    init(directory: URL? = nil) { self.directory = directory }

    private func fileURL() throws -> URL {
        let folder = try directory ?? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask,
            appropriateFor: nil, create: true
        ).appendingPathComponent("VeganifyGeneration", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder.appendingPathComponent("pending.json")
    }

    private func read(_ file: URL) throws -> [String: Pending] {
        guard FileManager.default.fileExists(atPath: file.path) else { return [:] }
        // Corrupt state must not silently turn an ambiguous retry into a new request.
        return try JSONDecoder().decode([String: Pending].self, from: Data(contentsOf: file))
    }

    func run<T>(server: URL, userId: String, startNew: Bool = false,
                now: Date = Date(), operation: (String) async throws -> T) async throws -> T {
        let scope = String(data: try JSONEncoder().encode([server.absoluteString, userId]), encoding: .utf8)!
        guard !active.contains(scope) else { throw RetryError.inProgress }
        active.insert(scope)
        defer { active.remove(scope) }

        let file = try fileURL()
        var pending = try read(file)
        let attempt: Pending
        if let existing = pending[scope], !startNew {
            // Leave a margin before the server's 24-hour receipt expiry; clock rollback fails closed.
            let age = now.timeIntervalSince(existing.startedAt)
            guard age >= 0, age < 23 * 60 * 60 else { throw RetryError.expired }
            attempt = existing
        } else {
            attempt = Pending(key: UUID().uuidString, startedAt: now)
            pending[scope] = attempt
            try JSONEncoder().encode(pending).write(to: file, options: .atomic)
        }

        let result = try await operation(attempt.key)
        // Other users may have completed while this operation awaited its response.
        pending = try read(file)
        pending.removeValue(forKey: scope)
        try JSONEncoder().encode(pending).write(to: file, options: .atomic)
        return result
    }
}
