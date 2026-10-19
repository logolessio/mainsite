import SwiftUI

/// The trailers: a full-screen player behind a feed of pages that scroll one trailer at a time, with Apple's liquid glass for every control.
struct MainView: View {
    @Environment(ScrollModel.self) private var model

    var body: some View {
        ZStack {
            // the trailer itself: shown once it plays, and hidden while the page is being scrolled to the next
            PlayerSurface(controller: model.player)
                .opacity(model.playing && !model.scrolling ? 1 : 0)
                .animation(.easeInOut(duration: 0.6), value: model.playing && !model.scrolling)
                .allowsHitTesting(false)
                .ignoresSafeArea()

            if model.clips.isEmpty {
                FeedPlaceholder()
            } else {
                FeedView()
            }

            if model.tab == .account { AccountView().transition(.opacity) }
            if model.tab == .settings { SettingsView().transition(.opacity) }
            if let id = model.personID, model.tab == .watch { PersonView(id: id).transition(.opacity) }

            // the logo, the bar of three places and the search button stay above every page, as on the website
            Chrome()

            if model.showSearch { SearchView().transition(.opacity) }
            if model.showWhere, let clip = model.current { WhereView(clip: clip).transition(.opacity) }

            ToastView()
        }
        .animation(.smooth(duration: 0.4), value: model.tab)
        .animation(.smooth(duration: 0.35), value: model.personID)
        .animation(.smooth(duration: 0.3), value: model.showSearch)
        .animation(.smooth(duration: 0.3), value: model.showWhere)
        .sheet(item: Binding(get: { model.activeSheet }, set: { if $0 == nil { model.closeSheets() } })) { sheet in
            switch sheet {
            case .theater: TheaterView()
            case .youtube: YouTubeSignInView()
            case .popup: PopupView()
            }
        }
    }
}

struct FeedPlaceholder: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack(spacing: 16) {
            if let e = model.feedError {
                Text("The trailers did not load.").font(.display(36))
                Text(e).foregroundStyle(.secondary)
                Button("Try again") { Task { await model.loadFeed() } }.buttonStyle(.glass).controlSize(.large)
            } else {
                ProgressView().controlSize(.large)
            }
        }
        .foregroundStyle(Color.paper)
    }
}

// MARK: the feed

/// One page for each trailer. The scroll view snaps to whole pages, like a phone's short-video feeds.
struct FeedView: View {
    @Environment(ScrollModel.self) private var model

    var body: some View {
        @Bindable var model = model
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 0) {
                ForEach(model.clips) { clip in
                    ClipPage(clip: clip)
                        .containerRelativeFrame([.horizontal, .vertical])
                        .id(clip.id)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $model.currentID)
        .onScrollPhaseChange { _, phase in model.scrolling = phase != .idle }
        .onChange(of: model.currentID) { model.loadMoreIfNeeded() }
        .ignoresSafeArea()
    }
}

/// A trailer's page: the film's picture (which gives way to the video once it plays), light to read by, and the words.
struct ClipPage: View {
    let clip: Clip
    @Environment(ScrollModel.self) private var model

    private var isCurrent: Bool { model.currentID == clip.id }
    private var showsVideo: Bool { isCurrent && model.playing && !model.scrolling }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Color.black.overlay { Remote(url: Config.backdrop(clip.backdrop)) }
                .clipped()
                .opacity(showsVideo ? 0 : 1)
                .animation(.easeInOut(duration: 0.6), value: showsVideo)

            LinearGradient(stops: [.init(color: .black.opacity(0.86), location: 0), .init(color: .black.opacity(0.4), location: 0.3), .init(color: .clear, location: 0.58)], startPoint: .bottom, endPoint: .top)
                .fadesWhileWatching(model.idle)
                .allowsHitTesting(false)
            LinearGradient(colors: [.black.opacity(0.5), .clear], startPoint: .top, endPoint: .center)
                .frame(height: 220)
                .frame(maxHeight: .infinity, alignment: .top)
                .fadesWhileWatching(model.idle)
                .allowsHitTesting(false)

            Details(clip: clip)
                .padding(.leading, 76)
                .padding(.bottom, 150)
                .frame(maxWidth: 780, alignment: .leading)
                .opacity(isCurrent && !model.scrolling ? 1 : 0)
                .animation(.smooth(duration: 0.5), value: isCurrent && !model.scrolling)
                .fadesWhileWatching(model.idle)
        }
        .contentShape(Rectangle())
        .onTapGesture { model.togglePause() }
    }
}

