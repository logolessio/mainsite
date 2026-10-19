import Foundation

/// Where the app talks to, and the few facts it needs about the site and the movie database's pictures.
enum Config {
    /// The site. `SCROLL_BASE` points a development build at another address (for example a server on this Mac).
    static let base: URL = {
        if let s = ProcessInfo.processInfo.environment["SCROLL_BASE"], let u = URL(string: s) { return u }
        return URL(string: "https://logoless.io")!
    }()

    /// The address the system hands back to the app when the website has signed someone in (the website allows exactly this one).
    static let callbackScheme = "logoless"

    /// The link a shared trailer opens.
    static func shareLink(_ id: Int) -> String { "https://scroll.logoless.io/?m=\(id)" }

    private static let img = "https://image.tmdb.org/t/p"
    static func poster(_ p: String?, _ w: Int = 342) -> URL? { p.flatMap { URL(string: "\(img)/w\(w)\($0)") } }
    static func backdrop(_ p: String?, _ w: Int = 1280) -> URL? { p.flatMap { URL(string: "\(img)/w\(w)\($0)") } }
    /// A person's photo (the movie database sizes people's pictures by height).
    static func portrait(_ p: String?) -> URL? { p.flatMap { URL(string: "\(img)/h632\($0)") } }
    static func logo(_ p: String?) -> URL? { p.flatMap { URL(string: "\(img)/w92\($0)") } }
}
