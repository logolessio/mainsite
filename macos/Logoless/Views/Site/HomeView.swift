import SwiftUI

enum CampaignSort: String, CaseIterable, Identifiable {
    case featured = "Featured", rate = "Highest rate", budget = "Most budget left"
    var id: String { rawValue }
}

/// The front page: the promise, a search, the filters, and every open campaign as its cover.
struct HomeView: View {
    @Environment(AppModel.self) private var app
    @State private var query = ""
    @State private var kind = "All"
    @State private var platform: String?
    @State private var sort = CampaignSort.featured
    @FocusState private var searching: Bool
    @Environment(\.compact) private var compact

    private var kinds: [String] { ["All"] + Array(Set(app.campaigns.map(\.kind))).sorted() }

    private var shown: [Campaign] {
        var list = app.campaigns
        if kind != "All" { list = list.filter { $0.kind == kind } }
        if let platform { list = list.filter { $0.platforms.contains(platform) } }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty { list = list.filter { "\($0.title) \($0.creator) \($0.type)".lowercased().contains(q) } }
        switch sort {
        case .featured: list = list.filter { $0.pinned ?? false } + list.filter { !($0.pinned ?? false) }
        case .rate: list.sort { $0.ratePer1k > $1.ratePer1k }
        case .budget: list.sort { ($0.budgetLeftPct ?? 100) > ($1.budgetLeftPct ?? 100) }
        }
        return list
    }

    private var hero: some View {
        VStack(spacing: 22) {
            Text("Your views\nhave value.")
                .font(.display(compact ? 46 : 84))
                .multilineTextAlignment(.center)
                .lineSpacing(-6)
                .foregroundStyle(Color.paper)
            Text(compact ? "Join a campaign, post your content, and earn for every 1,000 verified views." : "Join a campaign, post your content, and earn for\nevery 1,000 verified views.")
                .font(.system(size: compact ? 15 : 16))
                .multilineTextAlignment(.center)
                .foregroundStyle(.mute)
        }
        .padding(.top, compact ? 56 : 74)
        .padding(.bottom, compact ? 28 : 44)
    }

    var body: some View {
        SiteScroll {
            Group {
                if Snap.flat {
                    VStack(spacing: 0) { hero; searchBar.padding(.vertical, 8); filters.padding(.top, 18).padding(.bottom, 40); content }
                } else {
                    LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                        hero
                        Section {
                            filters.padding(.top, 18).padding(.bottom, 40)
                            content
                        } header: {
                            searchBar.padding(.vertical, 8)
                        }
                    }
                }
            }
            .padding(.horizontal, compact ? 16 : 40)
            .padding(.bottom, 80)
            .frame(maxWidth: 1240)
            .frame(maxWidth: .infinity)
        }
        .onExit { searching = false; query = "" }
    }

    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass").font(.system(size: 15)).foregroundStyle(.mute)
            TextField("Search artists, streamers, songs…", text: $query)
                .textFieldStyle(.plain)
                .font(.system(size: 15))
                .focused($searching)
            Text("\(app.campaigns.count) live").font(.system(size: 11, design: .monospaced)).foregroundStyle(.faint)
        }
        .padding(.horizontal, compact ? 18 : 22)
        .frame(height: compact ? 52 : 58)
        .frame(maxWidth: 700)
        .pane(Capsule())
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder private var filters: some View {
        if compact { ScrollView(.horizontal, showsIndicators: false) { filterRow.padding(.horizontal, 2) } } else { filterRow }
    }

    private var filterRow: some View {
        HStack(spacing: 14) {
            GlassTabs(items: kinds.map { ($0, $0) }, selection: $kind, compact: true)
            HStack(spacing: 4) {
                ForEach(["tiktok", "youtube", "instagram"], id: \.self) { p in
                    let on = platform == p
                    Button { withAnimation(.smooth(duration: 0.25)) { platform = on ? nil : p } } label: {
                        PlatformMark(platform: p, size: 14)
                            .foregroundStyle(on ? Color.black : Color.paper.opacity(0.7))
                            .frame(width: 32, height: 28)
                            .background(on ? Color.paper : .clear, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .help(p.platformName)
                }
            }
            .padding(4)
            .pane(Capsule())
            Menu {
                Picker("Sort by", selection: $sort) { ForEach(CampaignSort.allCases) { Text($0.rawValue).tag($0) } }
            } label: {
                Text(sort == .featured ? "Newest" : sort.rawValue).font(.system(size: 12.5)).foregroundStyle(Color.paper.opacity(0.8)).padding(.horizontal, 14).frame(height: 36)
            }
            .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden)
            .pane(Capsule(), interactive: true)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder private var content: some View {
        if let e = app.failures["campaigns"] {
            ErrorLine(text: e) { Task { await app.loadCampaigns() } }
        } else if !app.loadedCampaigns {
            ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
        } else if shown.isEmpty {
            EmptyNote(symbol: "magnifyingglass", title: query.isEmpty ? "Nothing open here yet" : "Nothing matches that", message: query.isEmpty ? "New campaigns appear as soon as they go live." : "Try another word, or clear the search.")
        } else {
            SiteGrid(columns: compact ? 2 : 4, spacing: compact ? 16 : 34) {
                ForEach(shown) { c in
                    Button { app.open(c) } label: { CampaignCard(campaign: c) }.buttonStyle(.plain)
                }
            }
        }
    }
}
