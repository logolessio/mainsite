import SwiftUI
import UniformTypeIdentifiers

/// The site's onboarding (components/onboarding/onboarding-flow.tsx), step for step, drawn natively: a line typed out in large type, then the
/// answer under it. The app opens straight into it the first time. Signing in is one card that opens the website's own sign-in window (Google,
/// Discord or email), where the site's email and password steps happen.
struct OnboardingView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    @Environment(\.accessibilityReduceMotion) private var reduce

    enum Id: Int, CaseIterable { case welcome, role, method, code, paypal, name, handle, pictures, accounts, happy, saving, verify, hello, tour, done }
    enum Role: String { case clipper, brand }

    private struct OBData {
        var role: Role?
        var paypal = ""
        var name = ""
        var handle = ""
        var avatarKey: String?
        var avatarImage: PlatformImage?
        var bannerKey: String?
        var bannerImage: PlatformImage?
        var lookId = ""
        var linked: [String: String] = [:]
    }

    private static let settle = 5.2

    @State private var id: Id
    @State private var trail: [Id] = []
    @State private var ready = Snap.flat
    @State private var busy = false
    @State private var error = ""
    @State private var text = ""
    @State private var verdict: (st: OBState, msg: String) = (.idle, "")
    @State private var forced: (st: OBState, msg: String)?
    @State private var judging: Task<Void, Never>?
    @State private var data = OBData()
    @State private var signedIn = false
    @State private var verifyMode = false
    @State private var sentTo = ""
    @State private var uploading: String?
    @State private var picking: String?
    @State private var tick = 0
    @State private var copied = false
    @State private var importing = false

    init(start: Int = 0) { _id = State(initialValue: Id(rawValue: start) ?? .welcome) }

    private var brand: Bool { data.role == .brand }
    private var first: String { data.name.trimmingCharacters(in: .whitespaces).split(separator: " ").first.map(String.init) ?? "there" }
    private var canBack: Bool { !trail.isEmpty && !(signedIn && [.role, .method, .code].contains(trail.last!)) }
    private var progress: Double { Double(max(0, id.rawValue)) / Double(Id.allCases.count - 1) }

    // MARK: layout

    var body: some View {
        GeometryReader { geo in
            let size = min(58, max(32, geo.size.width * 0.054))
            ZStack {
                SiteBackground()
                if id == .saving && app.liquidLoader && !reduce { LiquidFill(seconds: Self.settle).transition(.opacity) }

                SiteScroll(alignment: .top) {
                    VStack(spacing: 0) {
                        content(size: size, width: geo.size.width)
                            .id(id)
                            .transition(.opacity)
                        if !error.isEmpty && ![.pictures, .method].contains(id) && !isTextStep { Text(error).font(.system(size: 14)).foregroundStyle(redSignal).padding(.top, 24).multilineTextAlignment(.center) }
                    }
                    .frame(maxWidth: 672)
                    .padding(.horizontal, 24)
                    .padding(.top, geo.size.height * 0.2)
                    .padding(.bottom, 112)
                    .frame(maxWidth: .infinity)
                    .compositingGroup()
                    .blendMode(id == .saving && app.liquidLoader && !reduce ? .difference : .normal)
                }
                .scrollIndicators(.hidden)
                .animation(.easeInOut(duration: 0.16), value: id)

                // the thin line along the top
                VStack(spacing: 0) {
                    Rectangle().fill(Color.paper).frame(width: geo.size.width * progress, height: 2).frame(maxWidth: .infinity, alignment: .leading).animation(.easeOut(duration: 0.7), value: id)
                    Spacer()
                }
                .ignoresSafeArea()
                .allowsHitTesting(false)

                if canBack && ![.saving, .verify, .hello, .tour, .done, .happy].contains(id) {
                    VStack { Spacer(); Button { back() } label: { Text("Back").font(.system(size: 15)).foregroundStyle(.mute).padding(12).contentShape(Rectangle()) }.buttonStyle(.plain).padding(.bottom, 12) }
                }
                if id != .saving {
                    VStack { HStack { Spacer(); Button { app.finishOnboarding() } label: { Text("Skip").font(.system(size: 14)).foregroundStyle(.mute).padding(.horizontal, 12).frame(height: 38).contentShape(Rectangle()) }.buttonStyle(.plain).padding(.trailing, 14).padding(.top, topInset) }; Spacer() }
                }
            }
        }
        .onAppear { setup() }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.image]) { result in
            guard let kind = picking, case .success(let url) = result else { return }
            Task { await pick(kind, url) }
        }
    }

    #if os(macOS)
    private var topInset: CGFloat { 14 }
    #else
    private var topInset: CGFloat { 8 }
    #endif

    private var isTextStep: Bool { [.code, .paypal, .name, .handle].contains(id) }

    // MARK: the line and the hint for each step

    private var line: String {
        switch id {
        case .welcome: "Welcome to Logoless."
        case .role: "Are you a creator or a brand?"
        case .method: "How would you like to sign in?"
        case .code: "Check your email."
        case .paypal: "What is your PayPal email?"
        case .name: brand ? "What is your name or brand called?" : "What should we call you?"
        case .handle: "Pick a username."
        case .pictures: "Make it yours."
        case .accounts: "Where do you post?"
        case .happy: "Are you happy with how it looks?"
        case .saving: "Setting things up."
        case .verify: "Prove they are yours."
        case .hello: "Welcome, \(first)."
        case .tour: "Let us show you around."
        case .done: "You are all set."
        }
    }

    private var hint: String {
        switch id {
        case .code: "We sent a 6 digit code to \(sentTo.isEmpty ? "your email" : sentTo)."
        case .paypal: "That is where your earnings go. You can change it later."
        case .handle: "This is your address on logoless. Letters, numbers and underscores."
        case .pictures: "Pick a ready-made look, or tap the circle and the wide part to upload your own. You can change it any time."
        case .accounts: "Add the accounts you post from, so we can match your submissions to you. Skip it if you like: it is in your dashboard when you are ready."
        case .verify: "Put a short code in each bio and we confirm the account is yours. Submissions from verified accounts are checked automatically."
        case .saving: "This only takes a moment."
        case .hello: "Your profile page is ready."
        default: ""
        }
    }

    // MARK: steps

    @ViewBuilder private func content(size: CGFloat, width: CGFloat) -> some View {
        if id == .saving {
            SettleOrb(line: line, note: ["Creating your profile", "Setting up your page", "Lining up your dashboard", "Nearly there"][min(tick, 3)], seconds: Self.settle, size: min(width * 0.78, 400))
                .task {
                    tick = 0
                    while !Task.isCancelled && tick < 3 { try? await Task.sleep(for: .seconds(1.5)); tick += 1 }
                }
        } else {
            VStack(spacing: 0) {
                TypedLine(text: line, size: size, onReady: { withAnimation(.easeOut(duration: 0.5)) { ready = true } }, onDone: { if id == .welcome { Task { try? await Task.sleep(for: .milliseconds(500)); advanceFromWelcome() } } })
                Text(hint).font(.system(size: 16)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: 24).padding(.top, 12).opacity(ready && !hint.isEmpty ? 1 : 0).animation(.easeOut(duration: 0.5), value: ready)
                VStack(spacing: 0) { controls(width: width) }
                    .padding(.top, 32)
                    .frame(maxWidth: .infinity)
                    .opacity(ready ? 1 : 0)
                    .allowsHitTesting(ready)
            }
        }
    }

    @ViewBuilder private func controls(width: CGFloat) -> some View {
        switch id {
        case .welcome: EmptyView()

        case .role:
            SplitChoice(options: [("Creator", "Cut content and get paid for every view", { choose(.clipper) }), ("Brand", "Launch a campaign and reach creators", { choose(.brand) })])

        case .method:
            VStack(spacing: 0) {
                OBMethodCard(title: "Log in with logoless", sub: "Opens a secure window. Google, Discord or email.", busy: busy) { Task { await signIn() } }
                if !error.isEmpty { Text(error).font(.system(size: 14)).foregroundStyle(redSignal).padding(.top, 20) }
                HStack(spacing: 4) {
                    Text("Already have an account?").foregroundStyle(.mute)
                    Button { Task { await signIn() } } label: { Text("Log in").foregroundStyle(Color.paper).underline() }.buttonStyle(.plain)
                }
                .font(.system(size: 15)).padding(.top, 32)
                (Text("By continuing you agree to the ") + Text("Terms").underline() + Text(" and ") + Text("Privacy Policy").underline() + Text(", and confirm you are 16 or older."))
                    .font(.system(size: 12)).foregroundStyle(Color.mute.opacity(0.8)).multilineTextAlignment(.center).frame(maxWidth: 384).padding(.top, 12)
                    .onTapGesture { app.finishOnboarding(); app.goPage("/legal/terms") }
            }

        case .code, .paypal, .name, .handle:
            VStack(spacing: 28) {
                AnswerField(text: $text, st: id == .name ? .idle : (forced?.st ?? (id == .code ? .idle : verdict.st)), msg: id == .name ? "" : (forced?.msg ?? (id == .code ? "" : verdict.msg)), placeholder: placeholder, prefix: id == .handle ? "@" : nil, numeric: id == .code, maxLength: id == .code ? 6 : id == .handle ? 20 : 80, onSubmit: { Task { await submitText() } })
                    .id(id)
                    .onChange(of: text) { _, v in textChanged(v) }
                VStack(spacing: 16) {
                    if id != .code { OBPrimary("Continue", busy: busy) { Task { await submitText() } }.disabled(busy || !canContinue) }
                    if id == .paypal { OBQuiet("Add it later") { go(.name) } }
                    if id == .code {
                        OBQuiet("Send it again") { Task { await resendCode() } }
                        OBQuiet("Do this later") { go(afterAuth(data.role)) }
                    }
                }
            }

        case .pictures:
            VStack(spacing: 24) {
                ProfilePill(name: data.name, handle: data.handle, look: look, avatar: data.avatarImage, banner: data.bannerImage, editable: true, busy: uploading, onAvatar: { picking = "avatar"; importing = true }, onBanner: { picking = "banner"; importing = true })
                LookPicker(value: data.lookId) { data.lookId = $0 }
                if !error.isEmpty { Text(error).font(.system(size: 14)).foregroundStyle(redSignal) }
                OBPrimary("Continue") { go(brand ? .happy : .accounts) }.disabled(uploading != nil).padding(.top, 8)
            }

        case .accounts:
            VStack(spacing: 32) {
                VStack(spacing: 12) {
                    ForEach([("tiktok", "TikTok", "@username"), ("youtube", "YouTube", "@channel"), ("instagram", "Instagram", "@username")], id: \.0) { k, label, ph in
                        HStack(spacing: 12) {
                            PlatformMark(platform: k, size: 20).foregroundStyle(.mute)
                            TextField("", text: Binding(get: { data.linked[k] ?? "" }, set: { data.linked[k] = String($0.filter { !$0.isWhitespace }.prefix(60)) }), prompt: Text(ph).foregroundStyle(Color.mute.opacity(0.6)))
                                .textFieldStyle(.plain).font(.system(size: 16)).foregroundStyle(Color.paper).autocorrectionDisabled()
                                #if os(iOS)
                                .textInputAutocapitalization(.never)
                                #endif
                                .accessibilityLabel(label)
                        }
                        .padding(.horizontal, 20).frame(height: 56).overlay(Capsule().strokeBorder(Color.white.opacity(0.22)))
                    }
                }
                .frame(maxWidth: 384)
                OBPrimary(data.linked.values.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty } ? "Continue" : "Skip for now") { go(.happy) }
            }

        case .happy:
            VStack(spacing: 0) {
                ProfilePill(name: data.name, handle: data.handle, look: look, avatar: data.avatarImage, banner: data.bannerImage)
                Text(data.name).font(.display(24)).foregroundStyle(Color.paper).padding(.top, 20)
                Text("@\(data.handle)").font(.system(size: 15)).foregroundStyle(.mute).padding(.top, 6)
                SplitChoice(options: [("Yes", "Looks good to me", { Task { await save() } }), ("Not yet", "Let me change something", { back() })]).padding(.top, 32)
            }

        case .verify:
            VerifyAccounts(linked: data.linked) { go(.hello) }

        case .hello:
            VStack(spacing: 0) {
                Text("This is where people find you").font(.system(size: 15)).foregroundStyle(.mute)
                HStack(spacing: 8) {
                    Text("logoless.io/@\(data.handle.isEmpty ? "you" : data.handle)").font(.system(size: 17, design: .monospaced)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.6)
                    Button { Platform.copy("https://logoless.io/@\(data.handle)"); copied = true; Task { try? await Task.sleep(for: .seconds(1.8)); copied = false } } label: { Image(systemName: copied ? "checkmark" : "doc.on.doc").font(.system(size: 14)).foregroundStyle(copied ? emerald : Color.mute).frame(width: 40, height: 40).contentShape(Circle()) }.buttonStyle(.plain).help("Copy the address")
                }
                .padding(.leading, 24).padding(.trailing, 8).padding(.vertical, 8).overlay(Capsule().strokeBorder(Color.white.opacity(0.22))).padding(.top, 16)
                Text("It is public, so you can share it anywhere. You can also open it from your dashboard and the menu.").font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 384).padding(.top, 16)
                VStack(spacing: 16) { OBPrimary("Show me around") { go(.tour) }; OBQuiet("Skip the tour") { go(.done) } }.padding(.top, 32)
            }

        case .tour:
            MiniDash(items: tour) { go(.done) }

        case .done:
            VStack(spacing: 32) {
                Text(brand ? "Your dashboard has a short guide for the rest: adding funds and making your first campaign." : "Your dashboard has a short guide for the rest: linking your accounts, connecting Discord and sending your first submission.")
                    .font(.system(size: 16)).foregroundStyle(.mute).lineSpacing(4).multilineTextAlignment(.center).frame(maxWidth: 384)
                OBPrimary("Go to your dashboard") { finish() }
            }

        case .saving: EmptyView()
        }
    }

    private var tour: [(symbol: String, label: String, text: String)] {
        brand ? [
            ("square.grid.2x2", "Overview", "How your campaigns are doing, and the next thing to do to get set up."),
            ("megaphone", "Campaigns", "Launch a campaign with a brief, a rate and a budget cap. Pause it or change its budget any time."),
            ("film.stack", "Submissions", "Everything made for your campaigns, with its views and its status."),
            ("banknote", "Balance", "Add funds once. Every campaign draws from the same balance as creators earn."),
            ("gearshape", "Settings", "Notifications, Discord, your password and your account."),
        ] : [
            ("square.grid.2x2", "Overview", "Your balance, how your submissions are going, and the next thing to do to get set up."),
            ("film.stack", "Submissions", "Paste the link to something you posted. We take a first look right away, and a person checks anything unclear."),
            ("dollarsign.circle", "Earnings", "Approved views are counted here. Withdraw to your PayPal once you reach the minimum."),
            ("person.crop.circle", "Profile", "Your public page: your look, a bio, and the accounts you post from."),
            ("gearshape", "Settings", "Notifications, Discord, your password and your account."),
        ]
    }

    private var look: Look { Looks.byID(data.lookId) ?? Looks.forSeed(data.handle.isEmpty ? (data.name.isEmpty ? "x" : data.name) : data.handle) }

    private var placeholder: String {
        switch id { case .code: "000000"; case .paypal: "you@example.com"; case .name: brand ? "Your name or brand" : "Your name"; default: "username" }
    }

    // MARK: moving about

    private func setup() {
        signedIn = app.isSignedIn
        if let r = app.onboardingRole, let role = Role(rawValue: r == "creator" ? "clipper" : r) { data.role = role }
        if app.isSignedIn, let n = app.me?.profile?.displayName, data.name.isEmpty { data.name = n }
    }

    private func go(_ next: Id, initial: String = "") {
        Platform.tap(.step)
        if id != .welcome { trail.append(id) }
        ready = false; error = ""; forced = nil; text = initial; verdict = (.idle, ""); judging?.cancel()
        withAnimation(.easeInOut(duration: 0.16)) { id = next }
    }

    private func back() {
        guard let prev = trail.last, canBack else { return }
        trail.removeLast()
        ready = false; error = ""; forced = nil; text = ""; verdict = (.idle, "")
        withAnimation(.easeInOut(duration: 0.16)) { id = prev }
    }

    private func afterAuth(_ role: Role?) -> Id { role == .brand ? .name : .paypal }

    private func advanceFromWelcome() {
        guard id == .welcome else { return }
        if data.role != nil { signedIn ? enterAfterAuth(data.role) : go(.method) } else { go(.role) }
    }

    private func choose(_ role: Role) {
        data.role = role
        if signedIn { enterAfterAuth(role) } else { go(.method) }
    }

    /// Everyone proves their account with a code, except people whose sign-in already did (Discord, email sign-ups).
    private func enterAfterAuth(_ role: Role?) {
        Task {
            struct V: Decodable { let verified: Bool }
            let v: V? = try? await app.api.get("/api/me/verify")
            if let v, !v.verified {
                verifyMode = true
                await sendCode()
                go(.code)
            } else { go(afterAuth(role)) }
        }
    }

    private func sendCode() async {
        struct B: Encodable { let action = "send" }
        struct R: Decodable { var sentTo: String? }
        do { let r: R = try await app.api.post("/api/me/verify", B()); sentTo = r.sentTo ?? "" }
        catch { forced = (.bad, (error as? APIError)?.message ?? "We could not send the code.") }
    }

    private func resendCode() async {
        await sendCode()
        if forced == nil { forced = (.ok, "We sent a new code") }
        try? await Task.sleep(for: .seconds(2.5))
        if forced?.st == .ok { forced = nil }
    }

    private func signIn() async {
        busy = true; error = ""
        defer { busy = false }
        await app.signIn()
        guard app.isSignedIn else { if let b = app.banner { error = b; app.banner = nil }; return }
        signedIn = true
        if data.name.isEmpty, let n = app.me?.profile?.displayName { data.name = n }
        // an account that has been through the flow already (on this or another device) does not run it again
        if await app.onboardingDone() { app.finishOnboarding(); return }
        enterAfterAuth(data.role)
    }

    private func finish() {
        let target: Route = brand ? .page("/brand") : .dash(.overview)
        app.finishOnboarding()
        app.go(target)
    }

    // MARK: text steps

    private static let emailRE = try! NSRegularExpression(pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$")
    private static let handleRE = try! NSRegularExpression(pattern: "^[a-z0-9_]{3,20}$")
    private func matches(_ re: NSRegularExpression, _ s: String) -> Bool { re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil }

    private var canContinue: Bool { id == .name ? text.trimmingCharacters(in: .whitespaces).count >= 2 : (forced?.st ?? verdict.st) == .ok }

    private func textChanged(_ v: String) {
        error = ""; forced = nil
        if id == .code {
            if v.count == 6 && !busy { Task { await submitText() } }
            return
        }
        guard id == .paypal || id == .handle else { return }
        judging?.cancel()
        let value = v.trimmingCharacters(in: .whitespaces)
        if value.isEmpty { verdict = (.idle, ""); return }
        verdict = (.checking, "")
        let step = id
        judging = Task {
            try? await Task.sleep(for: .milliseconds(380))
            if Task.isCancelled { return }
            let started = Date()
            let out = await judge(step, value)
            let left = 0.52 - Date().timeIntervalSince(started)
            if left > 0 { try? await Task.sleep(for: .seconds(left)) }
            if Task.isCancelled || id != step { return }
            verdict = out
        }
    }

    private func judge(_ step: Id, _ v: String) async -> (OBState, String) {
        if step == .paypal { return matches(Self.emailRE, v) ? (.ok, "Earnings will be sent here") : (.bad, "That does not look like a PayPal email") }
        let h = v.lowercased()
        if !matches(Self.handleRE, h) { return (.bad, "Use 3 to 20 letters, numbers or underscores") }
        if h == app.me?.profile?.handle { return (.ok, "@\(h) is yours") }
        let free = await app.handleAvailable(h) ?? true
        return free ? (.ok, "@\(h) is yours") : (.bad, "Already taken")
    }

    private func submitText() async {
        let v = text.trimmingCharacters(in: .whitespaces)
        error = ""
        switch id {
        case .code:
            guard v.count == 6 else { return }
            busy = true; forced = (.checking, "")
            struct B: Encodable { let action = "check"; let code: String }
            struct R: Decodable { let verified: Bool }
            let ok = (try? await app.api.post("/api/me/verify", B(code: v)) as R)?.verified == true
            busy = false
            if !ok { forced = (.bad, "That code is not right. Check the 6 digits in your email."); return }
            forced = (.ok, "Verified")
            try? await Task.sleep(for: .milliseconds(800))
            go(afterAuth(data.role))
        case .paypal:
            guard verdict.st == .ok else { return }
            busy = true
            do { try await app.addPaypal(v.lowercased()); data.paypal = v; busy = false; go(.name) }
            catch { busy = false; forced = (.bad, "We could not save that. Try again, or add it later in Settings.") }
        case .name:
            guard canContinue else { return }
            data.name = v
            go(.handle, initial: String(v.lowercased().filter { $0.isLetter && $0.isASCII || $0.isNumber || $0 == "_" }.prefix(20)))
        case .handle:
            guard verdict.st == .ok else { return }
            data.handle = v.lowercased()
            if data.lookId.isEmpty { data.lookId = Looks.forSeed(data.handle).id }
            go(.pictures)
        default: break
        }
    }

    // MARK: pictures

    private func pick(_ kind: String, _ url: URL) async {
        error = ""
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let raw = try? Data(contentsOf: url), raw.count < 12 * 1024 * 1024 else { error = "That picture is too large. Pick one under 12 MB."; return }
        let (w, h) = kind == "avatar" ? (512, 512) : (1600, 900)
        guard let jpeg = ImagePrep.jpeg(from: raw, width: w, height: h) else { error = "That file is not a picture we can read."; return }
        uploading = kind
        defer { uploading = nil }
        struct B: Encodable { let kind: String; let data: String }
        struct R: Decodable { let id: String }
        do {
            let r: R = try await app.api.post("/api/me/upload", B(kind: kind, data: jpeg.base64EncodedString()))
            let preview = PlatformImage(data: jpeg)
            if kind == "avatar" { data.avatarKey = r.id; data.avatarImage = preview } else { data.bannerKey = r.id; data.bannerImage = preview }
        } catch { self.error = (error as? APIError)?.message ?? "Could not upload that picture." }
    }

    // MARK: saving

    /// Saving always takes at least five seconds, with a little commentary, so it feels like something is being made for you.
    private func save() async {
        go(.saving)
        struct B: Encodable { let role: String; let name: String; let handle: String; let avatarKey: String?; let company: String?; let linked: [String: String] }
        struct Banner: Encodable { let bannerKind: String; let banner: String }
        struct R: Decodable {}
        let linked = data.linked.filter { !$0.value.trimmingCharacters(in: .whitespaces).isEmpty }
        let work: Task<String?, Never> = Task {
            do {
                let _: API.OK = try await app.api.post("/api/me/onboarding", B(role: (data.role ?? .clipper).rawValue, name: data.name, handle: data.handle, avatarKey: data.avatarKey ?? (data.lookId.isEmpty ? nil : Looks.key(data.lookId)), company: brand ? data.name : nil, linked: linked))
                if let k = data.bannerKey { let _: R? = try? await app.api.put("/api/me/profile", Banner(bannerKind: "image", banner: k)) }
                else if !data.lookId.isEmpty { let _: R? = try? await app.api.put("/api/me/profile", Banner(bannerKind: "preset", banner: data.lookId)) }
                return nil
            } catch { return (error as? APIError)?.message ?? "We could not save your profile. Please try again." }
        }
        async let wait: Void = { try? await Task.sleep(for: .seconds(Self.settle)) }()
        let failed = await work.value
        _ = await wait
        await app.refreshMe()
        if let failed {
            if !trail.isEmpty { trail.removeLast() }
            ready = false; error = failed
            withAnimation { id = .happy }
            return
        }
        ready = false
        let verifiable = !brand && ["tiktok", "youtube", "instagram"].contains { !(data.linked[$0] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
        withAnimation(.easeInOut(duration: 0.16)) { id = verifiable ? .verify : .hello }
    }
}
