import AppKit
import CryptoKit
import SwiftUI
import Foundation
import Observation
import WebKit

/// Everything the app knows and does: who is signed in, the feed, what is playing, and what is on screen.
@MainActor
@Observable
final class ScrollModel {
    enum Phase { case launching, onboarding, main }
    enum Tab: String { case watch, account, settings }
    enum ObStep { case welcome, favorites, name, account, saving, youtube }

    // MARK: session
    var phase: Phase = .launching
    var profile: Profile?
    var signedIn = false
    var signingIn = false
    var banner: String?
    var ytSignedIn = false

    // MARK: onboarding
    var obStep: ObStep = .welcome
    var picks: [Mini] = []
    var name = ""
    var trending: [Mini] = []
    var results: [Mini]?
    var obError = ""

    // MARK: the feed
    var clips: [Clip] = []
    var currentID: Int?
    var feedError: String?
    var loadingMore = false

    // MARK: playback
    var paused = false
    var muted = false
    var playing = false
    var scrolling = false
    var stuck = false
    var gate = false
    var progress = 0.0
    var idle = false
    var windowActive = true

    // MARK: what is on screen
    var tab: Tab = .watch
    var personID: Int?
    var showSearch = false
    var showWhere = false
    var showTheater = false
    var showYouTubeSignIn = false
    var popup: WKWebView?
    var toastText: String?

    @ObservationIgnored let api = API()
    @ObservationIgnored let player = PlayerController()
    @ObservationIgnored private let webAuth = WebAuth()
    @ObservationIgnored private var pending: (verifier: String, state: String)?
    @ObservationIgnored private var cursor = 0
    @ObservationIgnored private var loadedKey: String?
    @ObservationIgnored private var loadTask: Task<Void, Never>?
    @ObservationIgnored private var stuckTask: Task<Void, Never>?
    @ObservationIgnored private var idleTask: Task<Void, Never>?
    @ObservationIgnored private var toastTask: Task<Void, Never>?
    @ObservationIgnored private var sentTime = -1.0

    init() {
        player.onEvent = { [weak self] e in self?.handle(e) }
        player.onPopup = { [weak self] w in self?.popup = w }
    }

    // MARK: derived

    var currentIndex: Int? { currentID.flatMap { id in clips.firstIndex { $0.id == id } } }
    var current: Clip? { currentIndex.map { clips[$0] } }
    var settings: Settings { profile?.settings ?? Settings(region: "US", sound: true, autoNext: false, ambient: false, glass: 70, perf: "auto") }
    var overlayOpen: Bool { personID != nil || showSearch || showWhere || showTheater || showYouTubeSignIn || popup != nil || tab != .watch }

    /// Whether the trailer on screen should be playing right now.
    var shouldPlay: Bool { phase == .main && !paused && !scrolling && !overlayOpen && windowActive }

    /// A value that changes whenever the player may need to be told something.
    struct Signature: Hashable { var key: String?; var play: Bool; var muted: Bool }
    var signature: Signature { Signature(key: current?.trailer.key, play: shouldPlay, muted: muted) }

    /// The one sheet that is open (several at once are not possible): a YouTube page's own window first, then the sign-in, then the trailer window.
    enum ActiveSheet: Int, Identifiable { case popup, youtube, theater; var id: Int { rawValue } }
    var activeSheet: ActiveSheet? { popup != nil ? .popup : showYouTubeSignIn ? .youtube : showTheater ? .theater : nil }
    func closeSheets() { popup = nil; showYouTubeSignIn = false; showTheater = false }

    /// Something the pointer-and-key watcher should react to when it changes.
    var idleWatch: Bool { playing && !paused && !stuck && !overlayOpen }

    func isLiked(_ id: Int) -> Bool { profile?.liked.contains { $0.id == id } ?? false }
    func isSaved(_ id: Int) -> Bool { profile?.saved.contains { $0.id == id } ?? false }

    // MARK: launch