/// What is under the trailer: genres, facts, the title, what it is about, and the names (each opens that person's page).
struct Details: View {
    let clip: Clip
    @Environment(ScrollModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                ForEach(clip.genres, id: \.self) { g in
                    Text(g).font(.system(size: 13)).padding(.horizontal, 14).padding(.vertical, 7).glassEffect(.regular, in: .capsule)
                }
                Text(clip.facts).font(.system(size: 14)).foregroundStyle(.white.opacity(0.6))
                if clip.rating > 0 {
                    Text("★ \(String(format: "%.1f", clip.rating))").font(.system(size: 13)).padding(.horizontal, 11).padding(.vertical, 5).background(.white.opacity(0.15), in: .capsule)
                }
            }
            Text(clip.title)
                .font(.display(88))
                .minimumScaleFactor(0.45)
                .lineLimit(2)
                .shadow(color: .black.opacity(0.5), radius: 24, y: 4)
                .padding(.top, 20)
            if !clip.tagline.isEmpty {
                Text(clip.tagline).font(.display(21)).italic().foregroundStyle(.white.opacity(0.7)).padding(.top, 10)
            }
            Text(clip.overview)
                .font(.system(size: 16))
                .lineSpacing(5)
                .lineLimit(3)
                .foregroundStyle(.white.opacity(0.7))
                .frame(maxWidth: 620, alignment: .leading)
                .padding(.top, 18)
            People(clip: clip).padding(.top, 18)
        }
        .foregroundStyle(Color.paper)
    }
}

/// "Directed by … · With …" with every name a button.
struct People: View {
    let clip: Clip
    @Environment(ScrollModel.self) private var model

    private func name(_ c: Credited) -> some View {
        Button { model.personID = c.id } label: {
            Text(c.name).underline(true, color: .white.opacity(0.25)).foregroundStyle(.white.opacity(0.85))
        }
        .buttonStyle(.plain)
        .pointerStyle(.link)
    }

    var body: some View {
        if clip.director != nil || !clip.cast.isEmpty {
            HStack(spacing: 0) {
                if let d = clip.director {
                    Text("Directed by ").foregroundStyle(.white.opacity(0.5))
                    name(d)
                    if !clip.cast.isEmpty { Text("   ·   ").foregroundStyle(.white.opacity(0.4)) }
                }
                if !clip.cast.isEmpty {
                    Text("With ").foregroundStyle(.white.opacity(0.5))
                    ForEach(Array(clip.cast.prefix(4).enumerated()), id: \.element.id) { i, c in
                        if i > 0 { Text(", ").foregroundStyle(.white.opacity(0.5)) }
                        name(c)
                    }
                }
            }
            .font(.system(size: 15))
        }
    }
}

// MARK: the controls

/// Everything that floats above the film. It all fades while a trailer plays and the mouse is still.
struct Chrome: View {
    @Environment(ScrollModel.self) private var model

    var body: some View {
        ZStack {
            Mark()
            TopButtons()
            if model.tab == .watch, model.personID == nil, !model.clips.isEmpty { ActionRail() }
            FloatingNav()
            SearchPill()
            if model.tab == .watch { ProgressLine() }
            if model.stuck && model.tab == .watch && !model.paused && !model.overlayOpen { StuckNotice() }
        }
        .fadesWhileWatching(model.idle && model.tab == .watch && !model.overlayOpen && !model.stuck)
    }
}

struct Mark: View {
    var body: some View {
        VStack {
            HStack {
                Image("Mark").resizable().scaledToFit().frame(height: 46)
                Spacer()
            }
            Spacer()
        }
        .padding(.leading, 34)
        .padding(.top, 30)
        .allowsHitTesting(false)
    }
}

struct TopButtons: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        if model.tab == .watch, model.personID == nil, model.current != nil {
            VStack {
                HStack {
                    Spacer()
                    GlassEffectContainer(spacing: 14) {
                        HStack(spacing: 12) {
                            GlassIconButton(symbol: "rectangle.on.rectangle", label: "Watch the trailer in a window") { model.showTheater = true }
                            GlassIconButton(symbol: model.muted ? "speaker.slash" : "speaker.wave.2", label: model.muted ? "Turn the sound on" : "Turn the sound off") {
                                model.muted.toggle()
                                if !model.muted, !model.settings.sound { Task { await model.patch(sound: true) } }
                            }
                            GlassIconButton(symbol: model.paused ? "play" : "pause", label: model.paused ? "Play" : "Pause") { model.togglePause() }
                            GlassIconButton(symbol: "arrow.up.left.and.arrow.down.right", label: "Full screen") { NSApp.keyWindow?.toggleFullScreen(nil) }
                        }
                    }
                }
                Spacer()
            }
            .padding(.trailing, 34)
            .padding(.top, 30)
        }
    }
}

