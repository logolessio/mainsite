import SwiftUI

/// The first time the app opens: what logoless is, how it pays, then signing in and setting up a profile and a payout address.
/// Every step can be skipped; nothing here is needed to look around.
struct OnboardingView: View {
    @Environment(AppModel.self) private var app

    enum Step: Int, CaseIterable { case welcome, how, account, profile, payout, done }
    enum HandleState { case idle, checking, free, taken, invalid }

    @State private var step: Step
    @State private var forward = true
    @State private var name = ""
    @State private var handle = ""
    @State private var bio = ""
    @State private var tiktok = ""
    @State private var youtube = ""
    @State private var instagram = ""
    @State private var paypal = ""
    @State private var handleState = HandleState.idle
    @State private var busy = false
    @State private var error: String?
    @State private var filled = false

    init(start: Int = 0) { _step = State(initialValue: Step(rawValue: start) ?? .welcome) }

    var body: some View {
        ZStack {
            SiteBackground()
            VStack(spacing: 0) {
                HStack {
                    Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 46, height: 34).foregroundStyle(Color.paper)
                    Spacer()
                    if step != .done { Button("Skip") { app.finishOnboarding() }.buttonStyle(.plain).font(.system(size: 14)).foregroundStyle(.mute) }
                }
                .padding(.horizontal, 28).padding(.top, topInset).frame(height: 64 + topInset, alignment: .top)

                Spacer(minLength: 0)
                SiteScroll(alignment: .center) {
                    content
                        .frame(maxWidth: 560)
                        .padding(.horizontal, 28)
                        .frame(maxWidth: .infinity)
                        .id(step)
                        .transition(.asymmetric(insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity), removal: .opacity))
                }
                .scrollIndicators(.hidden)
                .scrollBounceBehavior(.basedOnSize)
                Spacer(minLength: 0)

                HStack(spacing: 8) {
                    ForEach(Step.allCases, id: \.rawValue) { s in
                        Capsule().fill(s == step ? Color.paper : Color.paper.opacity(0.22)).frame(width: s == step ? 22 : 7, height: 7)
                    }
                }
                .padding(.bottom, 30)
                .animation(.smooth(duration: 0.3), value: step)
            }
        }
        .onAppear { fill() }
    }

    #if os(macOS)
    private var topInset: CGFloat { 14 }
    #else
    private var topInset: CGFloat { 8 }
    #endif

    // MARK: steps

    @ViewBuilder private var content: some View {
        switch step {
        case .welcome: welcome
        case .how: how
        case .account: account
        case .profile: profile
        case .payout: payout
        case .done: done
        }
    }

    private var welcome: some View {
        VStack(spacing: 26) {
            Text("Your views\nhave value.").font(.display(72)).multilineTextAlignment(.center).foregroundStyle(Color.paper).lineSpacing(-6).minimumScaleFactor(0.6)
            Text("Join a campaign, post your content, and earn for every 1,000 verified views.").font(.system(size: 17)).multilineTextAlignment(.center).foregroundStyle(.mute)
            PaperPill("Get started", height: 54) { go(.how) }.padding(.top, 8)
        }
    }

    private var how: some View {
        VStack(spacing: 26) {
            heading("How it works", "Three steps, no pitching, no waiting on anyone.")
            VStack(spacing: 12) {
                row("1", "Join a campaign", "Pick an artist, streamer or brand you like and read the brief.")
                row("2", "Post your content", "Make your own edit, post it on TikTok, YouTube or Instagram, then submit the link.")
                row("3", "Get paid for the views", "You earn for every 1,000 verified views. Withdraw to PayPal from $10, and we cover the fees.")
            }
            nav(next: "Continue") { go(.account) } back: { go(.welcome) }
        }
    }

    private var account: some View {
        VStack(spacing: 26) {
            heading("Sign in or create your account", "It opens in a secure window on logoless.io. Google, Discord or email all work, and the app never sees your password.")
            if app.isSignedIn {
                Label("Signed in as \(app.me?.profile?.displayName ?? "you")", systemImage: "checkmark.circle.fill").font(.system(size: 16)).foregroundStyle(Color.good)
                nav(next: "Continue") { go(.profile) } back: { go(.how) }
            } else {
                VStack(spacing: 14) {
                    PaperPill("Continue", busy: app.signingIn, height: 54, fullWidth: true) { Task { await app.signIn(); if app.isSignedIn { fill(); go(.profile) } } }.disabled(app.signingIn)
                    Button { app.finishOnboarding() } label: { Text("Look around first").font(.system(size: 15)).foregroundStyle(.mute).underline() }.buttonStyle(.plain)
                    Button { go(.how) } label: { Text("Back").font(.system(size: 14)).foregroundStyle(.faint) }.buttonStyle(.plain).padding(.top, 4)
                }
            }
        }
    }

    private var profile: some View {
        VStack(spacing: 22) {
            heading("Make it yours", "How brands and other creators see you. You can change all of this later.")
            VStack(alignment: .leading, spacing: 14) {
                labelled("Name") { SiteField(prompt: "Your name", text: $name) }
                labelled("Username") {
                    SiteField(prompt: "yourname", text: $handle)
                        .onChange(of: handle) { _, h in Task { await check(h) } }
                    Group {
                        switch handleState {
                        case .checking: Text("Checking…").foregroundStyle(.faint)
                        case .free: Text("@\(clean(handle)) is yours.").foregroundStyle(Color.good)
                        case .taken: Text("That one is taken.").foregroundStyle(Color.bad)
                        case .invalid: Text("Use 3 to 20 letters, numbers or underscores.").foregroundStyle(Color.bad)
                        case .idle: EmptyView()
                        }
                    }
                    .font(.system(size: 12.5))
                }
                labelled("Bio") { SiteField(prompt: "A line about you", text: $bio) }
                labelled("Where you post (optional)") {
                    SiteField(prompt: "TikTok @", text: $tiktok)
                    SiteField(prompt: "YouTube @", text: $youtube)
                    SiteField(prompt: "Instagram @", text: $instagram)
                }
            }
            if let error { Text(error).font(.system(size: 13.5)).foregroundStyle(Color.bad).multilineTextAlignment(.center) }
            nav(next: "Save and continue", busy: busy, enabled: handleState != .taken && handleState != .invalid && !name.trimmingCharacters(in: .whitespaces).isEmpty) { Task { await saveProfile() } } back: { go(.account) }
        }
    }

    private var payout: some View {
        VStack(spacing: 24) {
            heading("Where should we pay you?", "Add the PayPal email your earnings go to. You can add it later from Earnings.")
            labelled("PayPal email") { SiteField(prompt: "you@example.com", text: $paypal) }
            if let error { Text(error).font(.system(size: 13.5)).foregroundStyle(Color.bad).multilineTextAlignment(.center) }
            nav(next: paypal.isEmpty ? "Skip for now" : "Save and continue", busy: busy, enabled: paypal.isEmpty || (paypal.contains("@") && paypal.contains("."))) { Task { await savePaypal() } } back: { go(.profile) }
        }
    }

    private var done: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 52)).foregroundStyle(Color.good)
            Text("You are all set").font(.display(56)).foregroundStyle(Color.paper).multilineTextAlignment(.center)
            Text(app.isSignedIn ? "Find a campaign you like, make something, and submit the link." : "Look around. When you are ready to submit content or get paid, sign in from the top right.").font(.system(size: 17)).foregroundStyle(.mute).multilineTextAlignment(.center)
            PaperPill("Browse campaigns", height: 54) { app.finishOnboarding() }.padding(.top, 6)
        }
    }

    // MARK: pieces

    private func heading(_ title: String, _ sub: String) -> some View {
        VStack(spacing: 12) {
            Text(title).font(.display(46)).foregroundStyle(Color.paper).multilineTextAlignment(.center).minimumScaleFactor(0.6)
            Text(sub).font(.system(size: 16)).foregroundStyle(.mute).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
    }

    private func row(_ n: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Text(n).font(.display(22)).foregroundStyle(Color.black).frame(width: 38, height: 38).background(Color.paper, in: Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.display(24)).foregroundStyle(Color.paper)
                Text(text).font(.system(size: 14.5)).foregroundStyle(.mute).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(18)
        .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).strokeBorder(Color.line))
    }

    private func labelled<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) { Eyebrow(title); content() }
    }

    private func nav(next: String, busy: Bool = false, enabled: Bool = true, _ action: @escaping () -> Void, back: @escaping () -> Void) -> some View {
        VStack(spacing: 14) {
            PaperPill(next, busy: busy, height: 54, fullWidth: true, action: action).disabled(!enabled || busy)
            Button(action: back) { Text("Back").font(.system(size: 14)).foregroundStyle(.faint) }.buttonStyle(.plain)
        }
        .padding(.top, 6)
    }

    // MARK: actions

    private func go(_ s: Step) {
        error = nil
        forward = s.rawValue >= step.rawValue
        withAnimation(.smooth(duration: 0.4)) { step = s }
    }

    private func fill() {
        guard !filled, let p = app.me?.profile else { return }
        name = p.displayName; handle = p.handle; bio = p.bio; filled = true
        handleState = .free
    }

    private func clean(_ h: String) -> String { h.trimmingCharacters(in: .whitespaces).lowercased().replacingOccurrences(of: "@", with: "") }

    private func check(_ raw: String) async {
        let h = clean(raw)
        if h == app.me?.profile?.handle { handleState = .free; return }
        guard h.range(of: "^[a-z0-9_]{3,20}$", options: .regularExpression) != nil else { handleState = h.isEmpty ? .idle : .invalid; return }
        handleState = .checking
        try? await Task.sleep(for: .milliseconds(350))
        guard h == clean(handle) else { return } // typed on since
        if let ok = await app.handleAvailable(h) { handleState = ok ? .free : .taken } else { handleState = .idle }
    }

    private func saveProfile() async {
        busy = true; error = nil
        defer { busy = false }
        var linked: [String: String] = [:]
        for (k, v) in [("tiktok", tiktok), ("youtube", youtube), ("instagram", instagram)] {
            let t = v.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "@", with: "")
            if !t.isEmpty { linked[k] = t }
        }
        do {
            try await app.completeProfile(name: name.trimmingCharacters(in: .whitespaces), handle: clean(handle), bio: bio, linked: linked)
            go(.payout)
        } catch { self.error = (error as? APIError)?.message ?? "Something went wrong. Please try again." }
    }

    private func savePaypal() async {
        if paypal.trimmingCharacters(in: .whitespaces).isEmpty { go(.done); return }
        busy = true; error = nil
        defer { busy = false }
        do { try await app.addPaypal(paypal.trimmingCharacters(in: .whitespaces).lowercased()); go(.done) }
        catch { self.error = (error as? APIError)?.message ?? "Something went wrong. Please try again." }
    }
}
