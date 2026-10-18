import SwiftUI

/// The dashboard: on a wide window the website's own rail on the left (the only place the app has one); on a phone a bar at the bottom.
struct DashShell: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    let page: DashPage

    var body: some View {
        if compact {
            VStack(spacing: 0) {
                CompactHeader()
                pageBody
            }
            .safeAreaInset(edge: .bottom, spacing: 0) { DashTabBar(page: page) }
        } else {
            HStack(spacing: 0) {
                Rail(page: page).frame(width: 250)
                Rectangle().fill(Color.line).frame(width: 1).ignoresSafeArea()
                VStack(spacing: 0) {
                    DashHeader(page: page)
                    pageBody
                }
            }
        }
    }

    @ViewBuilder private var pageBody: some View {
        if !app.isSignedIn { SignInPrompt() }
        else {
            switch page {
            case .overview: OverviewPage()
            case .submissions: SubmissionsPage()
            case .earnings: EarningsPage()
            case .profile: ProfilePage()
            case .achievements: AchievementsPage()
            case .saved: SavedPage()
            case .settings: SettingsPage()
            case .notifications: NotificationsPage()
            case .queue: QueuePage()
            }
        }
    }
}

/// On a phone: the mark on the left; search, find a campaign and the bell on the right.
private struct CompactHeader: View {
    @Environment(AppModel.self) private var app
    var body: some View {
        HStack(spacing: 10) {
            Button { app.go(.home) } label: { Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 46, height: 34).foregroundStyle(Color.paper) }.buttonStyle(.plain)
            Spacer()
            GlassCircle(symbol: "magnifyingglass", size: 40, help: "Search") { app.showJump = true }
            Button { app.go(.home) } label: { Image(systemName: "plus").font(.system(size: 16, weight: .semibold)).foregroundStyle(.black).frame(width: 40, height: 40).contentShape(Circle()) }
                .buttonStyle(.plain).pane(Circle(), tint: Color.paper.opacity(0.95), interactive: true).help("Find a campaign")
            GlassCircle(symbol: "bell", size: 40, dot: app.unread > 0, help: "Notifications") { app.go(.dash(.notifications)) }
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .overlay(alignment: .bottom) { Rectangle().fill(Color.line).frame(height: 1) }
    }
}

/// On a phone: the site's bottom bar, on Liquid Glass.
private struct DashTabBar: View {
    @Environment(AppModel.self) private var app
    let page: DashPage
    @State private var more = false

    private let items: [DashPage] = [.overview, .submissions, .earnings, .profile]

    var body: some View {
        HStack(spacing: 2) {
            ForEach(items) { i in tab(i.title, i.symbol, on: i == page.rail) { app.go(.dash(i)) } }
            tab("More", "ellipsis", on: [.settings, .queue].contains(page.rail)) { more = true }
        }
        .padding(6)
        .pane(Capsule())
        .padding(.horizontal, 14).padding(.bottom, 4)
        .sheet(isPresented: $more) { MoreSheet(page: page) }
    }

