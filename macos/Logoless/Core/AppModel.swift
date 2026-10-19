import CryptoKit
import WebKit
import Observation
import SwiftUI

/// The pages of the dashboard (the website's /dashboard), each with the menu it belongs to.
enum DashPage: String, CaseIterable, Identifiable, Hashable {
    case overview, submissions, earnings, profile, achievements, saved, settings, notifications, queue
    var id: String { rawValue }
    var title: String {
        switch self {
        case .overview: "Overview"
        case .submissions: "Submissions"
        case .earnings: "Earnings"
        case .profile: "Profile"
        case .achievements: "Achievements"
        case .saved: "Saved"
        case .settings: "Settings"
        case .notifications: "Notifications"
        case .queue: "Queue"
        }
    }
    var symbol: String {
        switch self {
        case .overview: "square.grid.2x2"
        case .submissions: "film.stack"
        case .earnings: "dollarsign.circle"
        case .profile, .achievements, .saved: "person.crop.circle"
        case .settings, .notifications: "gearshape"
        case .queue: "checklist"
        }
    }
    /// The item in the left rail that stands for this page (Achievements and Saved live under Profile, Notifications under Settings).
    var rail: DashPage {
        switch self {
        case .achievements, .saved: .profile
        case .notifications: .settings
        default: self
        }
    }
    /// The glass tabs shown at the top of the page, if it shares a menu with its neighbours.
    var tabs: [DashPage] {
        switch rail {
        case .profile: [.profile, .achievements, .saved]
        case .settings: [.settings, .notifications]
        default: []
        }
    }
    var webPath: String { self == .overview ? "/dashboard" : self == .queue ? "/admin/submissions" : "/dashboard/\(rawValue)" }
}

/// Where the person is: the site (home, a campaign) or the dashboard.
enum Route: Hashable {
    case home
    case campaign(String)
    case dash(DashPage)
    /// A page of the website shown inside the app (a path such as "/pricing"), for every page that has no screen of its own.
    case page(String)
    var isDash: Bool { if case .dash = self { return true } else { return false } }
    /// Pages whose own layout has a rail and a header (the brand and owner dashboards), so the app's top bar stays away.
    var isFullWeb: Bool {
        guard case .page(let p) = self else { return false }
        if p.hasPrefix("http") { return true }
        return ["/dashboard", "/brand", "/admin", "/dev", "/owner"].contains { p == $0 || p.hasPrefix($0 + "/") || p.hasPrefix($0 + "?") }
    }
}

enum Phase { case starting, signedOut, signedIn }

@MainActor @Observable
final class AppModel {
    // where the person is
    var route: Route = .home
    private(set) var history: [Route] = []
    var showJump = false
    var showMenu = false
    var showBell = false
    var showOnboarding = false
    var onboardingStart = 0
    var onboardingRole: String?
    var liquidLoader = false
    var features: [String: Bool] = [:]
    /// How the campaigns are laid out and how the text on a cover looks (the site's Design page).
    var design = SiteDesign()
    /// Set by the web page on screen: asks it to go back one page; returns true if it did.
    var webBack: (() -> Bool)?

    // who they are
    var phase: Phase = .starting
    var me: Me?
    var signingIn = false
    var banner: String?

    // what the site has told us
    var campaigns: [Campaign] = []
    var favorites: Set<String> = []
    var home: Home?
    var submissions: [Submission] = []
    var earnings: Earnings?
    var notifications: [AppNotification] = []
    var unread = 0
    var staff: Staff?
    var achievements: Achievements?

    // what is loading, and what went wrong
    var loading: Set<String> = []
    var failures: [String: String] = [:]
    var loadedCampaigns = false

    let api = API()
    let player = PreviewPlayer()
    private let webAuth = WebAuth()
    private var pending: (verifier: String, state: String)?
    private var poller: Task<Void, Never>?

    var isSignedIn: Bool { phase == .signedIn }
    var isAdmin: Bool { me?.isAdmin == true }

    // MARK: start up

    private static let onboardedKey = "onboarded.v1"

