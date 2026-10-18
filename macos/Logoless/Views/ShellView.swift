import SwiftUI

/// The whole window: the site's black, the page for the current route, and what floats over it (the bar, the menu, the bell, the jump box).
struct ShellView: View {
    @Environment(AppModel.self) private var app

    private var key: String {
        switch app.route {
        case .home: "home"
        case .campaign(let id): "campaign-\(id)"
        case .dash(let p): "dash-\(p.rail.rawValue)"
        }
    }

    var body: some View {
        ZStack(alignment: .top) {
            SiteBackground()

            Group {
                switch app.route {
                case .home: HomeView()
                case .campaign(let id):
                    if let c = app.campaign(id) { CampaignPage(campaign: c) }
                    else if app.loadedCampaigns { missing } else { ProgressView().controlSize(.large).frame(maxWidth: .infinity, maxHeight: .infinity) }
                case .dash(let p): DashShell(page: p)
                }
            }
            .id(key)
            .transition(.opacity)

            if !app.route.isDash { SiteBar() }

            if app.showMenu || app.showBell {
                Color.black.opacity(app.showMenu ? 0.45 : 0.001).ignoresSafeArea()
                    .onTapGesture { withAnimation(.smooth(duration: 0.25)) { app.showMenu = false; app.showBell = false } }
                    .transition(.opacity)
            }
            if app.showMenu {
                MenuPanel().frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).transition(.move(edge: .trailing).combined(with: .opacity))
            }
            if app.showBell {
                BellPanel().frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(.top, 64).padding(.trailing, 24).transition(.scale(scale: 0.96, anchor: .topTrailing).combined(with: .opacity))
            }
            if app.showJump { QuickJump().transition(.opacity) }
            if app.showOnboarding { OnboardingView(start: app.onboardingStart).transition(.opacity).zIndex(10) }
        }
        .animation(.smooth(duration: 0.25), value: app.showJump)
        .background(WindowChrome())
        .task { await app.start() }
        #if DEBUG
        .task { await DebugSnapshots.run(app) }
        #endif
        .onOpenURL { url in Task { await app.finishSignIn(url) } }
        .onExitCommand {
            if app.showJump { app.showJump = false }
            else if app.showMenu || app.showBell { withAnimation(.smooth(duration: 0.25)) { app.showMenu = false; app.showBell = false } }
            else { app.back() }
        }
        .alert("logoless", isPresented: Binding(get: { app.banner != nil }, set: { if !$0 { app.banner = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(app.banner ?? "") }
        .frame(minWidth: 1000, minHeight: 660)
        .preferredColorScheme(.dark)
    }

    private var missing: some View {
        VStack(spacing: 16) {
            Text("That campaign is not open any more").font(.display(36)).foregroundStyle(Color.paper)
            PaperPill("Browse campaigns") { app.go(.home) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Lets the page run under the title bar: the window's buttons float over the black, and the window moves when dragged by it.
struct WindowChrome: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let v = NSView()
        DispatchQueue.main.async {
            guard let w = v.window else { return }
            w.titlebarAppearsTransparent = true
            w.titleVisibility = .hidden
            w.styleMask.insert(.fullSizeContentView)
            w.isMovableByWindowBackground = true
            w.backgroundColor = .black
        }
        return v
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