/// Like, save, share and where to watch, as four round pieces of glass that run into each other when they move.
struct ActionRail: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        if let clip = model.current {
            HStack {
                Spacer()
                GlassEffectContainer(spacing: 14) {
                    VStack(spacing: 14) {
                        GlassIconButton(symbol: "heart", label: model.isLiked(clip.id) ? "Unlike" : "Like", on: model.isLiked(clip.id), size: 60) { Task { await model.toggle("like", clip) } }
                        GlassIconButton(symbol: "bookmark", label: model.isSaved(clip.id) ? "Remove from saved" : "Save", on: model.isSaved(clip.id), size: 60) { Task { await model.toggle("save", clip) } }
                        GlassIconButton(symbol: "square.and.arrow.up", label: "Share", size: 60) { model.share(clip) }
                        GlassIconButton(symbol: "tv", label: "Where to watch", size: 60) { model.showWhere = true }
                    }
                }
            }
            .padding(.trailing, 34)
        }
    }
}

/// The three places: your account, the trailers (the big play button), and the settings. A lens of glass flows between them.
struct FloatingNav: View {
    @Environment(ScrollModel.self) private var model
    @Namespace private var lens

    private struct Item: Identifiable { let tab: ScrollModel.Tab; let symbol: String; let label: String; let width: CGFloat; var id: String { tab.rawValue } }
    private let items = [
        Item(tab: .account, symbol: "person", label: "Your account", width: 76),
        Item(tab: .watch, symbol: "play.fill", label: "Watch trailers", width: 112),
        Item(tab: .settings, symbol: "gearshape", label: "Settings", width: 76),
    ]

    var body: some View {
        VStack {
            Spacer()
            GlassEffectContainer(spacing: 10) {
                HStack(spacing: 4) {
                    ForEach(items) { item in
                        Button {
                            withAnimation(.smooth(duration: 0.5)) {
                                model.personID = nil
                                model.tab = item.tab
                            }
                        } label: {
                            Image(systemName: item.symbol)
                                .font(.system(size: item.tab == .watch ? 24 : 21, weight: .medium))
                                .foregroundStyle(Color.paper)
                                .frame(width: item.width, height: 54)
                                .contentShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .background {
                            if model.tab == item.tab {
                                Capsule().fill(.clear)
                                    .glassEffect(.regular.tint(.white.opacity(0.2)).interactive(), in: .capsule)
                                    .glassEffectID("lens", in: lens)
                            }
                        }
                        .help(item.label)
                        .accessibilityLabel(item.label)
                    }
                }
                .padding(6)
                .glassEffect(.regular, in: .capsule)
            }
        }
        .padding(.bottom, 30)
    }
}

struct SearchPill: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button { model.showSearch = true } label: {
                    HStack(spacing: 10) {
                        Text("Search").font(.system(size: 14))
                        Text("⌘K").font(.system(size: 12)).padding(.horizontal, 7).padding(.vertical, 3).background(.white.opacity(0.14), in: .rect(cornerRadius: 6))
                    }
                    .foregroundStyle(Color.paper.opacity(0.85))
                    .padding(.horizontal, 20)
                    .frame(height: 44)
                    .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .glassEffect(.regular.interactive(), in: .capsule)
            }
        }
        .padding(.trailing, 34)
        .padding(.bottom, 38)
    }
}

/// A thin line along the bottom: how far through the trailer.
struct ProgressLine: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack {
            Spacer()
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Rectangle().fill(.white.opacity(0.1))
                    Rectangle().fill(Color.paper.opacity(0.9)).frame(width: g.size.width * model.progress)
                }
            }
            .frame(height: 3)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

/// The trailer did not start. YouTube often asks for a sign-in on a VPN or a shared network; signing in once, here, fixes it for good.
struct StuckNotice: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack {
            HStack(spacing: 26) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.gate ? "YouTube wants you to sign in." : "This trailer did not start.").font(.system(size: 16, weight: .medium))
                    Text("It does this on a VPN or a shared network. Signing in once fixes it for every trailer.").font(.system(size: 13)).foregroundStyle(.white.opacity(0.6)).frame(maxWidth: 380, alignment: .leading)
                }
                HStack(spacing: 8) {
                    Button { model.showYouTubeSignIn = true } label: { HStack(spacing: 8) { BrandGlyph(name: "youtube", size: 17); Text("Sign in to YouTube") } }.buttonStyle(.glassProminent)
                    Button("Play it here") { model.showTheater = true }.buttonStyle(.glass)
                    Button("Try again") { model.retryPlayer() }.buttonStyle(.glass)
                }
                .controlSize(.large)
            }
            .foregroundStyle(Color.paper)
            .padding(.vertical, 16)
            .padding(.horizontal, 28)
            .glassEffect(.regular, in: .rect(cornerRadius: 34))
            .padding(.top, 96)
            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

struct ToastView: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack {
            Spacer()
            if let t = model.toastText {
                Text(t).font(.system(size: 14.5)).foregroundStyle(Color.paper).padding(.horizontal, 24).padding(.vertical, 12).glassEffect(.regular, in: .capsule)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.bottom, 120)
        .animation(.smooth(duration: 0.35), value: model.toastText)
        .allowsHitTesting(false)
    }
}
