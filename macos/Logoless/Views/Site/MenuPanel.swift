import SwiftUI

/// The menu slides in from the right edge, as on the site: the pages in large type, the smaller pages under them, and you at the bottom.
/// Pointing at one page quiets the others. Every page opens inside the app.
struct MenuPanel: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    @State private var hover: String?

    private let main: [(String, String)] = [("Campaigns", "/"), ("For creators", "/for-creators"), ("For brands", "/for-brands"), ("Pricing", "/pricing"), ("About", "/about"), ("Q&A", "/faq")]

    private var more: [(String, String)] {
        var out: [(String, String)] = [("Case studies", "/case-studies"), ("Contact", "/contact")]
        if app.features["leaderboard"] == true { out.append(("Leaderboard", "/leaderboard")) }
        if app.features["reels"] == true { out.append(("Reels", "/reels")) }
        if app.features["status"] == true { out.append(("Status", "/status")) }
        return out
    }

    private func current(_ path: String) -> Bool {
        switch app.route {
        case .home: return path == "/"
        case .page(let p): return p == path
        default: return false
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(main.enumerated()), id: \.element.1) { n, item in
                        Button { app.goPage(item.1) } label: {
                            HStack(spacing: 12) {
                                Text(item.0).font(.display(35)).foregroundStyle(Color.paper).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                                Circle().fill(Color.paper).frame(width: 8, height: 8).scaleEffect(current(item.1) ? 1 : 0)
                            }
                            .padding(.vertical, 4)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .opacity(hover != nil && hover != item.1 ? 0.35 : 1)
                        .onHover { hover = $0 ? item.1 : (hover == item.1 ? nil : hover) }
                        .reveal(0.10 + Double(n) * 0.05, rise: 14)
                    }
                }
                .animation(Motion.quick, value: hover)

                Text("More").font(.system(size: 12)).foregroundStyle(Color.mute.opacity(0.7)).padding(.top, 28).padding(.bottom, 8).reveal(0.42, rise: 10)
                LazyVGrid(columns: [GridItem(.flexible(), alignment: .leading), GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: 0) {
                    ForEach(more, id: \.1) { item in
                        Button { app.goPage(item.1) } label: { Text(item.0).font(.system(size: 17)).foregroundStyle(Color.paper.opacity(0.8)).padding(.vertical, 6).contentShape(Rectangle()) }.buttonStyle(.plain)
                    }
                }

                Spacer(minLength: 40)
                account
            }
            .padding(.horizontal, 32)
            .padding(.top, compact ? 84 : 92)
            .padding(.bottom, 28)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: 416)
        .frame(maxHeight: .infinity, alignment: .topLeading)
        .pane(UnevenRoundedRectangle(topLeadingRadius: 34, bottomLeadingRadius: 34, bottomTrailingRadius: 0, topTrailingRadius: 0, style: .continuous), tint: Color.black.opacity(0.74))
    }

    // MARK: you

    @ViewBuilder private var account: some View {
        if app.isSignedIn, let p = app.me?.profile { signedIn(p) } else { signedOut }
    }

    private var signedOut: some View {
        VStack(spacing: 4) {
            PaperPill("Get started", height: 56, fullWidth: true) { app.showMenu = false; app.beginOnboarding() }
            Button { Task { await app.signIn() } } label: { Text("Log in").font(.system(size: 15)).foregroundStyle(.mute).padding(.vertical, 12).frame(maxWidth: .infinity).contentShape(Rectangle()) }.buttonStyle(.plain)
            legal.padding(.top, 8).frame(maxWidth: .infinity)
        }
        .padding(20)
        .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).strokeBorder(Color.line))
    }

    private func signedIn(_ p: Me.Profile) -> some View {
        let stats = app.me?.stats
        return VStack(spacing: 0) {
            BannerArt(kind: p.bannerKind, value: p.banner).frame(height: 84).clipped().overlay(LinearGradient(colors: [.clear, Color.black.opacity(0.1), Color(red: 0.043, green: 0.043, blue: 0.051)], startPoint: .top, endPoint: .bottom))
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .bottom) {
                    Avatar(url: app.me?.avatarURL, name: p.displayName, size: 68).overlay(Circle().strokeBorder(Color(red: 0.043, green: 0.043, blue: 0.051), lineWidth: 4)).offset(y: -34)
                    Spacer()
                    Button { app.go(.dash(.overview)) } label: {
                        HStack(spacing: 6) { Text("Dashboard").font(.system(size: 13, weight: .medium)); Image(systemName: "arrow.up.right").font(.system(size: 11, weight: .semibold)) }
                            .foregroundStyle(Color.black).padding(.leading, 16).padding(.trailing, 12).frame(height: 36).background(Color.paper, in: Capsule()).contentShape(Capsule())
                    }
                    .buttonStyle(.plain).padding(.bottom, 4)
                }
                .frame(height: 30)
                Text(p.displayName).font(.display(24)).foregroundStyle(Color.paper).lineLimit(1).padding(.top, 14)
                Text("@\(p.handle)").font(.system(size: 13)).foregroundStyle(.mute).padding(.top, 6)

                HStack(spacing: 0) {
                    stat("Submissions", (stats?.clips ?? 0).compact)
                    Divider().overlay(Color.white.opacity(0.07))
                    stat("Views", (stats?.views ?? 0).compact)
                    Divider().overlay(Color.white.opacity(0.07))
                    stat((stats?.brandCents ?? 0) > 0 ? "Balance" : "Earned", "$" + Int((((stats?.brandCents ?? 0) > 0 ? stats?.brandCents : stats?.earnedCents) ?? 0) / 100).formatted())
                }
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.035), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .padding(.top, 20)

                HStack(spacing: 6) {
                    chip("Profile") { app.goPage("/u/\(p.handle)") }
                    if app.isAdmin { chip("Owner") { app.goOwner() } }
                    Spacer()
                    Button { app.showMenu = false; Task { await app.signOut() } } label: { Text("Log out").font(.system(size: 13)).foregroundStyle(.mute).padding(.horizontal, 6).contentShape(Rectangle()) }.buttonStyle(.plain)
                }
                .padding(.top, 16)
                legal.padding(.top, 20)
            }
            .padding(.horizontal, 20).padding(.bottom, 20)
        }
        .background(Color(red: 0.043, green: 0.043, blue: 0.051), in: RoundedRectangle(cornerRadius: 30, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 30, style: .continuous).strokeBorder(Color.white.opacity(0.09)))
        .shadow(color: .black.opacity(0.6), radius: 30, y: 24)
    }

    private func stat(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(value).font(.display(21)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.system(size: 11)).foregroundStyle(.mute)
        }
        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16)
    }

    private func chip(_ t: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(t).font(.system(size: 13)).foregroundStyle(Color.paper.opacity(0.8)).padding(.horizontal, 14).frame(height: 32).background(Color.white.opacity(0.06), in: Capsule()).contentShape(Capsule()) }.buttonStyle(.plain)
    }

    private var legal: some View {
        HStack(spacing: 14) {
            Button("Take the tour") { app.showMenu = false; app.beginOnboarding() }
            Button("Terms") { app.goPage("/legal/terms") }
            Button("Privacy") { app.goPage("/legal/privacy") }
            Button("Payments") { app.goPage("/legal/payments") }
        }
        .buttonStyle(.plain)
        .font(.system(size: 12)).foregroundStyle(Color.mute.opacity(0.75))
    }
}