    private var started = false

    func start() async {
        guard !started else { return } // the window can ask more than once (a new window, a picture of the screen)
        started = true
        showOnboarding = !UserDefaults.standard.bool(forKey: Self.onboardedKey)
        #if DEBUG
        if ProcessInfo.processInfo.environment["LOGOLESS_ONBOARDING"] != nil { showOnboarding = true }
        #endif
        var token = TokenStore.load()
        #if DEBUG
        if let t = ProcessInfo.processInfo.environment["LOGOLESS_TOKEN"], !t.isEmpty { token = t }
        #endif
        api.token = token
        async let list: Void = loadCampaigns()
        Task { await loadConfig() }
        if token != nil { await refreshMe() } else { phase = .signedOut }
        await list
        if isSignedIn { startPolling(); await loadCurrent() }
        #if DEBUG
        if let p = ProcessInfo.processInfo.environment["LOGOLESS_OPEN"] { showOnboarding = false; goPage(p) }
        #endif
    }

    func refreshMe() async {
        do {
            let m: Me = try await api.get("/api/me/nav")
            if m.signedIn {
                me = m
                unread = m.unread
                phase = .signedIn
                updateBadge()
            } else {
                dropSession()
            }
        } catch let e as APIError where e.isUnauthorized {
            dropSession()
        } catch {
            // no connection: stay as we were, the person can retry
            if phase == .starting { phase = api.token == nil ? .signedOut : .signedIn }
            banner = (error as? APIError)?.message
        }
    }

    private func dropSession() {
        TokenStore.clear()
        api.token = nil
        me = nil; home = nil; submissions = []; earnings = nil; notifications = []; staff = nil; unread = 0
        favorites = []
        phase = .signedOut
        poller?.cancel()
        updateBadge()
        if route.isDash { route = .home; history = [] }
    }

    // MARK: first launch

    func finishOnboarding() {
        UserDefaults.standard.set(true, forKey: Self.onboardedKey)
        withAnimation(Motion.ease(0.6)) { showOnboarding = false }
        route = .home
    }

    func replayOnboarding() { beginOnboarding() }

    /// Is this username free? nil when it could not be checked.
    func handleAvailable(_ h: String) async -> Bool? {
        struct R: Decodable { let available: Bool }
        let q = h.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? h
        let r: R? = try? await api.get("/api/me/handle?h=\(q)")
        return r?.available
    }

    /// The end of sign-up: what the person told us becomes their profile.
    func completeProfile(name: String, handle: String, bio: String, linked: [String: String]) async throws {
        struct Body: Encodable { let role = "clipper"; let name: String; let handle: String; let bio: String; let linked: [String: String] }
        let _: API.OK = try await api.post("/api/me/onboarding", Body(name: name, handle: handle, bio: bio, linked: linked))
        await refreshMe()
    }

    func addPaypal(_ email: String) async throws {
        struct Body: Encodable { let email: String }
        let _: API.OK = try await api.post("/api/me/paypal", Body(email: email))
    }

    // MARK: signing in and out

    func signIn() async {
        guard !signingIn else { return }
        signingIn = true
        defer { signingIn = false }
        let verifier = Self.random(48)
        let state = Self.random(12)
        let challenge = Self.b64url(Data(SHA256.hash(data: Data(verifier.utf8))))
        pending = (verifier, state)
        var c = URLComponents(url: Config.base.appendingPathComponent("app/connect"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "state", value: state), URLQueryItem(name: "challenge", value: challenge)]
        do {
            let back = try await webAuth.run(url: c.url!)
            await finishSignIn(back)
        } catch is CancellationError {
            pending = nil
        } catch let e as NSError where e.domain == "com.apple.AuthenticationServices.WebAuthenticationSession" && e.code == 1 {
            pending = nil // closed the sheet
        } catch {
            pending = nil
            banner = (error as? APIError)?.message ?? "Signing in did not finish. Please try again."
        }
    }

