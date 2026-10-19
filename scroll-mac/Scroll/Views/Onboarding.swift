import SwiftUI

/// Setting up: a few movies you love, what to call you, and signing in (Google, Discord or email). Then the trailers.
struct OnboardingView: View {
    @Environment(ScrollModel.self) private var model
    @State private var typed = false

    var body: some View {
        ZStack {
            Collage()
            Group {
                switch model.obStep {
                case .welcome: Welcome(typed: $typed)
                case .favorites: Favorites(typed: $typed)
                case .name: NameStep(typed: $typed)
                case .account: AccountStep(typed: $typed)
                case .saving: Saving()
                case .youtube: YouTubeStep(typed: $typed)
                }
            }
            .id(model.obStep)
            .transition(.opacity.combined(with: .offset(y: 16)))
            Mark()
        }
        .animation(.smooth(duration: 0.55), value: model.obStep)
        .onChange(of: model.obStep) { typed = false }
    }
}

/// A slow drift of blurred posters behind everything.
private struct Collage: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        GeometryReader { g in
            let cols = 6
            let w = g.size.width / CGFloat(cols) - 20
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(w), spacing: 24), count: cols), spacing: 24) {
                ForEach(Array(model.trending.prefix(18).enumerated()), id: \.element.id) { i, m in
                    Remote(url: Config.poster(m.p, 185)).frame(width: w, height: w * 1.5).clipShape(.rect(cornerRadius: 24)).padding(.top, CGFloat((i % 3) * 36))
                }
            }
            .padding(.horizontal, 24)
            .frame(width: g.size.width, height: g.size.height, alignment: .top)
            .blur(radius: 28)
            .opacity(0.3)
            .overlay { RadialGradient(colors: [.clear, .black.opacity(0.92)], center: .center, startRadius: g.size.width * 0.15, endRadius: g.size.width * 0.7) }
            .overlay { Color.black.opacity(0.45) }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

private struct Welcome: View {
    @Environment(ScrollModel.self) private var model
    @Binding var typed: Bool
    var body: some View {
        VStack(spacing: 0) {
            TypedText(text: "Every trailer.\nOne scroll.", size: 92) { typed = true }
            Text("Tell us a few movies you love and we will line up the trailers you will want to watch next.")
                .font(.system(size: 18)).foregroundStyle(.white.opacity(0.6)).multilineTextAlignment(.center).frame(maxWidth: 480).padding(.top, 28)
                .opacity(typed ? 1 : 0)
            VStack(spacing: 20) {
                Button { model.obStep = .favorites } label: { Text("Start").font(.system(size: 17, weight: .medium)).padding(.horizontal, 28) }
                    .buttonStyle(.glassProminent).controlSize(.extraLarge)
                Button { Task { await model.signIn() } } label: { Text("I already have an account").underline(true, color: .white.opacity(0.25)) }
                    .buttonStyle(.plain).foregroundStyle(.white.opacity(0.6)).font(.system(size: 15))
                if model.signingIn { ProgressView().controlSize(.small) }
                if !model.obError.isEmpty { Text(model.obError).font(.system(size: 13.5)).foregroundStyle(.red.opacity(0.85)) }
            }
            .padding(.top, 44)
            .opacity(typed ? 1 : 0)
        }
        .foregroundStyle(Color.paper)
        .animation(.smooth(duration: 0.6), value: typed)
    }
}

private struct PosterTile: View {
    let m: Mini
    let on: Bool
    let full: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                Remote(url: Config.poster(m.p, 342))
                    .brightness(on ? -0.45 : 0)
                if on {
                    Image(systemName: "checkmark").font(.system(size: 22, weight: .bold)).foregroundStyle(.black)
                        .frame(width: 52, height: 52).glassEffect(.regular.tint(.white.opacity(0.7)), in: .circle)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .aspectRatio(2.0 / 3.0, contentMode: .fit)
            .clipShape(.rect(cornerRadius: 18))
            .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(.white.opacity(0.1)) }
        }
        .buttonStyle(.plain)
        .disabled(full && !on)
        .opacity(full && !on ? 0.35 : 1)
        .accessibilityLabel("\(m.t)\(m.y.isEmpty ? "" : " (\(m.y))")")
        .animation(.spring(duration: 0.35, bounce: 0.3), value: on)
    }
}

