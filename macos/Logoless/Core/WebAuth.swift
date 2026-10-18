import AuthenticationServices
import SwiftUI

/// Shows the website's own sign-in in a system sheet and returns the address it hands back (logoless://auth?code=...).
/// The app never sees a password; Google, Discord and email sign-in all happen on the website.
@MainActor
final class WebAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func run(url: URL) async throws -> URL {
        #if DEBUG
        // development aid: stand in for the website's sheet with a session cookie, to test the hand-off without a person at the keyboard
        if let cookie = ProcessInfo.processInfo.environment["LOGOLESS_FAKE_WEBAUTH"] { return try await fake(url, cookie: cookie) }
        #endif
        return try await withCheckedThrowingContinuation { cont in
            let s = ASWebAuthenticationSession(url: url, callback: .customScheme(Config.callbackScheme)) { callback, error in
                if let callback { cont.resume(returning: callback) } else { cont.resume(throwing: error ?? CancellationError()) }
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.session = s
            if !s.start() { cont.resume(throwing: APIError(message: "The sign-in window could not be opened.")) }
        }
    }

    #if DEBUG
    private func fake(_ url: URL, cookie: String) async throws -> URL {
        let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        var req = URLRequest(url: Config.base.appendingPathComponent("api/app/code"))
        req.httpMethod = "POST"
        req.setValue(cookie, forHTTPHeaderField: "cookie")
        req.setValue("\(Config.base.scheme ?? "http")://\(Config.base.host ?? "localhost")\(Config.base.port.map { ":\($0)" } ?? "")", forHTTPHeaderField: "origin")
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["state": q.first { $0.name == "state" }?.value ?? "", "challenge": q.first { $0.name == "challenge" }?.value ?? ""])
        let (data, _) = try await URLSession.shared.data(for: req)
        guard let r = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["redirect"] as? String, let u = URL(string: r) else { throw APIError(message: "fake web sign-in failed: \(String(data: data, encoding: .utf8) ?? "")") }
        return u
    }
    #endif

    func cancel() { session?.cancel() }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        #if os(macOS)
        NSApp.keyWindow ?? NSApp.windows.first(where: { $0.isVisible }) ?? ASPresentationAnchor()
        #else
        (UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow)) ?? ASPresentationAnchor()
        #endif
    }
}