    /// The address the website handed back: logoless://auth?code=...&state=...
    func finishSignIn(_ url: URL) async {
        guard url.scheme == Config.callbackScheme, let pending else { return }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard let code = items.first(where: { $0.name == "code" })?.value, items.first(where: { $0.name == "state" })?.value == pending.state else {
            banner = "That sign-in did not match the one the app started. Please try again."
            return
        }
        self.pending = nil
        struct Body: Encodable { let code: String; let verifier: String; let device: String }
        struct Reply: Decodable { let token: String }
        do {
            let r: Reply = try await api.post("/api/app/token", Body(code: code, verifier: pending.verifier, device: Platform.deviceName))
            TokenStore.save(r.token)
            api.token = r.token
            banner = nil
            await refreshMe()
            if isSignedIn { startPolling(); await loadCampaigns(); await loadCurrent() }
        } catch {
            banner = (error as? APIError)?.message ?? "Signing in did not finish. Please try again."
        }
    }

    func signOut() async {
        struct Empty: Encodable {}
        let _: API.OK? = try? await api.post("/api/app/signout", Empty())
        // the site's own pages inside the app were signed in with a web session; it goes too
        await WKWebsiteDataStore.default().removeData(ofTypes: [WKWebsiteDataTypeCookies, WKWebsiteDataTypeLocalStorage, WKWebsiteDataTypeSessionStorage], modifiedSince: .distantPast)
        dropSession()
    }

    // MARK: loading

    private func run<T>(_ key: String, _ work: () async throws -> T) async -> T? {
        loading.insert(key)
        defer { loading.remove(key) }
        do {
            let v = try await work()
            failures[key] = nil
            return v
        } catch is CancellationError {
            return nil
        } catch let e as APIError {
            if e.isUnauthorized, api.token != nil { dropSession() } else { failures[key] = e.message }
            return nil
        } catch {
            failures[key] = "Something went wrong. Please try again."
            return nil
        }
    }

    func loadCampaigns() async {
        if let l: CampaignList = await run("campaigns", { try await api.get("/api/app/v1/campaigns") }) {
            campaigns = l.campaigns
            favorites = Set(l.favorites)
            loadedCampaigns = true
        }
    }

    func load(_ page: DashPage) async {
        switch page {
        case .overview: if let h: Home = await run("home", { try await api.get("/api/app/v1/home") }) { home = h; unread = h.unread; updateBadge() }
        case .submissions: if let s: SubmissionList = await run("submissions", { try await api.get("/api/app/v1/submissions") }) { submissions = s.submissions }
        case .earnings: if let e: Earnings = await run("earnings", { try await api.get("/api/app/v1/earnings") }) { earnings = e }
        case .notifications: await loadNotifications()
        case .profile, .settings: await refreshMe()
        case .saved: await loadCampaigns()
        case .achievements: if let a: Achievements = await run("achievements", { try await api.get("/api/app/v1/achievements") }) { achievements = a }
        case .queue: await loadStaff()
        }
    }

    /// Loads whatever the current page needs.
    func loadCurrent() async {
        switch route {
        case .home, .campaign: await loadCampaigns()
        case .dash(let p): await load(p)
        case .page: break
        }
    }

    func loadNotifications() async {
        if let n: NotificationList = await run("notifications", { try await api.get("/api/me/notifications") }) {
            notifications = n.items
            unread = n.unread
            updateBadge()
        }
    }

    func loadStaff() async {
        if let s: Staff = await run("staff", { try await api.get("/api/app/v1/staff") }) { staff = s }
    }

    func refreshCurrent() async { await loadCurrent() }

    // MARK: things people do

    func isSaved(_ c: Campaign) -> Bool { favorites.contains(c.id) }

    func toggleSaved(_ c: Campaign) async {
        guard isSignedIn else { await signIn(); return }
        let on = !favorites.contains(c.id)
        if on { favorites.insert(c.id) } else { favorites.remove(c.id) }
        struct Body: Encodable { let campaignId: String; let on: Bool }
        let ok: API.OK? = await run("favorite", { try await api.post("/api/me/favorites", Body(campaignId: c.id, on: on)) })
        if ok == nil { if on { favorites.remove(c.id) } else { favorites.insert(c.id) } }
    }