private struct Favorites: View {
    @Environment(ScrollModel.self) private var model
    @Binding var typed: Bool
    @State private var query = ""
    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 190), spacing: 20)]
    private let most = 8
    private let least = 3

    var body: some View {
        @Bindable var model = model
        let shown = model.results ?? model.trending
        VStack(spacing: 0) {
            TypedText(text: "What are your favourite movies?", size: 52, speed: 0.022) { typed = true }.padding(.top, 70)
            GlassField(height: 52) {
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.white.opacity(0.5))
                    TextField("Search for a movie", text: $query).textFieldStyle(.plain).font(.system(size: 17))
                    if !query.isEmpty { Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.white.opacity(0.5)) }.buttonStyle(.plain) }
                }
            }
            .frame(maxWidth: 560)
            .padding(.top, 26)
            .opacity(typed ? 1 : 0)
            .task(id: query) {
                try? await Task.sleep(for: .milliseconds(260))
                if !Task.isCancelled { await model.search(query) }
            }

            ScrollView {
                if shown.isEmpty {
                    Text(model.results != nil ? "Nothing found. Try another spelling." : "Loading the posters…").foregroundStyle(.white.opacity(0.5)).padding(.top, 70)
                } else {
                    LazyVGrid(columns: columns, spacing: 22) {
                        ForEach(shown) { m in
                            PosterTile(m: m, on: model.picks.contains { $0.id == m.id }, full: model.picks.count >= most) { model.togglePick(m) }
                        }
                    }
                    .padding(.horizontal, 56)
                    .padding(.vertical, 30)
                }
            }
            .scrollIndicators(.hidden)
            .opacity(typed ? 1 : 0)

            HStack(spacing: 18) {
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(model.picks) { m in
                            Button { model.togglePick(m) } label: {
                                Remote(url: Config.poster(m.p, 185)).frame(width: 43, height: 64).clipShape(.rect(cornerRadius: 10))
                            }
                            .buttonStyle(.plain).help("Remove \(m.t)")
                        }
                        Text(model.picks.count < least ? "Pick \(least - model.picks.count) more" : model.picks.count >= most ? "That is the most you can pick" : "\(model.picks.count) picked")
                            .font(.system(size: 14)).foregroundStyle(.white.opacity(0.5)).padding(.leading, 6)
                    }
                }
                .scrollIndicators(.hidden)
                Button("Continue") {
                    if model.signedIn && model.profile != nil { Task { await model.savePicksAgain() } } else { model.obStep = .name }
                }
                .buttonStyle(.glassProminent).controlSize(.extraLarge)
                .disabled(model.picks.count < least)
            }
            .frame(height: 70)
            .padding(.horizontal, 56)
            .padding(.bottom, 30)
            .opacity(typed ? 1 : 0)
        }
        .foregroundStyle(Color.paper)
        .animation(.smooth(duration: 0.5), value: typed)
    }
}