    func start() async {
        #if DEBUG
        if let t = ProcessInfo.processInfo.environment["SCROLL_TOKEN"] { api.token = t }
        #endif
        if api.token == nil { api.token = TokenStore.load() }
        ytSignedIn = await YouTubeAccount.isSignedIn()
        if api.token != nil { await refreshMe() }
        if profile != nil {
            muted = !(settings.sound)
            phase = .main
            await loadFeed()
            #if DEBUG
            debugOpen()
            #endif
        } else {
            obStep = signedIn ? .favorites : .welcome
            phase = .onboarding
            await loadTrending()
            #if DEBUG
            debugOnboarding()
            #endif
        }
    }

    #if DEBUG
    /// Development aid: open a screen straight away (SCROLL_OPEN=search|where|account|settings|theater|youtube|person:<id>) so it can be looked at.
    private func debugOpen() {
        // SCROLL_AUTOSTEP=<seconds>: go to the next trailer after that long (the same as pressing the down arrow)
        if let t = ProcessInfo.processInfo.environment["SCROLL_AUTOSTEP"], let secs = Double(t) {
            Task { try? await Task.sleep(for: .seconds(secs)); step(1) }
        }
        guard let o = ProcessInfo.processInfo.environment["SCROLL_OPEN"] else { return }
        switch o {
        case "search": showSearch = true
        case "where": showWhere = true
        case "account": tab = .account
        case "settings": tab = .settings
        case "theater": showTheater = true
        case "youtube": showYouTubeSignIn = true
        case "pause": paused = true
        default: if o.hasPrefix("person:"), let id = Int(o.dropFirst(7)) { personID = id }
        }
    }

    /// Development aid: SCROLL_OB=favorites|name|account|saving|youtube shows that step of setting up, with a few movies already picked.
    private func debugOnboarding() {
        guard let o = ProcessInfo.processInfo.environment["SCROLL_OB"] else { return }
        picks = Array(trending.prefix(4))
        name = "Emile"
        switch o {
        case "favorites": obStep = .favorites
        case "name": obStep = .name
        case "account": obStep = .account
        case "saving": obStep = .saving
        case "youtube": obStep = .youtube
        default: break
        }
    }
    #endif

    func refreshMe() async {
        do {
            let me: Me = try await api.get("/api/trailers/me")
            signedIn = me.signedIn
            profile = me.profile
            if !me.signedIn { dropSession() }
        } catch let e as APIError where e.status == 401 {
            dropSession()
        } catch {
            banner = (error as? APIError)?.message
        }
    }

    private func dropSession() {
        TokenStore.clear()
        api.token = nil
        signedIn = false
        profile = nil
    }

    // MARK: signing in

