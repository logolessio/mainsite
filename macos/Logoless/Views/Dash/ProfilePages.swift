import SwiftUI

struct ProfilePage: View {
    @Environment(AppModel.self) private var app
    @State private var name = ""
    @State private var bio = ""
    @State private var saved: Bool?
    @State private var busy = false
    @State private var filled = false

    private var p: Me.Profile? { app.me?.profile }
    private var changed: Bool { guard let p else { return false }; return name != p.displayName || bio != p.bio }

    var body: some View {
        DashPageFrame(page: .profile, subtitle: "How you appear to brands and other creators.") {
            if let p {
                HStack(spacing: 24) {
                    Avatar(url: app.me?.avatarURL, name: p.displayName, size: 96)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(p.displayName).font(.display(38)).foregroundStyle(Color.paper)
                        Text("@\(p.handle)").font(.system(size: 15)).foregroundStyle(.mute)
                        if let s = app.me?.stats {
                            Text("\(s.clips) \(s.clips == 1 ? "submission" : "submissions") · \(s.views.compact) views · \(Money.cents(s.earnedCents)) earned").font(.system(size: 13.5)).foregroundStyle(.faint)
                        }
                    }
                    Spacer()
                    GhostPill("View public profile", symbol: "arrow.up.right", height: 40) { NSWorkspace.shared.open(Config.base.appendingPathComponent("u/\(p.handle)")) }
                }
                .padding(28)
                .frame(maxWidth: .infinity)
                .pane(RoundedRectangle(cornerRadius: 30, style: .continuous))

                Card(padding: 26, radius: 26) {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("Edit").font(.display(26)).foregroundStyle(Color.paper)
                        VStack(alignment: .leading, spacing: 8) { Eyebrow("Display name"); SiteField(prompt: "Your name", text: $name) }
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow("Bio")
                            TextEditor(text: $bio).scrollContentBackground(.hidden).font(.system(size: 14)).padding(10).frame(height: 110)
                                .background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: Radius.chip, style: .continuous).strokeBorder(Color.line))
                            Text("\(bio.count) of 400").font(.system(size: 12)).foregroundStyle(.faint)
                        }
                        HStack(spacing: 14) {
                            PaperPill("Save changes", busy: busy) { Task { await save() } }.disabled(!changed || busy || name.trimmingCharacters(in: .whitespaces).isEmpty || bio.count > 400)
                            if let saved { Text(saved ? "Saved." : (app.failures["profile"] ?? "Could not save.")).font(.system(size: 13.5)).foregroundStyle(saved ? Color.good : Color.bad) }
                        }
                    }
                }
                HStack(spacing: 12) {
                    GhostPill("Handle, picture and look on logoless.io", symbol: "safari", height: 40) { NSWorkspace.shared.open(Config.base.appendingPathComponent("dashboard/profile")) }
                    GhostPill("Linked accounts", symbol: "link", height: 40) { NSWorkspace.shared.open(Config.base.appendingPathComponent("dashboard/accounts")) }
                }
            } else {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
            }
        }
        .onAppear(perform: fill)
        .onChange(of: app.me?.profile?.displayName) { _, _ in fill() }
    }

    private func fill() {
        guard let p, !filled || !changed else { return }
        name = p.displayName; bio = p.bio; filled = true
    }

    private func save() async {
        busy = true
        defer { busy = false }
        saved = await app.saveProfile(displayName: name.trimmingCharacters(in: .whitespaces), bio: bio)
        if saved == true { filled = false; fill() }
    }
}

struct AchievementsPage: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        DashPageFrame(page: .achievements, subtitle: app.achievements.map { "\($0.badges.filter(\.unlocked).count) of \($0.badges.count) unlocked · \($0.points) points" } ?? "Things you have done on logoless.") {
            ErrorLine(text: app.failures["achievements"]) { Task { await app.load(.achievements) } }
            if let a = app.achievements {
                SiteGrid(columns: 3, spacing: 14) {
                    ForEach(a.badges.sorted { ($0.unlocked ? 0 : 1, -$0.points) < ($1.unlocked ? 0 : 1, -$1.points) }) { b in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: b.unlocked ? "checkmark.seal.fill" : "lock").foregroundStyle(b.unlocked ? tint(b.rarity) : Color.paper.opacity(0.3))
                                Spacer()
                                Text(b.rarity).font(.system(size: 11)).foregroundStyle(tint(b.rarity).opacity(b.unlocked ? 1 : 0.5))
                            }
                            Text(b.name).font(.display(22)).foregroundStyle(Color.paper.opacity(b.unlocked ? 1 : 0.5))
                            Text(b.how).font(.system(size: 13)).foregroundStyle(.mute).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                            Text("\(b.points) points").font(.system(size: 12)).foregroundStyle(.faint)
                        }
                        .padding(18)
                        .frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)
                        .background(Color.white.opacity(b.unlocked ? 0.045 : 0.02), in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).strokeBorder(Color.line))
                    }
                }
            } else if app.failures["achievements"] == nil {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
            }
        }
    }

    private func tint(_ rarity: String) -> Color {
        switch rarity { case "rare": Color(red: 0.45, green: 0.7, blue: 1); case "epic": Color(red: 0.75, green: 0.55, blue: 1); case "legendary": Color.warn; default: Color.paper.opacity(0.7) }
    }
}

