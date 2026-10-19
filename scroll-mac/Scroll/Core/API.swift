import Foundation

/// A failure with a sentence that is safe to show.
struct APIError: LocalizedError {
    let message: String
    var status = 0
    var errorDescription: String? { message }
}

/// Talks to the site's JSON routes. The token (when there is one) goes on every request; the app never uses cookies.
final class API: @unchecked Sendable {
    var token: String?
    private let session: URLSession
    private let decoder = JSONDecoder()

    init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 25
        cfg.httpShouldSetCookies = false
        cfg.httpCookieStorage = nil
        cfg.urlCache = URLCache(memoryCapacity: 64 << 20, diskCapacity: 256 << 20)
        session = URLSession(configuration: cfg)
    }

    struct Empty: Codable {}
    private struct Failure: Decodable { var error: String? }

    func get<T: Decodable>(_ path: String, query: [String: String] = [:], as: T.Type = T.self) async throws -> T {
        try await send("GET", path, query: query, body: Optional<Empty>.none)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, _ body: B, as: T.Type = T.self) async throws -> T {
        try await send("POST", path, query: [:], body: body)
    }

    private func send<T: Decodable, B: Encodable>(_ method: String, _ path: String, query: [String: String], body: B?) async throws -> T {
        var c = URLComponents(url: Config.base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { c.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) } }
        guard let url = c.url else { throw APIError(message: "That address is not valid.") }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "accept")
        req.setValue("scroll-mac/\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1")", forHTTPHeaderField: "user-agent")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
            req.setValue("application/json", forHTTPHeaderField: "content-type")
        }
        let data: Data, res: URLResponse
        do {
            (data, res) = try await session.data(for: req)
        } catch let e as URLError where e.code == .cancelled {
            throw CancellationError()
        } catch {
            throw APIError(message: "Could not reach logoless. Check your connection and try again.")
        }
        let status = (res as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let msg = (try? decoder.decode(Failure.self, from: data))?.error
            throw APIError(message: msg ?? (status == 401 ? "Please sign in." : "Something went wrong. Please try again."), status: status)
        }
        do { return try decoder.decode(T.self, from: data) }
        catch { throw APIError(message: "logoless sent something the app did not understand. Update the app and try again.", status: status) }
    }
}