    func submit(to c: Campaign, platform: String, url: String) async throws -> SubmitResult {
        struct Body: Encodable { let platform: String; let url: String }
        let r: SubmitResult = try await api.post("/api/campaigns/\(c.id)/submit", Body(platform: platform, url: url))
        Task { await load(.overview); await load(.submissions) }
        return r
    }

    func withdraw(email: String, dollars: Double?) async throws -> WithdrawResult {
        struct Body: Encodable { let email: String; let amount: Double? }
        let r: WithdrawResult = try await api.post("/api/payouts/withdraw", Body(email: email, amount: dollars))
        await load(.earnings)
        Task { await load(.overview) }
        return r
    }

    func markRead(_ n: AppNotification) async {
        guard !n.isRead, let i = notifications.firstIndex(where: { $0.id == n.id }) else { return }
        notifications[i].readAt = Int(Date().timeIntervalSince1970)
        unread = max(0, unread - 1)
        updateBadge()
        struct Body: Encodable { let id: String }
        let _: API.OK? = await run("notif", { try await api.post("/api/me/notifications", Body(id: n.id)) })
    }

    func markAllRead() async {
        let now = Int(Date().timeIntervalSince1970)
        for i in notifications.indices where notifications[i].readAt == nil { notifications[i].readAt = now }
        unread = 0
        updateBadge()
        let _: API.OK? = await run("notif", { try await api.post("/api/me/notifications", API.Empty()) })
    }

    func clearNotifications() async {
        notifications = []
        unread = 0
        updateBadge()
        let _: API.OK? = await run("notif", { try await api.delete("/api/me/notifications", API.Empty()) })
    }

    func saveProfile(displayName: String, bio: String) async -> Bool {
        struct Body: Encodable { let displayName: String; let bio: String }
        struct Reply: Decodable {}
        let r: Reply? = await run("profile", { try await api.put("/api/me/profile", Body(displayName: displayName, bio: bio)) })
        if r != nil { await refreshMe() }
        return r != nil
    }

    // MARK: the owner's queue

    func decide(_ s: StaffSubmission, approve: Bool, reason: String = "") async -> Bool {
        struct Body: Encodable { let action: String; let reason: String? }
        let ok: API.OK? = await run("decide", { try await api.post("/api/admin/submissions/\(s.id)", Body(action: approve ? "approve" : "reject", reason: approve ? nil : reason)) })
        if ok != nil { staff?.pending.removeAll { $0.id == s.id }; await loadStaff() }
        return ok != nil
    }

    func decide(_ p: StaffPayout, approve: Bool, note: String = "") async -> Bool {
        struct Body: Encodable { let action: String; let note: String? }
        let ok: API.OK? = await run("decide", { try await api.post("/api/admin/payouts/\(p.id)", Body(action: approve ? "approve" : "reject", note: approve ? nil : note)) })
        if ok != nil { staff?.review.removeAll { $0.id == p.id }; await loadStaff() }
        return ok != nil
    }

    // MARK: movement

    /// Moves to a page. The dashboard needs an account: signed-out people are asked to sign in first.
    func go(_ r: Route) {
        guard r != route else { return }
        if (r.isDash || r.isFullWeb) && !isSignedIn && phase != .starting {
            Task { await signIn(); if isSignedIn { go(r) } }
            return
        }
        history.append(route)
        if history.count > 40 { history.removeFirst() }
        showMenu = false; showBell = false; showJump = false
        withAnimation(Motion.page) { route = r }
        Task { await loadCurrent() }
    }

    func back() {
        if case .page = route, webBack?() == true { return }
        guard let last = history.popLast() else { return }
        showMenu = false; showBell = false
        withAnimation(Motion.page) { route = last }
    }

    var canGoBack: Bool { !history.isEmpty }

