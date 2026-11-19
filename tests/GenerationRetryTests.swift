import Foundation

enum LostResponse: Error { case simulated }

actor Gate {
    private var continuation: CheckedContinuation<Void, Never>?
    var started = false
    func wait() async {
        started = true
        await withCheckedContinuation { continuation = $0 }
    }
    func release() { continuation?.resume(); continuation = nil }
}

@main
struct GenerationRetryChecks {
    static func main() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let server = URL(string: "https://demo.example")!
        let now = Date(timeIntervalSince1970: 1_000_000)
        let store = GenerationRetryStore(directory: directory)
        var original = ""
        do {
            let _: String = try await store.run(server: server, userId: "one", now: now) { key in
                original = key
                throw LostResponse.simulated
            }
            preconditionFailure("Lost response must fail")
        } catch LostResponse.simulated {}
        precondition(UUID(uuidString: original) != nil)

        // Reconstruct the store to model process restart; no memory from the old store is used.
        let restarted = GenerationRetryStore(directory: directory)
        let recovered = try await restarted.run(server: server, userId: "one", now: now) { key in key }
        precondition(recovered == original)
        let next = try await restarted.run(server: server, userId: "one", now: now) { key in key }
        precondition(next != original)

        var failed = ""
        do {
            let _: String = try await restarted.run(server: server, userId: "one", now: now) { key in
                failed = key
                throw LostResponse.simulated
            }
        } catch LostResponse.simulated {}
        for date in [now.addingTimeInterval(23 * 3600), now.addingTimeInterval(-1)] {
            do {
                let _: String = try await restarted.run(server: server, userId: "one", now: date) { _ in
                    preconditionFailure("Expired attempt must not send")
                }
                preconditionFailure("Expired attempt must fail closed")
            } catch GenerationRetryStore.RetryError.expired {}
        }
        let other = try await restarted.run(server: server, userId: "two", now: now) { $0 }
        precondition(other != failed)
        let otherServer = try await restarted.run(server: URL(string: "https://other.example")!, userId: "one", now: now) { $0 }
        precondition(otherServer != failed)
        let explicitNew = try await restarted.run(server: server, userId: "one", startNew: true,
                                                  now: now.addingTimeInterval(24 * 3600)) { $0 }
        precondition(explicitNew != failed)

        let gate = Gate()
        let task = Task {
            try await restarted.run(server: server, userId: "one", now: now) { key in
                await gate.wait()
                return key
            }
        }
        while !(await gate.started) { await Task.yield() }
        do {
            let _: String = try await restarted.run(server: server, userId: "one", startNew: true, now: now) { _ in
                preconditionFailure("Concurrent request must not send")
            }
            preconditionFailure("Concurrent request must fail")
        } catch GenerationRetryStore.RetryError.inProgress {}
        // Completing a different user during the suspended request must preserve both scopes.
        do {
            let _: String = try await restarted.run(server: server, userId: "two", now: now) { key in
                failed = key
                throw LostResponse.simulated
            }
        } catch LostResponse.simulated {}
        await gate.release()
        _ = try await task.value
        let secondRecovery = try await restarted.run(server: server, userId: "two", now: now) { $0 }
        precondition(secondRecovery == failed)

        let file = directory.appendingPathComponent("pending.json")
        try Data("broken".utf8).write(to: file)
        do {
            let _: String = try await restarted.run(server: server, userId: "one", now: now) { _ in
                preconditionFailure("Corrupt state must not send")
            }
            preconditionFailure("Corrupt state must fail")
        } catch is DecodingError {}
        let blockedDirectory = directory.appendingPathComponent("not-a-directory")
        try Data().write(to: blockedDirectory)
        do {
            let _: String = try await GenerationRetryStore(directory: blockedDirectory).run(server: server, userId: "one") { _ in
                preconditionFailure("Failed persistence must not send")
            }
            preconditionFailure("Failed persistence must fail")
        } catch {}
        print("Generation retry lifecycle checks passed")
    }
}