    /// Google, Discord and email sign-in all happen on the website, in a system sheet; the app gets a one-use code back.
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
            pending = nil
        } catch {
            pending = nil
            obError = (error as? APIError)?.message ?? "Signing in did not finish. Please try again."
        }
    }

    private func finishSignIn(_ url: URL) async {
        guard url.scheme == Config.callbackScheme, let pending else { return }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard let code = items.first(where: { $0.name == "code" })?.value, items.first(where: { $0.name == "state" })?.value == pending.state else {
            obError = "That sign-in did not match the one the app started. Please try again."
            return
        }
        self.pending = nil
        struct Body: Encodable { let code: String; let verifier: String; let device: String }
        struct Reply: Decodable { let token: String }
        do {
            let r: Reply = try await api.post("/api/app/token", Body(code: code, verifier: pending.verifier, device: Host.current().localizedName ?? "Mac"))
            TokenStore.save(r.token)
            api.token = r.token
            obError = ""
            await refreshMe()
            if profile != nil {
                muted = !settings.sound
                phase = .main
                await loadFeed()
            } else if signedIn, phase == .onboarding {
                // a new person: they have picked their movies and name already (or still have to)
                if obStep == .account, !picks.isEmpty, !name.trimmingCharacters(in: .whitespaces).isEmpty { await finishOnboarding() }
                else if obStep == .welcome || obStep == .account { obStep = picks.count >= 3 ? (name.isEmpty ? .name : .account) : .favorites }
            }
        } catch {
            obError = (error as? APIError)?.message ?? "Signing in did not finish. Please try again."
        }
    }

    func signOut() async {
        struct Empty: Encodable {}
        struct OK: Decodable { var ok: Bool? }
        let _: OK? = try? await api.post("/api/app/signout", Empty())
        dropSession()
        clips = []
        currentID = nil
        loadedKey = nil
        playing = false
        picks = []
        name = ""
        obStep = .welcome
        tab = .watch
        phase = .onboarding
        player.pause()
        await loadTrending()
    }

    // MARK: onboarding

    func loadTrending() async {
        if !trending.isEmpty { return }
        struct R: Decodable { let results: [Mini] }
        if let r: R = try? await api.get("/api/trailers/trending") { trending = r.results }
    }

    func search(_ q: String) async {
        struct R: Decodable { let results: [Mini] }
        let term = q.trimmingCharacters(in: .whitespaces)
        if term.count < 2 { results = nil; return }
        if let r: R = try? await api.get("/api/trailers/search", query: ["q": term]) { if !Task.isCancelled { results = r.results } }
    }

    func togglePick(_ m: Mini) {
        if let i = picks.firstIndex(where: { $0.id == m.id }) { picks.remove(at: i) } else if picks.count < 8 { picks.append(m) }
    }

    /// Makes the profile from what was chosen, then goes on.
    func finishOnboarding() async {
        obStep = .saving
        struct Body: Encodable { let op = "onboard"; let name: String; let favorites: [Mini] }
        struct R: Decodable { let profile: Profile }
        do {
            let r: R = try await api.post("/api/trailers/me", Body(name: name.trimmingCharacters(in: .whitespaces), favorites: Array(picks.prefix(8))))
            profile = r.profile
            muted = !r.profile.settings.sound
            try? await Task.sleep(for: .milliseconds(700))
            if !ytSignedIn && !UserDefaults.standard.bool(forKey: "yt.offered") {
                UserDefaults.standard.set(true, forKey: "yt.offered")
                obStep = .youtube
            } else {
                await enterMain()
            }
        } catch {
            obError = (error as? APIError)?.message ?? "Something went wrong."
            obStep = .account
        }
    }

    func enterMain() async {
        phase = .main
        await loadFeed()
    }

    // MARK: the feed

    func loadFeed() async {
        struct R: Decodable { let clips: [Clip]; let next: Int }
        guard !loadingMore else { return }
        loadingMore = true
        defer { loadingMore = false }
        do {
            let exclude = clips.suffix(200).map { String($0.id) }.joined(separator: ",")
            let r: R = try await api.get("/api/trailers/feed", query: ["cursor": String(cursor), "exclude": exclude])
            cursor = r.next
            let have = Set(clips.map(\.id))
            clips.append(contentsOf: r.clips.filter { !have.contains($0.id) })
            feedError = nil
            if currentID == nil { currentID = clips.first?.id }
        } catch {
            feedError = (error as? APIError)?.message ?? "The trailers did not load."
        }
    }

    func loadMoreIfNeeded() {
        guard let i = currentIndex, i >= clips.count - 3 else { return }
        Task { await loadFeed() }
    }

    func step(_ d: Int) {
        guard let i = currentIndex else { return }
        let n = max(0, min(clips.count - 1, i + d))
        guard n != i else { if d > 0 { loadMoreIfNeeded() }; return }
        paused = false
        withAnimation(.smooth(duration: 0.6)) { currentID = clips[n].id }
        loadMoreIfNeeded()
    }

    /// A movie chosen elsewhere (the search, a list, a person's page) plays next.
    func open(_ clip: Clip) {
        personID = nil
        showSearch = false
        tab = .watch
        if clips.firstIndex(where: { $0.id == clip.id }) == nil {
            let at = (currentIndex ?? -1) + 1
            clips.insert(clip, at: min(at, clips.count))
        }
        paused = false
        withAnimation(.smooth(duration: 0.6)) { currentID = clip.id }
    }

    func openMovie(_ id: Int) async -> Bool {
        struct R: Decodable { let clip: Clip }
        do {
            let r: R = try await api.get("/api/trailers/movie/\(id)")
            open(r.clip)
            return true
        } catch {
            toast((error as? APIError)?.message ?? "No trailer for that one.")
            return false
        }
    }

    /// A trailer YouTube will not play in an app is dropped, and the next one takes its place.
    private func skipCurrent() {
        guard let i = currentIndex else { return }
        let next = clips.indices.contains(i + 1) ? clips[i + 1].id : (i > 0 ? clips[i - 1].id : nil)
        clips.remove(at: i)
        currentID = next
        loadMoreIfNeeded()
    }

    // MARK: lists and settings

    func toggle(_ kind: String, _ clip: Clip) async {
        guard var p = profile else { return }
        let m = clip.mini
        let before = p
        if kind == "like" {
            if p.liked.contains(where: { $0.id == m.id }) { p.liked.removeAll { $0.id == m.id } } else { p.liked.insert(m, at: 0) }
        } else {
            if p.saved.contains(where: { $0.id == m.id }) { p.saved.removeAll { $0.id == m.id } } else { p.saved.insert(m, at: 0) }
        }
        profile = p
        struct Body: Encodable { let op: String; let movie: Mini }
        struct R: Decodable { var on: Bool? }
        do { let _: R = try await api.post("/api/trailers/me", Body(op: kind, movie: m)) }
        catch { profile = before; toast((error as? APIError)?.message ?? "Could not save that.") }
    }

    func patch(region: String? = nil, sound: Bool? = nil, autoNext: Bool? = nil) async {
        guard var p = profile else { return }
        if let region { p.settings.region = region }
        if let sound { p.settings.sound = sound }
        if let autoNext { p.settings.autoNext = autoNext }
        profile = p
        struct Patch: Encodable { var region: String?; var sound: Bool?; var autoNext: Bool? }
        struct Body: Encodable { let op = "settings"; let patch: Patch }
        struct R: Decodable { var profile: Profile? }
        do { let _: R = try await api.post("/api/trailers/me", Body(patch: Patch(region: region, sound: sound, autoNext: autoNext))) }
        catch { toast((error as? APIError)?.message ?? "Could not save that.") }
    }

    func rename(_ n: String) async {
        let t = n.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty, var p = profile, t != p.name else { return }
        struct Body: Encodable { let op = "name"; let name: String }
        struct R: Decodable { let profile: Profile }
        do {
            let r: R = try await api.post("/api/trailers/me", Body(name: t))
            p = r.profile
            profile = p
            toast("Saved")
        } catch { toast((error as? APIError)?.message ?? "Could not save that.") }
    }

    /// Choosing favourite movies again.
    func replay() {
        picks = profile?.favorites ?? []
        name = profile?.name ?? ""
        obStep = .favorites
        tab = .watch
        player.pause()
        phase = .onboarding
        Task { await loadTrending() }
    }

    func savePicksAgain() async {
        struct Body: Encodable { let op = "favorites"; let favorites: [Mini] }
        struct R: Decodable { let profile: Profile }
        do {
            let r: R = try await api.post("/api/trailers/me", Body(favorites: Array(picks.prefix(8))))
            profile = r.profile
            if name.trimmingCharacters(in: .whitespaces) != r.profile.name { await rename(name) }
            clips = []
            currentID = nil
            loadedKey = nil
            cursor = 0
            await enterMain()
        } catch { obError = (error as? APIError)?.message ?? "Something went wrong." }
    }

    // MARK: playback

    /// Called whenever `signature` changes: loads the trailer on screen once scrolling has settled, and plays or pauses it.
    func syncPlayer() {
        guard phase == .main, let clip = current else { return }
        let key = clip.trailer.key
        if key != loadedKey {
            playing = false
            stuck = false
            gate = false
            progress = 0
            stuckTask?.cancel()
            loadTask?.cancel()
            loadTask = Task { [weak self] in
                guard let self else { return }
                while self.scrolling, !Task.isCancelled { try? await Task.sleep(for: .milliseconds(80)) }
                try? await Task.sleep(for: .milliseconds(250)) // a quick run through several trailers loads only the last
                guard !Task.isCancelled, self.current?.trailer.key == key else { return }
                self.loadedKey = key
                if self.player.started { self.player.load(key) } else { self.player.start(videoID: key, muted: self.muted) }
                if !self.shouldPlay { self.player.pause() }
                self.watchForStall()
            }
            return
        }
        if shouldPlay { player.play(); if !playing { watchForStall() } } else { player.pause() }
        player.mute(muted)
    }

    /// If the trailer has not started a few seconds after it should have, find out why.
    private func watchForStall() {
        stuckTask?.cancel()
        stuckTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(5))
            guard let self, !Task.isCancelled, !self.playing, self.shouldPlay else { return }
            self.player.probe()
            self.stuck = true
        }
    }

    private func handle(_ e: PlayerEvent) {
        #if DEBUG
        if ProcessInfo.processInfo.environment["SCROLL_LOG"] != nil { if case .time = e {} else { FileHandle.standardError.write(Data("[player] \(e) | clip: \(current?.title ?? "-") | key: \(current?.trailer.key ?? "-")\n".utf8)) } }
        #endif
        switch e {
        case .ready:
            player.mute(muted)
        case .state(let s):
            if s == 1 {
                let first = !playing
                playing = true
                stuck = false
                gate = false
                stuckTask?.cancel()
                player.mute(muted)
                if first { wake() } // buffering or a replay does not bring the controls back
            } else if s == 0 {
                if settings.autoNext { step(1) } else { player.seekToStart(); player.play() }
            } else if s == -1 || s == 5 {
                playing = false
            }
        case .time(let c, let d):
            guard d > 0 else { return }
            let p = c / d
            if abs(p - sentTime) > 0.003 { sentTime = p; progress = p }
        case .error(let code):
            // 100: gone or private; 101 and 150: the owner does not allow it outside YouTube. Anything else is ask-the-page: is it the sign-in request?
            if [100, 101, 150].contains(code) { skipCurrent() } else { stuck = true; player.probe() }
        case .gate(let verdict, _):
            if verdict { gate = true }
            stuck = !playing
        }
    }

    func togglePause() { paused.toggle() }

    /// Starts the player again from scratch (after signing in to YouTube).
    func retryPlayer() {
        guard let key = current?.trailer.key else { return }
        stuck = false
        gate = false
        playing = false
        loadedKey = key
        player.restart(videoID: key, muted: muted)
        watchForStall()
    }

    func youTubeSignInFinished() async {
        showYouTubeSignIn = false
        ytSignedIn = await YouTubeAccount.isSignedIn()
        if phase == .onboarding, obStep == .youtube { await enterMain() }
        else if phase == .main { retryPlayer() }
    }

    // MARK: the screen's controls fade while a trailer plays

    /// Any movement, press, key or scroll brings the controls back; they fade again a moment after the last one.
    func wake() {
        idle = false
        idleTask?.cancel()
        guard phase == .main, playing, !paused, !stuck, !overlayOpen else { return }
        idleTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            guard let self, !Task.isCancelled, self.playing, !self.paused, !self.stuck, !self.overlayOpen else { return }
            self.idle = true
            NSCursor.setHiddenUntilMouseMoves(true)
        }
    }

    // MARK: small things

    func toast(_ t: String) {
        toastText = t
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2.6))
            if !Task.isCancelled { self?.toastText = nil }
        }
    }

    func share(_ clip: Clip) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(Config.shareLink(clip.id), forType: .string)
        toast("Link copied")
    }

    private static func random(_ bytes: Int) -> String {
        var b = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &b)
        return b64url(Data(b))
    }

    private static func b64url(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