    /// The screen the app has for a page of the site, if it has one.
    func nativeRoute(forPath raw: String) -> Route? {
        var path = raw.components(separatedBy: CharacterSet(charactersIn: "?#"))[0]
        while path.count > 1 && path.hasSuffix("/") { path.removeLast() }
        if path.isEmpty || path == "/" { return .home }
        let parts = path.split(separator: "/").map(String.init)
        if parts.count == 2, parts[0] == "campaign" { return .campaign(parts[1]) }
        if parts.first == "dashboard" {
            if parts.count == 1 { return .dash(.overview) }
            if parts.count == 2 {
                if parts[1] == "overview" { return .dash(.overview) }
                if parts[1] == "payouts" { return .dash(.earnings) }
                if let p = DashPage(rawValue: parts[1]), p != .queue { return .dash(p) }
            }
        }
        return nil
    }

    /// Opens a page of the site: the app's own screen if it has one, otherwise the page itself, inside the app.
    func goPage(_ path: String) {
        if let r = nativeRoute(forPath: path) { go(r) } else { go(.page(path)) }
    }

    /// An address that shows the page already signed in (see /app/web on the site), or the plain address when signed out.
    func webURL(for path: String) async -> URL {
        let direct = URL(string: path, relativeTo: Config.base)?.absoluteURL ?? Config.base
        guard isSignedIn else { return direct }
        struct Body: Encodable { let next: String }
        struct Reply: Decodable { let url: String }
        if let r: Reply = try? await api.post("/api/app/web-link", Body(next: path)), let u = URL(string: r.url) { return u }
        return direct
    }

    /// The owner dashboard: its own address on the real site, /admin on a local copy.
    func goOwner() {
        if let h = Config.base.host, h == "logoless.io" || h.hasSuffix(".logoless.io") { go(.page("https://owner.logoless.io/")) } else { go(.page("/admin")) }
    }

    func loadConfig() async {
        struct F: Decodable { let leaderboard: Bool; let reels: Bool; let status: Bool }
        struct C: Decodable { let liquidLoader: Bool; let features: F; let design: SiteDesign? }
        if let c: C = try? await api.get("/api/app/v1/config") {
            liquidLoader = c.liquidLoader
            if let d = c.design { design = d }
            features = ["leaderboard": c.features.leaderboard, "reels": c.features.reels, "status": c.features.status]
        }
    }

    /// Plays the site's onboarding from the top (a link such as /onboarding?role=brand lands here).
    func beginOnboarding(role: String? = nil) {
        onboardingStart = 0
        onboardingRole = role
        withAnimation(Motion.ease(0.6)) { showOnboarding = true }
    }

    /// Has this account been through onboarding already (on this or another device)?
    func onboardingDone() async -> Bool {
        struct R: Decodable { let done: Bool }
        let r: R? = try? await api.get("/api/app/v1/onboarding")
        return r?.done ?? false
    }

    func open(_ c: Campaign) { go(.campaign(c.id)) }
    func open(campaignID: String) { go(.campaign(campaignID)) }
    func campaign(_ id: String) -> Campaign? { campaigns.first { $0.id == id } }

    func openOnWeb() {
        let path: String
        switch route {
        case .home: path = "/"
        case .campaign(let id): path = "/campaign/\(id)"
        case .dash(let p): path = p.webPath
        case .page(let p): path = p
        }
        Platform.open(URL(string: path, relativeTo: Config.base)?.absoluteURL ?? Config.base)
    }

    // MARK: while the app is open

    private func startPolling() {
        poller?.cancel()
        poller = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard let self, !Task.isCancelled else { return }
                if Platform.isActive { await self.refreshMe(); if self.isAdmin { await self.loadStaff() } }
            }
        }
    }

    private func updateBadge() {
        let n = isSignedIn ? unread + (isAdmin ? (staff?.pendingSubmissions ?? 0) : 0) : 0
        Platform.setBadge(n)
    }

    // MARK: helpers

    private static func random(_ bytes: Int) -> String {
        var b = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &b)
        return b64url(Data(b))
    }

    private static func b64url(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
