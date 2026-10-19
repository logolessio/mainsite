import SwiftUI

struct OverviewPage: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact

    var body: some View {
        let h = app.home
        DashPageFrame(page: .overview, title: h.map { "Welcome back, \($0.name.split(separator: " ").first.map(String.init) ?? $0.name)" } ?? "Overview", subtitle: "Your balance, your submissions and anything that needs doing.") {
            ErrorLine(text: app.failures["home"]) { Task { await app.load(.overview) } }
            if let h {
                // the money, as three plain figures under hairlines
                (compact ? AnyLayout(VStackLayout(alignment: .leading, spacing: 30)) : AnyLayout(HStackLayout(alignment: .top, spacing: 40))) {
                    VStack(alignment: .leading, spacing: 0) {
                        figureHead("Available to withdraw", strong: true)
                        Text(Money.cents(h.balances.available)).font(.display(compact ? 60 : 76)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.5).contentTransition(.numericText()).animation(Motion.ease(0.7), value: h.balances.available).padding(.top, 22).contentTransition(.numericText())
                        Text(h.balances.available > 0 ? "Ready when you are." : "Earnings land here once your submissions are approved.").font(.system(size: 14)).foregroundStyle(.mute).padding(.top, 16)
                        if h.balances.pending > 0 { Text("\(Money.cents(h.balances.pending)) more is still being confirmed.").font(.system(size: 14)).foregroundStyle(.mute).padding(.top, 3) }
                        HStack(spacing: 10) {
                            PaperPill("Withdraw", height: 40) { app.go(.dash(.earnings)) }
                            GhostPill("See earnings", height: 40) { app.go(.dash(.earnings)) }
                        }
                        .padding(.top, 20)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    figure("Total earned", Money.cents(h.balances.earned), "Everything you have earned so far")
                    figure("Verified views", h.views.formatted(), "\(h.submissions) \(h.submissions == 1 ? "submission" : "submissions")")
                }

                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Recent submissions").font(.display(30)).foregroundStyle(Color.paper)
                        Spacer()
                        Button { app.go(.dash(.submissions)) } label: { Text("View all").font(.system(size: 14)).foregroundStyle(.mute).underline() }.buttonStyle(.plain)
                    }
                    .padding(.bottom, 14)
                    Rectangle().fill(Color.line).frame(height: 1)
                    if h.recent.isEmpty {
                        EmptyNote(symbol: "film.stack", title: "No submissions yet", message: "Join a campaign, post your content and submit the link. It will show up here.")
                        PaperPill("Browse campaigns") { app.go(.home) }.frame(maxWidth: .infinity)
                    } else {
                        ForEach(h.recent) { s in SubmissionRow(submission: s) }
                    }
                }
                .padding(.top, 10)
            } else if app.failures["home"] == nil {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
            }
        }
    }

    private func figureHead(_ t: String, strong: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle().fill(strong ? Color.white.opacity(0.25) : Color.line).frame(height: 1)
            Text(t).font(.system(size: 14)).foregroundStyle(.mute).padding(.top, 18)
        }
    }

    private func figure(_ label: String, _ value: String, _ note: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            figureHead(label)
            Text(value).font(.display(compact ? 48 : 60)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.5).contentTransition(.numericText()).animation(Motion.ease(0.7), value: value).padding(.top, 22)
            Text(note).font(.system(size: 14)).foregroundStyle(.mute).padding(.top, 16)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SubmissionRow: View {
    @Environment(AppModel.self) private var app
    let submission: Submission

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                RemoteImage(url: submission.coverURL, seed: submission.campaignId)
                    .frame(width: 46, height: 46)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(submission.campaign).font(.system(size: 17)).foregroundStyle(Color.paper).lineLimit(1)
                    HStack(spacing: 6) { PlatformMark(platform: submission.platform, size: 11); Text(submission.platform.platformName) }.font(.system(size: 12)).foregroundStyle(.mute)
                }
                Spacer(minLength: 12)
                StatusPill(text: submission.state.label, tint: submission.state.tint)
                Text("\(submission.views.formatted()) views").font(.system(size: 14)).foregroundStyle(.mute).monospacedDigit().frame(width: 110, alignment: .trailing)
            }
            .padding(.vertical, 14)
            .contentShape(Rectangle())
            .onTapGesture { app.open(campaignID: submission.campaignId) }
            .contextMenu {
                Button("Open Post", systemImage: "arrow.up.right.square") { if let u = URL(string: submission.url) { Platform.open(u) } }
                Button("Copy Link", systemImage: "link") { Platform.copy(submission.url) }
                Button("Show Campaign", systemImage: "square.grid.2x2") { app.open(campaignID: submission.campaignId) }
            }
            Rectangle().fill(Color.line).frame(height: 1)
        }
    }
}