/// The bell: the latest news in a pane of glass under it, newest first.
struct BellPanel: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Notifications").font(.display(22)).foregroundStyle(Color.paper)
                Spacer()
                if app.unread > 0 { Button("Mark all as read") { Task { await app.markAllRead() } }.buttonStyle(.plain).font(.system(size: 12.5)).foregroundStyle(.mute) }
            }
            .padding(.horizontal, 20).padding(.top, 18).padding(.bottom, 12)
            Divider().overlay(Color.line)
            if app.notifications.isEmpty {
                Text("You are all caught up.").font(.system(size: 14)).foregroundStyle(.mute).frame(maxWidth: .infinity).padding(.vertical, 40)
            } else {
                SiteScroll {
                    VStack(spacing: 0) {
                        ForEach(app.notifications.prefix(8)) { n in
                            Button { Task { await app.markRead(n) }; if let u = n.url { app.goPage(u.path + (u.query.map { "?" + $0 } ?? "")) } } label: {
                                HStack(alignment: .top, spacing: 12) {
                                    Circle().fill(n.isRead ? Color.clear : Color.paper).frame(width: 7, height: 7).padding(.top, 6)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(n.title).font(.system(size: 14, weight: .medium)).foregroundStyle(Color.paper.opacity(n.isRead ? 0.6 : 1)).multilineTextAlignment(.leading)
                                        if !n.body.isEmpty { Text(n.body).font(.system(size: 12.5)).foregroundStyle(.mute).lineLimit(2).multilineTextAlignment(.leading) }
                                    }
                                    Spacer(minLength: 8)
                                    Text(n.date.relative).font(.system(size: 11)).foregroundStyle(.faint)
                                }
                                .padding(.horizontal, 20).padding(.vertical, 12).contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 380)
            }
            Divider().overlay(Color.line)
            Button { app.go(.dash(.notifications)) } label: { Text("See all").font(.system(size: 13)).foregroundStyle(Color.paper.opacity(0.8)).frame(maxWidth: .infinity).padding(.vertical, 14).contentShape(Rectangle()) }.buttonStyle(.plain)
        }
        .frame(maxWidth: 380)
        .pane(RoundedRectangle(cornerRadius: 26, style: .continuous), tint: Color.black.opacity(0.5))
        .shadow(color: .black.opacity(0.5), radius: 30, y: 16)
    }
}
