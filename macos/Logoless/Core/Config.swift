import Foundation

/// Where the app talks to, and the few facts it needs about the site.
enum Config {
    /// The site. `LOGOLESS_BASE` points a development build at another address (for example a server on this Mac).
    static let base: URL = {
        if let s = ProcessInfo.processInfo.environment["LOGOLESS_BASE"], let u = URL(string: s) { return u }
        return URL(string: "https://logoless.io")!
    }()

    /// The address the system hands back to the app when the website has signed someone in.
    static let callbackScheme = "logoless"

    /// A picture or page address from the site, which may be written as a path ("/covers/01.jpg") or in full.
    static func resolve(_ s: String?) -> URL? {
        guard let s, !s.isEmpty else { return nil }
        if s.hasPrefix("http://") || s.hasPrefix("https://") { return URL(string: s) }
        return URL(string: s, relativeTo: base)?.absoluteURL
    }

    static var isLocal: Bool { base.host == "localhost" || base.host == "127.0.0.1" }
}
