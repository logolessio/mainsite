import SwiftUI

/// The owner's queue: what needs a decision, and the numbers that matter.
struct QueuePage: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    @State private var rejecting: StaffSubmission?
    @State private var rejectingPayout: StaffPayout?
    @State private var approvingPayout: StaffPayout?
    @State private var reason = ""

    var body: some View {
        DashPageFrame(page: .queue, subtitle: "Submissions and withdrawals that are waiting for you.") {
            GhostPill("Open the full owner dashboard", symbol: "square.grid.2x2", height: 40) { app.goOwner() }
            ErrorLine(text: app.failures["staff"] ?? app.failures["decide"]) { Task { await app.loadStaff() } }
            if let s = app.staff {
                SiteGrid(columns: compact ? 2 : 4, spacing: 14) {
                    StatCard(label: "To review", value: String(s.pendingSubmissions), note: "submissions")
                    StatCard(label: "Withdrawals held", value: String(s.payoutsInReview))
                    StatCard(label: "Live campaigns", value: String(s.liveCampaigns))
                    StatCard(label: "People", value: s.people.formatted(), note: "\(s.joinedToday) joined today")
                }
                if s.pending.isEmpty && s.review.isEmpty { EmptyNote(symbol: "checkmark.circle", title: "All clear", message: "Nothing is waiting for a decision.") }

                if !s.review.isEmpty {
                    block("Withdrawals held for a look") {
                        ForEach(s.review) { p in
                            (compact ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 14))) {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 8) { Text(Money.cents(p.amountCents)).font(.system(size: 17)).foregroundStyle(Color.paper); if p.risk != "low" { StatusPill(text: "extra checks", tint: .warn) } }
                                    Text("\(p.email) · to \(p.paypalEmail ?? "no address") · \(p.date.relative)").font(.system(size: 13)).foregroundStyle(.mute)
                                    if let r = p.reason { Text(r).font(.system(size: 12)).foregroundStyle(.faint) }
                                }
                                if !compact { Spacer() }
                                HStack(spacing: 10) {
                                    GhostPill("Decline", height: 38) { reason = ""; rejectingPayout = p }
                                    PaperPill("Send", height: 38) { approvingPayout = p }
                                }
                            }
                            .padding(.vertical, 12)
                            Rectangle().fill(Color.line).frame(height: 1)
                        }
                    }
                }
                if !s.pending.isEmpty {
                    block("Submissions to review") {
                        ForEach(s.pending) { sub in
                            (compact ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 14))) {
                                HStack(spacing: 14) {
                                RemoteImage(url: sub.coverURL, seed: sub.campaign).frame(width: 50, height: 50).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 8) { Text(sub.campaign).font(.system(size: 17)).foregroundStyle(Color.paper).lineLimit(1); if sub.risk != "low" { StatusPill(text: "extra checks", tint: .warn) } }
                                    Text("\(sub.who) · \(sub.platform.platformName) · \(sub.date.relative)").font(.system(size: 13)).foregroundStyle(.mute)
                                }
                                }
                                if !compact { Spacer() }
                                HStack(spacing: 10) {
                                    GhostPill("Open post", symbol: "arrow.up.right", height: 38) { if let u = URL(string: sub.url) { Platform.open(u) } }
                                    GhostPill("Decline", height: 38) { reason = ""; rejecting = sub }
                                    PaperPill("Approve", height: 38) { Task { _ = await app.decide(sub, approve: true) } }
                                }
                            }
                            .padding(.vertical, 12)
                            Rectangle().fill(Color.line).frame(height: 1)
                        }
                    }
                }
            } else if app.failures["staff"] == nil {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
            }
        }
        .sheet(item: $rejecting) { sub in reasonSheet(title: "Decline this submission", prompt: "Tell the creator why") { await app.decide(sub, approve: false, reason: reason) } }
        .sheet(item: $rejectingPayout) { p in reasonSheet(title: "Decline this withdrawal", prompt: "Tell the creator why (their balance is unchanged)") { await app.decide(p, approve: false, note: reason) } }
        .confirmationDialog("Send \(Money.cents(approvingPayout?.amountCents ?? 0)) to \(approvingPayout?.paypalEmail ?? "this address")?", isPresented: Binding(get: { approvingPayout != nil }, set: { if !$0 { approvingPayout = nil } }), titleVisibility: .visible) {
            Button("Send the money") { if let p = approvingPayout { Task { _ = await app.decide(p, approve: true) } }; approvingPayout = nil }
            Button("Cancel", role: .cancel) { approvingPayout = nil }
        } message: { Text("This pays out through PayPal and cannot be undone.") }
    }

    private func block<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.display(30)).foregroundStyle(Color.paper).padding(.bottom, 14)
            Rectangle().fill(Color.line).frame(height: 1)
            content()
        }
        .padding(.top, 10)
    }

    private func reasonSheet(title: String, prompt: String, _ go: @escaping () async -> Bool) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(title).font(.display(28)).foregroundStyle(Color.paper)
            Text(prompt).font(.system(size: 14)).foregroundStyle(.mute)
            TextField("At least a few words", text: $reason, axis: .vertical).lineLimit(2...4).textFieldStyle(.plain).padding(14)
                .background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.chip, style: .continuous).strokeBorder(Color.line))
            HStack {
                Spacer()
                GhostPill("Cancel") { rejecting = nil; rejectingPayout = nil }.keyboardShortcut(.cancelAction)
                PaperPill("Decline") { Task { if await go() { rejecting = nil; rejectingPayout = nil } } }.disabled(reason.trimmingCharacters(in: .whitespaces).count < 3).keyboardShortcut(.defaultAction)
            }
        }
        .padding(28)
        .frame(maxWidth: 460)
        .background(Color.black)
    }
}