private struct NameStep: View {
    @Environment(ScrollModel.self) private var model
    @Binding var typed: Bool
    @FocusState private var focused: Bool
    var body: some View {
        @Bindable var model = model
        VStack(spacing: 40) {
            TypedText(text: "What should we call you?", size: 66) { typed = true; focused = true }
            VStack(spacing: 30) {
                GlassField(height: 72) {
                    TextField("Your name", text: $model.name).textFieldStyle(.plain).font(.display(30)).multilineTextAlignment(.center)
                        .focused($focused).onSubmit { advance() }
                }
                .frame(maxWidth: 480)
                .onChange(of: model.name) { _, n in if n.count > 40 { model.name = String(n.prefix(40)) } }
                HStack(spacing: 26) {
                    Button("Back") { model.obStep = .favorites }.buttonStyle(.plain).foregroundStyle(.white.opacity(0.6)).underline()
                    Button("Continue") { advance() }.buttonStyle(.glassProminent).controlSize(.extraLarge).disabled(model.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .opacity(typed ? 1 : 0)
        }
        .foregroundStyle(Color.paper)
        .animation(.smooth(duration: 0.5), value: typed)
    }

    private func advance() {
        guard !model.name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        if model.signedIn { Task { await model.finishOnboarding() } } else { model.obStep = .account }
    }
}

private struct AccountStep: View {
    @Environment(ScrollModel.self) private var model
    @Binding var typed: Bool
    var body: some View {
        VStack(spacing: 34) {
            TypedText(text: "Make it yours.", size: 66) { typed = true }
            VStack(spacing: 14) {
                Text("Choose how you want to sign in.").font(.system(size: 15)).foregroundStyle(.white.opacity(0.6))
                GlassEffectContainer(spacing: 16) {
                    VStack(spacing: 12) {
                        signInButton("Continue with Google") { BrandGlyph(name: "google", size: 19) }
                        signInButton("Continue with Discord") { BrandGlyph(name: "discord", size: 21) }
                        signInButton("Continue with email") { Image(systemName: "envelope.fill").font(.system(size: 17)) }
                    }
                }
                Group {
                    if model.signingIn { ProgressView().controlSize(.small) }
                    else { Text(model.obError.isEmpty ? " " : model.obError).font(.system(size: 13.5)).foregroundStyle(.red.opacity(0.85)) }
                }
                .frame(height: 20)
            }
            .padding(32)
            .frame(width: 440)
            .glassCard(36)
            .opacity(typed ? 1 : 0)
            Button("Back") { model.obStep = .name }.buttonStyle(.plain).foregroundStyle(.white.opacity(0.6)).underline().opacity(typed ? 1 : 0)
        }
        .foregroundStyle(Color.paper)
        .animation(.smooth(duration: 0.5), value: typed)
    }

    private func signInButton<Icon: View>(_ title: String, @ViewBuilder icon: () -> Icon) -> some View {
        Button { Task { await model.signIn() } } label: {
            HStack(spacing: 10) { icon(); Text(title) }.font(.system(size: 16, weight: .medium)).frame(maxWidth: .infinity).frame(height: 36)
        }
        .buttonStyle(.glass).controlSize(.extraLarge).disabled(model.signingIn)
    }
}

private struct Saving: View {
    @State private var spin = false
    var body: some View {
        VStack(spacing: 36) {
            ZStack {
                Circle().fill(.clear).frame(width: 150, height: 150).glassEffect(.regular, in: .circle)
                Circle().trim(from: 0, to: 0.33).stroke(Color.paper.opacity(0.9), style: StrokeStyle(lineWidth: 2.5, lineCap: .round)).frame(width: 118, height: 118)
                    .rotationEffect(.degrees(spin ? 360 : 0)).animation(.linear(duration: 1.4).repeatForever(autoreverses: false), value: spin)
            }
            Text("Lining up your trailers.").font(.display(40)).foregroundStyle(Color.paper)
        }
        .onAppear { spin = true }
    }
}

/// One last thing: YouTube is where the trailers play from, and on some networks it asks for a sign-in before it plays anything.
private struct YouTubeStep: View {
    @Environment(ScrollModel.self) private var model
    @Binding var typed: Bool
    var body: some View {
        VStack(spacing: 30) {
            TypedText(text: "One last thing.", size: 66) { typed = true }
            VStack(spacing: 20) {
                Text("Trailers play from YouTube. On some networks (a VPN, an office) YouTube asks you to sign in before it will play anything. Sign in once here and trailers just play, every time.")
                    .font(.system(size: 16.5)).lineSpacing(4).foregroundStyle(.white.opacity(0.7)).multilineTextAlignment(.center)
                Button { model.showYouTubeSignIn = true } label: { HStack(spacing: 10) { BrandGlyph(name: "youtube", size: 20); Text("Sign in to YouTube") }.font(.system(size: 16, weight: .medium)).padding(.horizontal, 18) }
                    .buttonStyle(.glassProminent).controlSize(.extraLarge)
                Button("Skip for now") { Task { await model.enterMain() } }.buttonStyle(.plain).foregroundStyle(.white.opacity(0.55)).underline()
            }
            .padding(34).frame(width: 520).glassCard(36).opacity(typed ? 1 : 0)
        }
        .foregroundStyle(Color.paper)
        .animation(.smooth(duration: 0.5), value: typed)
        .sheet(item: Binding(get: { model.activeSheet }, set: { if $0 == nil { model.closeSheets() } })) { _ in YouTubeSignInView() }
    }
}
