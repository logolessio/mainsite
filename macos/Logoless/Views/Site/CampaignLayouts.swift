import SwiftUI

/// The campaigns as the Design page lays them out: a grid of four (the standard look), large covers, compact covers, a magazine style
/// mosaic where some covers are twice the size, or one row per campaign with the details beside the cover. The same five as the website.
struct CampaignCollection: View {
    let campaigns: [Campaign]
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact

    /// Each one arrives a few hundredths after the one before it, and never replays when it is scrolled out of sight and back.
    private func arrival(_ i: Int) -> Double { 0.34 + Double(i % 8) * 0.045 }
    private var items: [(offset: Int, element: Campaign)] { Array(campaigns.enumerated()) }

    var body: some View {
        let layout = app.design.layout
        Group {
            switch layout {
            case "list":
                VStack(spacing: 12) {
                    ForEach(items, id: \.element.id) { i, c in
                        Button { app.open(c) } label: { CampaignRow(campaign: c) }.buttonStyle(PressScale(scale: 0.985))
                            .reveal(arrival(i), rise: 12, key: "row-\(c.id)")
                            .transition(.opacity.combined(with: .scale(scale: 0.97)))
                    }
                }
                .frame(maxWidth: 760)
                .frame(maxWidth: .infinity)
            case "mosaic":
                MosaicLayout(columns: compact ? 2 : 4, spacing: compact ? 16 : 34) {
                    ForEach(items, id: \.element.id) { i, c in
                        Button { app.open(c) } label: { CampaignCard(campaign: c) }.buttonStyle(PressScale())
                            .reveal(arrival(i), rise: 16, key: "card-\(c.id)")
                    }
                }
            default:
                let columns = layout == "large" ? (compact ? 1 : 3) : layout == "compact" ? (compact ? 3 : 6) : (compact ? 2 : 4)
                let spacing: CGFloat = layout == "compact" ? (compact ? 10 : 20) : layout == "large" ? (compact ? 20 : 40) : (compact ? 16 : 34)
                SiteGrid(columns: columns, spacing: spacing) {
                    ForEach(items, id: \.element.id) { i, c in
                        Button { app.open(c) } label: { CampaignCard(campaign: c) }.buttonStyle(PressScale())
                            .reveal(arrival(i), rise: 16, key: "card-\(c.id)")
                            .transition(.opacity.combined(with: .scale(scale: 0.96)))
                    }
                }
            }
        }
        // searching and filtering: the covers that stay glide to their new places, the others fade away or in
        .animation(Motion.page, value: campaigns.map(\.id))
    }
}

/// Square covers on a grid where every ninth one is twice as wide and tall, and the others fill in around it (the site's dense grid flow).
private struct MosaicLayout: Layout {
    let columns: Int
    let spacing: CGFloat

    private struct Slot { var col: Int; var row: Int; var span: Int }

    private func slots(_ count: Int) -> (slots: [Slot], rows: Int) {
        var taken = Set<Int>() // row * columns + col
        var out: [Slot] = []
        var rows = 0
        for i in 0..<count {
            let span = (i % 9 == 0 && columns >= 2) ? 2 : 1
            var row = 0
            placed: while true {
                for col in 0...(columns - span) {
                    let fits = (0..<span).allSatisfy { dr in (0..<span).allSatisfy { dc in !taken.contains((row + dr) * columns + col + dc) } }
                    if fits {
                        for dr in 0..<span { for dc in 0..<span { taken.insert((row + dr) * columns + col + dc) } }
                        out.append(Slot(col: col, row: row, span: span))
                        rows = max(rows, row + span)
                        break placed
                    }
                }
                row += 1
            }
        }
        return (out, rows)
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? 800
        let cw = (w - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        let rows = slots(subviews.count).rows
        return CGSize(width: w, height: rows == 0 ? 0 : cw * CGFloat(rows) + spacing * CGFloat(rows - 1))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let cw = (bounds.width - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        for (v, s) in zip(subviews, slots(subviews.count).slots) {
            let side = cw * CGFloat(s.span) + spacing * CGFloat(s.span - 1)
            v.place(at: CGPoint(x: bounds.minX + CGFloat(s.col) * (cw + spacing), y: bounds.minY + CGFloat(s.row) * (cw + spacing)), proposal: .init(width: side, height: side))
        }
    }
}

/// One campaign as a row: the cover on the left, the details beside it, and what it pays on the right.
struct CampaignRow: View {
    let campaign: Campaign
    @Environment(\.compact) private var compact
    @State private var hover = false

    var body: some View {
        let left = max(0, min(100, campaign.budgetLeftPct ?? 100))
        HStack(spacing: compact ? 16 : 24) {
            RemoteImage(url: campaign.coverURL, seed: campaign.id)
                .frame(width: compact ? 80 : 112, height: compact ? 80 : 112)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(campaign.title).font(.display(compact ? 22 : 27)).foregroundStyle(Color.paper).lineLimit(1)
                Text("\(campaign.creator) · \(campaign.type)").font(.system(size: compact ? 13 : 15)).foregroundStyle(Color.paper.opacity(0.6)).lineLimit(1)
                HStack(spacing: 14) {
                    HStack(spacing: 8) { ForEach(campaign.platforms, id: \.self) { PlatformMark(platform: $0, size: 13).foregroundStyle(Color.paper.opacity(0.7)) } }
                    if compact { Text("\(campaign.rateText) per 1K").foregroundStyle(Color.paper.opacity(0.8)) }
                    if !campaign.endsOn.isEmpty { Text("Ends \(campaign.endsOn)") }
                    HStack(spacing: 8) {
                        Capsule().fill(Color.white.opacity(0.15)).frame(width: 64, height: 4).overlay(alignment: .leading) { Capsule().fill(Color.white.opacity(0.85)).frame(width: 64 * CGFloat(left) / 100, height: 4) }
                        Text("\(left)% left")
                    }
                }
                .font(.system(size: 12.5)).foregroundStyle(Color.paper.opacity(0.55)).lineLimit(1).padding(.top, 6)
            }
            Spacer(minLength: 0)
            if !compact {
                VStack(alignment: .trailing, spacing: 4) {
                    Text(campaign.rateText).font(.display(32)).foregroundStyle(Color.paper)
                    Text("per 1,000 views").font(.system(size: 12)).foregroundStyle(Color.paper.opacity(0.5))
                }
            }
            Image(systemName: "arrow.up.right").font(.system(size: 14, weight: .medium)).foregroundStyle(Color.paper.opacity(hover ? 1 : 0.4))
        }
        .padding(compact ? 10 : 12).padding(.trailing, compact ? 6 : 14)
        .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Color.white.opacity(hover ? 0.05 : 0.02)))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).strokeBorder(Color.white.opacity(hover ? 0.2 : 0.1)))
        .offset(y: hover ? -2 : 0)
        .animation(.easeOut(duration: 0.25), value: hover)
        .onHover { hover = $0 }
        .contentShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(campaign.title) by \(campaign.creator), \(campaign.rateText) per 1,000 views")
    }
}