struct SavedPage: View {
    @Environment(AppModel.self) private var app
    private var saved: [Campaign] { app.campaigns.filter { app.favorites.contains($0.id) } }

    var body: some View {
        DashPageFrame(page: .saved, subtitle: "Campaigns you saved. You hear when one of them changes.") {
            if saved.isEmpty {
                EmptyNote(symbol: "heart", title: "Nothing saved yet", message: "Press the heart on a campaign to keep it here.")
                PaperPill("Browse campaigns") { app.go(.home) }.frame(maxWidth: .infinity)
            } else {
                SiteGrid(columns: 3, spacing: 28) {
                    ForEach(saved) { c in Button { app.open(c) } label: { CampaignCard(campaign: c) }.buttonStyle(.plain) }
                }
            }
        }
    }
}

struct SettingsPage: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        DashPageFrame(page: .settings, subtitle: "Your account, and how logoless reaches you.") {
            Card(padding: 26, radius: 26) {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Account").font(.display(26)).foregroundStyle(Color.paper)
                    if let p = app.me?.profile {
                        row("Signed in as", "\(p.displayName) (@\(p.handle))")
                    }
                    row("This app talks to", Config.base.host ?? "logoless.io")
                    row("Version", Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0")
                    HStack(spacing: 12) {
                        GhostPill("Password, email and delete account", symbol: "safari", height: 40) { NSWorkspace.shared.open(Config.base.appendingPathComponent("dashboard/settings")) }
                        GhostPill("Sign out", symbol: "rectangle.portrait.and.arrow.right", height: 40) { Task { await app.signOut() } }
                        GhostPill("Show the welcome tour", symbol: "sparkles", height: 40) { app.replayOnboarding() }
                    }
                    .padding(.top, 4)
                }
            }
        }
    }

    private func row(_ k: String, _ v: String) -> some View {
        HStack { Text(k).font(.system(size: 14)).foregroundStyle(.mute); Spacer(); Text(v).font(.system(size: 14)).foregroundStyle(Color.paper) }
    }
}

struct NotificationsPage: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        DashPageFrame(page: .notifications, subtitle: app.unread > 0 ? "\(app.unread) new" : "You are all caught up.") {
            ErrorLine(text: app.failures["notifications"]) { Task { await app.loadNotifications() } }
            HStack(spacing: 10) {
                GhostPill("Mark all as read", symbol: "checkmark.circle", height: 36) { Task { await app.markAllRead() } }.disabled(app.unread == 0)
                GhostPill("Clear all", symbol: "trash", height: 36) { Task { await app.clearNotifications() } }.disabled(app.notifications.isEmpty)
            }
            if app.notifications.isEmpty && app.failures["notifications"] == nil {
                EmptyNote(symbol: "bell", title: "Nothing yet", message: "You hear here when a submission is reviewed, a payout moves or a campaign you saved changes.")
            } else {
                VStack(spacing: 0) {
                    ForEach(app.notifications) { n in
                        Button { Task { await app.markRead(n) }; if let u = n.url { NSWorkspace.shared.open(u) } } label: {
                            HStack(alignment: .top, spacing: 14) {
                                Circle().fill(n.isRead ? Color.clear : Color.paper).frame(width: 8, height: 8).padding(.top, 7)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(n.title).font(.system(size: 16)).foregroundStyle(Color.paper.opacity(n.isRead ? 0.6 : 1)).multilineTextAlignment(.leading)
                                    if !n.body.isEmpty { Text(n.body).font(.system(size: 13.5)).foregroundStyle(.mute).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true) }
                                }
                                Spacer(minLength: 12)
                                Text(n.date.relative).font(.system(size: 12)).foregroundStyle(.faint)
                            }
                            .padding(.vertical, 14).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        Rectangle().fill(Color.line).frame(height: 1)
                    }
                }
            }
        }
    }
}
