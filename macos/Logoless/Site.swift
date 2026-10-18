import Foundation

/// Where the app is allowed to go, and what belongs to the site.
enum Site {
    static let home = URL(string: "https://logoless.io/")!

    /// Pages on these hosts open inside the app.
    static let hosts: Set<String> = ["logoless.io", "www.logoless.io", "dev.logoless.io", "owner.logoless.io", "admin.logoless.io"]

    /// Sign-in and payment pages the site sends people to and back from. They stay inside the app so signing in works.
    private static let signInDomains = ["google.com", "gstatic.com", "googleusercontent.com", "discord.com", "discordapp.com", "paypal.com", "paypalobjects.com", "cloudflare.com", "apple.com", "icloud.com"]

    static func isSite(_ host: String?) -> Bool {
        guard let host = host?.lowercased() else { return false }
        return hosts.contains(host)
    }

    static func isSignIn(_ host: String?) -> Bool {
        guard let host = host?.lowercased() else { return false }
        return signInDomains.contains { host == $0 || host.hasSuffix(".\($0)") }
    }

    /// Opens inside the app (the site, or the sign-in and payment pages around it).
    static func staysInApp(_ url: URL?) -> Bool {
        guard let url, url.scheme == "https" || url.scheme == "http" || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" else { return false }
        return url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" || isSite(url.host) || isSignIn(url.host)
    }

    static func url(host: String = "logoless.io", path: String) -> URL {
        URL(string: "https://\(host)\(path)") ?? home
    }
}

/// One place in the sidebar.
struct Place: Identifiable, Hashable {
    let id: String
    let title: String
    let symbol: String
    var host = "logoless.io"
    let path: String

    var url: URL { Site.url(host: host, path: path) }
}

struct PlaceGroup: Identifiable {
    let id: String
    let title: String
    let places: [Place]
}

enum Places {
    static let groups: [PlaceGroup] = [
        PlaceGroup(id: "browse", title: "Browse", places: [
            Place(id: "campaigns", title: "Campaigns", symbol: "square.grid.2x2", path: "/"),
            Place(id: "leaderboard", title: "Leaderboard", symbol: "trophy", path: "/leaderboard"),
            Place(id: "creators", title: "For creators", symbol: "sparkles", path: "/for-creators"),
            Place(id: "brands", title: "For brands", symbol: "megaphone", path: "/for-brands"),
            Place(id: "pricing", title: "Pricing", symbol: "dollarsign.circle", path: "/pricing"),
        ]),
        PlaceGroup(id: "creator", title: "Creator", places: [
            Place(id: "c-overview", title: "Overview", symbol: "rectangle.grid.1x2", path: "/dashboard"),
            Place(id: "c-submissions", title: "Submissions", symbol: "play.rectangle", path: "/dashboard/submissions"),
            Place(id: "c-earnings", title: "Earnings", symbol: "banknote", path: "/dashboard/earnings"),
            Place(id: "c-profile", title: "Profile", symbol: "person.crop.circle", path: "/dashboard/profile"),
            Place(id: "c-settings", title: "Settings", symbol: "gearshape", path: "/dashboard/settings"),
        ]),
        PlaceGroup(id: "brand", title: "Brand", places: [
            Place(id: "b-overview", title: "Overview", symbol: "chart.bar", path: "/brand"),
            Place(id: "b-campaigns", title: "Campaigns", symbol: "megaphone.fill", path: "/brand/campaigns"),
            Place(id: "b-balance", title: "Balance", symbol: "creditcard", path: "/brand/balance"),
        ]),
        PlaceGroup(id: "owner", title: "Owner", places: [
            Place(id: "o-overview", title: "Overview", symbol: "gauge.with.dots.needle.67percent", host: "owner.logoless.io", path: "/admin"),
            Place(id: "o-campaigns", title: "Campaigns", symbol: "megaphone", host: "owner.logoless.io", path: "/admin/campaigns"),
            Place(id: "o-submissions", title: "Submissions", symbol: "play.rectangle.on.rectangle", host: "owner.logoless.io", path: "/admin/submissions"),
            Place(id: "o-payouts", title: "Payouts", symbol: "banknote.fill", host: "owner.logoless.io", path: "/admin/payouts"),
            Place(id: "o-people", title: "People", symbol: "person.2", host: "owner.logoless.io", path: "/admin/people"),
            Place(id: "o-inbox", title: "Inbox", symbol: "tray", host: "owner.logoless.io", path: "/admin/inbox"),
            Place(id: "o-site", title: "Site", symbol: "paintpalette", host: "owner.logoless.io", path: "/admin/design"),
            Place(id: "o-system", title: "System", symbol: "waveform.path.ecg", host: "owner.logoless.io", path: "/admin/system"),
        ]),
        PlaceGroup(id: "help", title: "Help", places: [
            Place(id: "faq", title: "Questions", symbol: "questionmark.circle", path: "/faq"),
            Place(id: "contact", title: "Contact", symbol: "envelope", path: "/contact"),
            Place(id: "status", title: "Status", symbol: "dot.radiowaves.left.and.right", path: "/status"),
        ]),
    ]

    static let all = groups.flatMap(\.places)

    /// The place a page belongs to: the longest matching address on the same host.
    static func match(host: String?, path: String) -> Place? {
        let host = (host ?? "logoless.io").lowercased()
        let hostName = host == "www.logoless.io" ? "logoless.io" : host
        return all
            .filter { $0.host == hostName && (path == $0.path || ($0.path != "/" && path.hasPrefix($0.path + "/"))) }
            .max { $0.path.count < $1.path.count }
    }
}

/// The four places in the floating glass bar.
struct Quick: Identifiable, Hashable {
    let id: String
    let title: String
    let symbol: String
    let path: String

    static let all = [
        Quick(id: "discover", title: "Discover", symbol: "square.grid.2x2", path: "/"),
        Quick(id: "dashboard", title: "Dashboard", symbol: "rectangle.grid.1x2", path: "/dashboard"),
        Quick(id: "earnings", title: "Earnings", symbol: "banknote", path: "/dashboard/earnings"),
        Quick(id: "profile", title: "Profile", symbol: "person.crop.circle", path: "/dashboard/profile"),
    ]

    static func match(host: String?, path: String) -> Quick? {
        guard Site.isSite(host), host != "owner.logoless.io", host != "admin.logoless.io" else { return nil }
        if path == "/" || path.hasPrefix("/campaign/") { return all[0] }
        return all.dropFirst().filter { path == $0.path || path.hasPrefix($0.path + "/") }.max { $0.path.count < $1.path.count }
            ?? (path.hasPrefix("/dashboard") ? all[1] : nil)
    }
}
