import SwiftUI

/// A campaign's own page: the cover and the audio, the facts, the brief, and the button to submit.
struct CampaignPage: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    let campaign: Campaign
    @State private var submitting = false
    @State private var copied = false

    var body: some View {
        SiteScroll {
            VStack(alignment: .leading, spacing: compact ? 20 : 30) {
                breadcrumbs.padding(.top, compact ? 62 : 78)

                VStack(spacing: 0) {
                    if compact { phoneLayout } else { wideLayout }
                    PaperPill("Submit content", height: 54, fullWidth: true) { if app.isSignedIn { submitting = true } else { Task { await app.signIn() } } }
                        .padding(.top, compact ? 24 : 32)
                }
                .padding(compact ? 18 : 32)
                .background(Color.white.opacity(0.025), in: RoundedRectangle(cornerRadius: compact ? 28 : Radius.panel, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: compact ? 28 : Radius.panel, style: .continuous).strokeBorder(Color.line))
            }
            .padding(.horizontal, compact ? 16 : 40)
            .padding(.bottom, 80)
            .frame(maxWidth: 1120)
            .frame(maxWidth: .infinity)
        }
        .sheet(isPresented: $submitting) { SubmitSheet(campaign: campaign) }
        .onDisappear { if app.player.playingID == campaign.id { app.player.stop() } }
    }

    // MARK: layouts

    private var wideLayout: some View {
        HStack(alignment: .top, spacing: 44) {
            VStack(spacing: 16) {
                cover(radius: 28)
                PlayerPill(campaign: campaign)
            }
            .frame(width: 400)
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) { Text(campaign.kind).font(.system(size: 14)).foregroundStyle(.mute); Spacer(); saveButton }
                Text(campaign.title).font(.display(50)).foregroundStyle(Color.paper).lineLimit(3).minimumScaleFactor(0.6).fixedSize(horizontal: false, vertical: true)
                Text("by \(campaign.creator)").font(.system(size: 17)).foregroundStyle(.mute)
                facts.padding(.top, 4)
                details
            }
        }
    }

    private var phoneLayout: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 16) {
                cover(radius: 22).frame(width: 116)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top) { Text(campaign.kind).font(.system(size: 13)).foregroundStyle(.mute); Spacer(); saveButton }
                    Text(campaign.title).font(.display(30)).foregroundStyle(Color.paper).lineLimit(3).minimumScaleFactor(0.6).fixedSize(horizontal: false, vertical: true)
                    Text("by \(campaign.creator)").font(.system(size: 15)).foregroundStyle(.mute)
                }
            }
            facts
            HStack(spacing: 14) { platforms }
            PlayerPill(campaign: campaign)
            brief
            HStack(alignment: .top, spacing: 18) { bullets("Create this", campaign.clipThis); bullets("Not allowed", campaign.offLimits) }
            footnote
        }
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) { platforms }.padding(.top, 2)
            brief.padding(.top, 6)
            HStack(alignment: .top, spacing: 26) { bullets("Create this", campaign.clipThis); bullets("Not allowed", campaign.offLimits) }
            footnote
        }
    }

    // MARK: pieces

    private func cover(radius: CGFloat) -> some View {
        RemoteImage(url: campaign.coverURL, seed: campaign.id)
            .aspectRatio(1, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Color.white.opacity(0.08)))
            .shadow(color: .black.opacity(0.5), radius: 26, y: 18)
    }

    private var saveButton: some View {
        Button { Task { await app.toggleSaved(campaign) } } label: {
            Image(systemName: app.isSaved(campaign) ? "heart.fill" : "heart").font(.system(size: 15)).foregroundStyle(app.isSaved(campaign) ? Color.paper : Color.paper.opacity(0.7)).frame(width: 36, height: 36).contentShape(Circle())
        }
        .buttonStyle(.plain).pane(Circle(), interactive: true).help(app.isSaved(campaign) ? "Remove from saved" : "Save this campaign")
    }

    private var facts: some View {
        HStack(spacing: compact ? 8 : 12) {
            factTile("You earn", "$" + String(format: "%.2f", campaign.ratePer1k), "per 1,000 views")
            factTile("Budget", campaign.budget > 0 ? Money.compact(campaign.budget) : "Open", campaign.budgetLeftPct.map { "\($0)% left" } ?? (campaign.budget > 0 ? "total" : "no cap"))
            factTile("Ends", campaign.endsOn.isEmpty ? "Open" : campaign.endsOn, "deadline")
        }
    }

    @ViewBuilder private var platforms: some View {
        ForEach(campaign.platforms, id: \.self) { p in
            HStack(spacing: 7) { PlatformMark(platform: p, size: 14); Text(p.platformName).font(.system(size: 14)) }.foregroundStyle(Color.paper.opacity(0.85))
        }
    }

    private var brief: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("The brief").font(.system(size: 13)).foregroundStyle(.mute)
            Text(campaign.summary.isEmpty ? "No brief yet." : campaign.summary).font(.system(size: 16)).foregroundStyle(Color.paper.opacity(0.92)).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footnote: some View {
        VStack(alignment: .leading, spacing: 8) {
            if campaign.capPerPost != nil || campaign.capPerUser != nil {
                Text([campaign.capPerPost.map { "One submission can earn up to $\(Money.plain($0))." }, campaign.capPerUser.map { "One creator can earn up to $\(Money.plain($0)) here." }].compactMap { $0 }.joined(separator: " "))
                    .font(.system(size: 13)).foregroundStyle(.mute)
            }
            Text("Earnings can be withdrawn as soon as they are confirmed, from $10.").font(.system(size: 13)).foregroundStyle(.mute)
            HStack(spacing: 14) {
                link("Campaign rules") { Platform.open(Config.base.appendingPathComponent("legal/campaign-rules")) }
                link("Report") { Platform.open(Config.base.appendingPathComponent("report")) }
                link(copied ? "Copied" : "Copy link") {
                    Platform.copy(campaign.pageURL.absoluteString)
                    copied = true
                    Task { try? await Task.sleep(for: .seconds(2)); copied = false }
                }
            }
        }
    }

    private var breadcrumbs: some View {
        HStack(spacing: 8) {
            crumb("Home") { app.go(.home) }
            Text("/").foregroundStyle(.faint)
            crumb("Campaigns") { app.go(.home) }
            Text("/").foregroundStyle(.faint)
            Text(campaign.title).foregroundStyle(Color.paper).lineLimit(1)
        }
        .font(.system(size: 13))
    }

    private func crumb(_ t: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(t).foregroundStyle(.mute) }.buttonStyle(.plain)
    }

    private func link(_ t: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(t).font(.system(size: 13)).foregroundStyle(Color.paper.opacity(0.8)).underline() }.buttonStyle(.plain)
    }

    private func factTile(_ label: String, _ value: String, _ note: String) -> some View {
        VStack(spacing: 6) {
            Text(label).font(.system(size: 12)).foregroundStyle(.mute)
            Text(value).font(.display(compact ? 22 : 26)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.6)
            Text(note).font(.system(size: 11)).foregroundStyle(.faint).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.line))
    }

    private func bullets(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 13)).foregroundStyle(.mute)
            if items.isEmpty { Text("Nothing specific.").font(.system(size: 14)).foregroundStyle(.faint) }
            ForEach(items, id: \.self) { i in Text("· \(i)").font(.system(size: 14)).foregroundStyle(Color.paper.opacity(0.88)).fixedSize(horizontal: false, vertical: true) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// The campaign's short audio preview: a play button and a waveform that fills as it plays, on glass.
struct PlayerPill: View {
    @Environment(AppModel.self) private var app
    let campaign: Campaign

    private var playing: Bool { app.player.playingID == campaign.id }
    private var progress: Double { playing && app.player.duration > 0 ? min(1, app.player.elapsed / app.player.duration) : 0 }
    private var bars: [CGFloat] {
        var h = UInt32(truncatingIfNeeded: campaign.id.unicodeScalars.reduce(5381) { ($0 &* 33 &+ Int($1.value)) & 0xffffff })
        return (0..<56).map { _ in h = h &* 1664525 &+ 1013904223; return 0.25 + CGFloat((h >> 16) & 0xff) / 255 * 0.75 }
    }

    var body: some View {
        HStack(spacing: 16) {
            Button { app.player.toggle(id: campaign.id, url: campaign.previewURL) } label: {
                Image(systemName: playing ? "pause.fill" : "play.fill").font(.system(size: 15)).foregroundStyle(Color.black).frame(width: 40, height: 40).background(Color.paper, in: Circle()).contentShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(campaign.previewURL == nil)
            .opacity(campaign.previewURL == nil ? 0.5 : 1)
            .help(campaign.previewURL == nil ? "No preview yet" : playing ? "Pause" : "Play a short preview")

            HStack(alignment: .center, spacing: 2.5) {
                ForEach(Array(bars.enumerated()), id: \.offset) { i, h in
                    Capsule().fill(Double(i) / Double(bars.count) < progress ? Color.paper : Color.paper.opacity(0.28)).frame(width: 2.5, height: 26 * h)
                }
            }
            .frame(height: 28)
            .frame(maxWidth: .infinity)

            Text(playing ? timeText(app.player.elapsed) : "0:00").font(.system(size: 11, design: .monospaced)).foregroundStyle(.mute)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .pane(Capsule())
    }

    private func timeText(_ s: Double) -> String { String(format: "%d:%02d", Int(s) / 60, Int(s) % 60) }
}