    private func tab(_ title: String, _ symbol: String, on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: symbol).font(.system(size: 17))
                Text(title).font(.system(size: 10, weight: .medium)).lineLimit(1).minimumScaleFactor(0.8)
            }
            .foregroundStyle(on ? Color.black : Color.paper.opacity(0.65))
            .frame(maxWidth: .infinity).frame(height: 50)
            .background(on ? Color.paper : .clear, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

/// The rest of the dashboard on a phone.
private struct MoreSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let page: DashPage

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("More").font(.display(32)).foregroundStyle(Color.paper).padding(.bottom, 10)
            row("Settings", "gearshape") { app.go(.dash(.settings)) }
            row("Notifications", "bell") { app.go(.dash(.notifications)) }
            row("Saved", "heart") { app.go(.dash(.saved)) }
            row("Achievements", "rosette") { app.go(.dash(.achievements)) }
            if app.isAdmin { row("Owner queue", "checklist") { app.go(.dash(.queue)) } }
            row("Brand dashboard", "megaphone") { app.go(.page("/brand")) }
            Rectangle().fill(Color.line).frame(height: 1).padding(.vertical, 6)
            row("Back to the site", "arrow.up.left") { app.go(.home) }
            row("Sign out", "rectangle.portrait.and.arrow.right") { Task { await app.signOut() } }
            Spacer(minLength: 0)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.black)
        .presentationDetents([.medium, .large])
    }

    private func row(_ t: String, _ symbol: String, _ action: @escaping () -> Void) -> some View {
        Button { dismiss(); action() } label: {
            HStack(spacing: 14) { Image(systemName: symbol).frame(width: 24); Text(t).font(.system(size: 17)); Spacer() }
                .foregroundStyle(Color.paper).frame(height: 46).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct Rail: View {
    @Environment(AppModel.self) private var app
    let page: DashPage

    private var group: String { page == .queue ? "Owner" : "Creator" }
    private var items: [DashPage] { page == .queue ? [.queue] : [.overview, .submissions, .earnings, .profile, .settings] }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { app.go(.home) } label: { Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 50, height: 38).foregroundStyle(Color.paper) }
                .buttonStyle(.plain).help("Back to the site")
                .padding(.top, 48).padding(.leading, 6).padding(.bottom, 26)

            Text(group).font(.system(size: 12)).foregroundStyle(.mute).padding(.leading, 10).padding(.bottom, 10)
            VStack(spacing: 4) {
                ForEach(items) { i in
                    let on = i == page.rail
                    Button { app.go(.dash(i)) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: i.symbol).font(.system(size: 14)).frame(width: 20)
                            Text(i.title).font(.system(size: 14.5))
                            Spacer()
                            if i == .earnings, let a = app.home?.balances.available, a > 0 { Circle().fill(Color.good).frame(width: 6, height: 6) }
                        }
                        .foregroundStyle(on ? Color.paper : Color.paper.opacity(0.6))
                        .padding(.horizontal, 12).frame(height: 40)
                        .background(on ? Color.white.opacity(0.07) : .clear, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(on ? Color.white.opacity(0.12) : .clear))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            Spacer()
            VStack(alignment: .leading, spacing: 4) {
                if app.isAdmin && page != .queue { footer("Owner dashboard", "shield") { app.go(.dash(.queue)) } }
                footer("Brand dashboard", "megaphone") { app.go(.page("/brand")) }
                footer("Back to the site", "arrow.up.left") { app.go(.home) }
            }
            .padding(.bottom, 14)
            userCard
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 16)
        .frame(maxHeight: .infinity)
        .background(Color.black)
    }

    private func footer(_ t: String, _ symbol: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) { Image(systemName: symbol).font(.system(size: 13)).frame(width: 20); Text(t).font(.system(size: 13.5)); Spacer() }
                .foregroundStyle(Color.paper.opacity(0.55)).padding(.horizontal, 12).frame(height: 34).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var userCard: some View {
        HStack(spacing: 11) {
            Avatar(url: app.me?.avatarURL, name: app.me?.profile?.displayName ?? "L", size: 36)
            VStack(alignment: .leading, spacing: 1) {
                Text(app.me?.profile?.displayName ?? "Signed out").font(.system(size: 13.5, weight: .medium)).foregroundStyle(Color.paper).lineLimit(1)
                Text(app.me?.profile.map { "@\($0.handle)" } ?? "").font(.system(size: 11.5)).foregroundStyle(.mute).lineLimit(1)
            }
            Spacer(minLength: 4)
            Button { Task { await app.signOut() } } label: { Image(systemName: "rectangle.portrait.and.arrow.right").font(.system(size: 13)).foregroundStyle(.mute).frame(width: 28, height: 28).contentShape(Rectangle()) }
                .buttonStyle(.plain).help("Sign out")
        }
        .padding(10)
        .pane(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct DashHeader: View {
    @Environment(AppModel.self) private var app
    let page: DashPage

    var body: some View {
        HStack(spacing: 16) {
            HStack(spacing: 8) {
                Text(page == .queue ? "Owner" : "Creator").foregroundStyle(.mute)
                Text("/").foregroundStyle(.faint)
                Text(page.rail.title).foregroundStyle(Color.paper)
            }
            .font(.system(size: 13.5))
            .frame(width: 190, alignment: .leading)

            Button { app.showJump = true } label: {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").font(.system(size: 13)).foregroundStyle(.mute)
                    Text("Search, or do something").font(.system(size: 14)).foregroundStyle(.mute)
                    Spacer()
                    Text("⌘K").font(.system(size: 11, design: .monospaced)).foregroundStyle(.faint).padding(.horizontal, 7).padding(.vertical, 2).overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color.line))
                }
                .padding(.horizontal, 16).frame(height: 42).frame(maxWidth: 420).contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .pane(Capsule(), interactive: true)
            .frame(maxWidth: .infinity)

            PaperPill("Find a campaign", symbol: "plus", height: 40) { app.go(.home) }
            GlassCircle(symbol: "bell", size: 40, dot: app.unread > 0, help: "Notifications") { app.go(.dash(.notifications)) }
        }
        .padding(.horizontal, 28)
        .frame(height: 72)
        .overlay(alignment: .bottom) { Rectangle().fill(Color.line).frame(height: 1) }
    }
}

/// The scrolling frame every dashboard page sits in.
struct DashPageFrame<Content: View>: View {
    let page: DashPage
    var title: String?
    var subtitle: String?
    @ViewBuilder var content: Content
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact

    var body: some View {
        SiteScroll {
            VStack(alignment: .leading, spacing: 28) {
                PageTitle(title: title ?? page.title, subtitle: subtitle).padding(.top, compact ? 22 : 34)
                if page.tabs.count > 1 {
                    GlassTabs(items: page.tabs.map { ($0, $0.title) }, selection: Binding(get: { page }, set: { app.go(.dash($0)) }))
                }
                content
            }
            .padding(.horizontal, compact ? 18 : 48)
            .padding(.bottom, compact ? 90 : 60)
            .frame(maxWidth: 1120, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}

struct SignInPrompt: View {
    @Environment(AppModel.self) private var app
    var body: some View {
        VStack(spacing: 22) {
            Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 60, height: 46).foregroundStyle(Color.paper)
            Text("Sign in to logoless").font(.display(44)).foregroundStyle(Color.paper)
            Text("See your balance, your submissions and what is waiting for you.").font(.system(size: 17)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 420)
            PaperPill("Sign in", busy: app.signingIn) { Task { await app.signIn() } }.disabled(app.signingIn)
            Text("New here? You can create an account in the same window.").font(.system(size: 13)).foregroundStyle(.faint)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
