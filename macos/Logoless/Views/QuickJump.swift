import SwiftUI

/// ⌘K: type to jump to a place or a campaign.
struct QuickJump: View {
    @Environment(AppModel.self) private var app
    @State private var query = ""
    @FocusState private var focused: Bool

    private struct Hit: Identifiable { let id: String; let title: String; let subtitle: String; let symbol: String; let go: () -> Void }

    private var hits: [Hit] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        var out: [Hit] = []
        let pages: [(String, String, Route)] = [("Campaigns", "square.grid.2x2", .home)] + DashPage.allCases.filter { $0 != .queue || app.isAdmin }.map { ($0.title, $0.symbol, Route.dash($0)) }
        for (title, symbol, route) in pages where q.isEmpty || title.lowercased().contains(q) {
            out.append(Hit(id: "p-\(title)", title: title, subtitle: "Go to", symbol: symbol) { app.go(route) })
        }
        for c in app.campaigns where !q.isEmpty && "\(c.title) \(c.creator)".lowercased().contains(q) {
            out.append(Hit(id: "c-\(c.id)", title: c.title, subtitle: c.creator, symbol: "square.grid.2x2") { app.open(c) })
        }
        let site: [(String, String)] = [("For creators", "/for-creators"), ("For brands", "/for-brands"), ("Pricing", "/pricing"), ("About", "/about"), ("Q&A", "/faq"), ("Case studies", "/case-studies"), ("Contact", "/contact"), ("Leaderboard", "/leaderboard"), ("Reels", "/reels"), ("Status", "/status"), ("Terms", "/legal/terms"), ("Privacy", "/legal/privacy"), ("Brand dashboard", "/brand"), ("Linked accounts", "/dashboard/accounts"), ("Setup guide", "/dashboard/setup")]
        for (title, path) in site where q.isEmpty ? false : title.lowercased().contains(q) { out.append(Hit(id: "s-\(path)", title: title, subtitle: "Page", symbol: "doc.text") { app.goPage(path) }) }
        if q.isEmpty { out.append(Hit(id: "web", title: "Pricing", subtitle: "Page", symbol: "doc.text") { app.goPage("/pricing") }) }
        return Array(out.prefix(9))
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.opacity(0.35).ignoresSafeArea().onTapGesture { close() }
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.mute)
                    TextField("Jump to a campaign or a page", text: $query)
                        .textFieldStyle(.plain).font(.title3).focused($focused)
                        .onSubmit { if let h = hits.first { choose(h) } }
                }
                .padding(.horizontal, 20).frame(height: 58)
                Divider().overlay(Color.line)
                VStack(spacing: 2) {
                    ForEach(Array(hits.enumerated()), id: \.element.id) { i, h in
                        Button { choose(h) } label: {
                            HStack(spacing: 12) {
                                Image(systemName: h.symbol).frame(width: 22).foregroundStyle(.mute)
                                Text(h.title)
                                Text(h.subtitle).foregroundStyle(.faint)
                                Spacer()
                                if i == 0 { Text("↩").foregroundStyle(.faint) }
                            }
                            .padding(.horizontal, 14).frame(height: 40)
                            .background(i == 0 ? Color.white.opacity(0.08) : .clear, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                    if hits.isEmpty { Text("Nothing matches").foregroundStyle(.faint).frame(height: 48) }
                }
                .padding(8)
            }
            .frame(maxWidth: 560)
            .padding(.horizontal, 16)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
            .shadow(color: .black.opacity(0.5), radius: 40, y: 20)
            .padding(.top, 90)
        }
        .onAppear { focused = true; query = "" }
        .onExit { close() }
    }

    private func choose(_ h: Hit) { close(); h.go() }
    private func close() { app.showJump = false }
}