struct SubmissionsPage: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    @State private var filter = "all"
    @State private var query = ""
    @State private var newest = true

    private var shown: [Submission] {
        var l = filter == "all" ? app.submissions : app.submissions.filter { $0.status == filter }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty { l = l.filter { $0.campaign.lowercased().contains(q) || $0.platform.lowercased().contains(q) } }
        return newest ? l : l.reversed()
    }
    private func count(_ s: String) -> Int { s == "all" ? app.submissions.count : app.submissions.filter { $0.status == s }.count }

    var body: some View {
        DashPageFrame(page: .submissions, subtitle: "Every submission you've submitted and where it stands. YouTube and TikTok views are checked about every two hours while a campaign is running.") {
            ErrorLine(text: app.failures["submissions"]) { Task { await app.load(.submissions) } }
            SiteGrid(columns: compact ? 2 : 4, spacing: 14) {
                StatCard(label: "Submissions", value: String(app.submissions.count), note: "\(count("approved")) approved")
                StatCard(label: "In review", value: String(count("pending")), note: "Waiting on checks")
                StatCard(label: "Verified views", value: app.submissions.reduce(0) { $0 + $1.views }.formatted(), note: "Across all submissions")
                StatCard(label: "Earned", value: Money.cents(app.submissions.reduce(0) { $0 + $1.earnedCents }), note: "From these submissions")
            }
            (compact ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 12))) {
                GlassTabs(items: [("all", "All \(count("all"))"), ("approved", "Approved \(count("approved"))"), ("pending", "In review \(count("pending"))"), ("rejected", "Rejected \(count("rejected"))")], selection: $filter, compact: true)
                if !compact { Spacer() }
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").font(.system(size: 12)).foregroundStyle(.mute)
                    TextField("Search submissions", text: $query).textFieldStyle(.plain).font(.system(size: 13))
                }
                .padding(.horizontal, 14).frame(width: compact ? nil : 230, height: 36).frame(maxWidth: compact ? .infinity : nil).pane(Capsule())
                Button { withAnimation(.smooth) { newest.toggle() } } label: { Text(newest ? "Newest" : "Oldest").font(.system(size: 12.5)).foregroundStyle(Color.paper.opacity(0.8)).padding(.horizontal, 14).frame(height: 36).contentShape(Capsule()) }
                    .buttonStyle(.plain).pane(Capsule(), interactive: true)
            }
            if shown.isEmpty && app.failures["submissions"] == nil {
                EmptyNote(symbol: "film.stack", title: filter == "all" ? "Nothing submitted" : "Nothing here", message: filter == "all" ? "Content you submit to campaigns will appear here with its review status." : nil)
            } else {
                SiteGrid(columns: compact ? 1 : 3, spacing: 16) {
                    ForEach(shown) { s in SubmissionCard(submission: s) }
                }
            }
        }
    }
}

struct SubmissionCard: View {
    @Environment(AppModel.self) private var app
    let submission: Submission
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                HStack(spacing: 6) { PlatformMark(platform: submission.platform, size: 11); Text(submission.platform.lowercased()) }
                    .font(.system(size: 11.5)).foregroundStyle(.mute).padding(.horizontal, 10).padding(.vertical, 4).background(Color.white.opacity(0.06), in: Capsule())
                Spacer()
                StatusPill(text: submission.state.label.lowercased(), tint: submission.state.tint)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(submission.campaign).font(.display(24)).foregroundStyle(Color.paper).lineLimit(1)
                Text("Submitted \(submission.date.short)").font(.system(size: 12.5)).foregroundStyle(.mute)
            }
            Rectangle().fill(Color.line).frame(height: 1)
            HStack {
                VStack(alignment: .leading, spacing: 3) { Text("Verified views").font(.system(size: 11.5)).foregroundStyle(.mute); Text(submission.views.formatted()).font(.system(size: 16)).foregroundStyle(Color.paper).monospacedDigit() }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) { Text("Earned").font(.system(size: 11.5)).foregroundStyle(.mute); Text(Money.cents(submission.earnedCents)).font(.system(size: 16)).foregroundStyle(Color.paper).monospacedDigit() }
            }
        }
        .padding(20)
        .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).strokeBorder(Color.line))
        .contentShape(Rectangle())
        .onTapGesture { if let u = URL(string: submission.url) { Platform.open(u) } }
        .contextMenu {
            Button("Open Post", systemImage: "arrow.up.right.square") { if let u = URL(string: submission.url) { Platform.open(u) } }
            Button("Copy Link", systemImage: "link") { Platform.copy(submission.url) }
            Button("Show Campaign", systemImage: "square.grid.2x2") { app.open(campaignID: submission.campaignId) }
        }
    }
}
