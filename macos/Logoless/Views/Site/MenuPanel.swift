import SwiftUI

/// The menu slides in from the right edge: the pages in large type, you at the bottom, on a pane of glass.
struct MenuPanel: View {
    @Environment(AppModel.self) private var app

    private struct Item: Identifiable { let id: String; let label: String; let path: String? }
    private let main: [Item] = [
        Item(id: "campaigns", label: "Campaigns", path: nil),
        Item(id: "creators", label: "For creators", path: "/for-clippers"),
        Item(id: "brands", label: "For brands", path: "/for-brands"),
        Item(id: "pricing", label: "Pricing", path: "/pricing"),
        Item(id: "about", label: "About", path: "/about"),
        Item(id: "faq", label: "That's why its called a Q&A :)", path: "/faq"),
    ]
    private let more: [(String, String)] = [("Case studies", "/case-studies"), ("Contact", "/contact"), ("Leaderboard", "/leaderboard"), ("Reels", "/reels"), ("Status", "/status")]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer().frame(height: 86)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(main) { i in
                    Button { choose(i) } label: {
                        HStack(spacing: 8) {
                            Text(i.label).font(.display(36)).foregroundStyle(Color.paper).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            if i.path == nil && app.route == .home { Text("•").font(.display(24)).foregroundStyle(Color.paper) }
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            Text("More").font(.system(size: 11)).foregroundStyle(.mute).padding(.top, 30).padding(.bottom, 10)
            SiteGrid(columns: 2, spacing: 12) {
                ForEach(more, id: \.0) { m in
                    Button { NSWorkspace.shared.open(Config.base.appendingPathComponent(m.1)); app.showMenu = false } label: { Text(m.0).font(.system(size: 15)).foregroundStyle(Color.paper.opacity(0.8)) }.buttonStyle(.plain)
                }
            }
            Spacer(minLength: 24)
            account
        }
        .padding(.horizontal, 34)
        .padding(.bottom, 26)
        .frame(width: 440)
        .frame(maxHeight: .infinity, alignment: .topLeading)
        .pane(UnevenRoundedRectangle(topLeadingRadius: 34, bottomLeadingRadius: 34, bottomTrailingRadius: 0, topTrailingRadius: 0, style: .continuous))
    }

    @ViewBuilder private var account: some View {
        if app.isSignedIn, let p = app.me?.profile {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 14) {
                    Avatar(url: app.me?.avatarURL, name: p.displayName, size: 52)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(p.displayName).font(.display(22)).foregroundStyle(Color.paper)
                        Text("@\(p.handle)").font(.system(size: 13)).foregroundStyle(.mute)
                    }
                    Spacer()
                    PaperPill("Dashboard", symbol: nil, height: 36) { app.go(.dash(.overview)) }
                }
                HStack(spacing: 8) {
                    chip("Profile") { app.go(.dash(.profile)) }
                    if app.isAdmin { chip("Owner dashboard") { app.go(.dash(.queue)) } }
                    chip("Sign out") { Task { await app.signOut() }; app.showMenu = false }
                }
            }
            .padding(18)
            .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Color.line))
        } else {
            VStack(spacing: 12) {
                PaperPill("Get started", height: 54, fullWidth: true) { Task { await app.signIn() } }
                Button { Task { await app.signIn() } } label: { Text("Log in").font(.system(size: 15)).foregroundStyle(.mute) }.buttonStyle(.plain)
            }
        }
    }

    private func chip(_ t: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(t).font(.system(size: 12.5)).foregroundStyle(Color.paper.opacity(0.85)).padding(.horizontal, 12).frame(height: 30).overlay(Capsule().strokeBorder(Color.line)).contentShape(Capsule()) }.buttonStyle(.plain)
    }

    private func choose(_ i: Item) {
        if let path = i.path { NSWorkspace.shared.open(Config.base.appendingPathComponent(path)); app.showMenu = false }
        else { app.go(.home) }
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
                            Button { Task { await app.markRead(n) }; if let u = n.url { NSWorkspace.shared.open(u) } } label: {
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
        .frame(width: 380)
        .pane(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.5), radius: 30, y: 16)
    }
}
