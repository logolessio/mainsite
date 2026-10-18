import SwiftUI

/// The bar that floats over every page of the site: the mark on the left; the bell, Dashboard, you and the menu on the right.
struct SiteBar: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact

    var body: some View {
        HStack(spacing: 10) {
            Button { app.go(.home) } label: {
                Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 50, height: 38).foregroundStyle(Color.paper)
            }
            .buttonStyle(.plain)
            .help("Home")
            .padding(.leading, compact ? 14 : 78)

            Spacer(minLength: 12)

            if app.isSignedIn {
                GlassCircle(symbol: "bell", dot: app.unread > 0, help: "Notifications") { withAnimation(.smooth(duration: 0.25)) { app.showBell.toggle(); app.showMenu = false } }
                PaperPill("Dashboard", height: compact ? 38 : 40) { app.go(.dash(.overview)) }
                Button { app.go(.dash(.profile)) } label: { Avatar(url: app.me?.avatarURL, name: app.me?.profile?.displayName ?? "L", size: 40) }
                    .buttonStyle(.plain)
                    .help("Your profile")
            } else if app.phase != .starting {
                GhostPill("Log in", height: 40) { Task { await app.signIn() } }
                PaperPill("Get started", busy: app.signingIn, height: 40) { Task { await app.signIn() } }
            }
            GlassCircle(symbol: app.showMenu ? "xmark" : "line.3.horizontal", help: app.showMenu ? "Close the menu" : "Menu") { withAnimation(.smooth(duration: 0.3)) { app.showMenu.toggle(); app.showBell = false } }
        }
        .padding(.trailing, compact ? 14 : 24)
        .padding(.top, compact ? 6 : 14)
        .frame(height: 70, alignment: .top)
    }
}

struct Avatar: View {
    let url: URL?
    let name: String
    var size: CGFloat = 36

    /// The ready-made looks (/api/look/...) are vector pictures; they are drawn here as the same dark gradient with the first letter.
    private var isLook: Bool { url?.path.hasPrefix("/api/look/") == true }
    private var letter: String {
        if let url, let l = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "l" })?.value, !l.isEmpty { return String(l.prefix(1)).uppercased() }
        return String(name.prefix(1)).uppercased()
    }

    var body: some View {
        ZStack {
            if let url, !isLook { RemoteImage(url: url, seed: name) }
            else {
                LinearGradient(colors: [Color(red: 0.31, green: 0.31, blue: 0.35), Color(red: 0.02, green: 0.02, blue: 0.02)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text(letter).font(.system(size: size * 0.46, weight: .semibold)).foregroundStyle(.white.opacity(0.92))
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Color.white.opacity(0.15)))
    }
}
