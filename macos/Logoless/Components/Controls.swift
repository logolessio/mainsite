import SwiftUI

/// The site's paper-white pill (Dashboard, Find a campaign, Submit content): liquid glass tinted paper, dark text.
struct PaperPill: View {
    let title: String
    var symbol: String?
    var busy = false
    var height: CGFloat = 44
    var fullWidth = false
    let action: () -> Void
    @Environment(\.isEnabled) private var enabled

    init(_ title: String, symbol: String? = nil, busy: Bool = false, height: CGFloat = 44, fullWidth: Bool = false, action: @escaping () -> Void) {
        self.title = title; self.symbol = symbol; self.busy = busy; self.height = height; self.fullWidth = fullWidth; self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if busy { ProgressView().controlSize(.small).tint(.black) } else if let symbol { Image(systemName: symbol).font(.system(size: height > 40 ? 14 : 12, weight: .semibold)) }
                Text(title).lineLimit(1).fixedSize()
            }
            .font(.system(size: height > 40 ? 15 : 13, weight: .medium))
            .foregroundStyle(Color.black)
            .padding(.horizontal, height > 40 ? 24 : 18)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: height)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .pane(Capsule(), tint: Color.paper.opacity(enabled ? 0.95 : 0.4), interactive: true)
        .opacity(enabled ? 1 : 0.6)
    }
}

/// The site's outlined pill (See all the steps, Report...): clear glass, light text.
struct GhostPill: View {
    let title: String
    var symbol: String?
    var height: CGFloat = 44
    let action: () -> Void
    init(_ title: String, symbol: String? = nil, height: CGFloat = 44, action: @escaping () -> Void) { self.title = title; self.symbol = symbol; self.height = height; self.action = action }
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let symbol { Image(systemName: symbol).font(.system(size: 13, weight: .medium)) }
                Text(title)
            }
            .font(.system(size: height > 40 ? 15 : 13, weight: .medium))
            .foregroundStyle(Color.paper)
            .padding(.horizontal, height > 40 ? 22 : 16)
            .frame(height: height)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .pane(Capsule(), interactive: true)
    }
}

/// A round glass button with one symbol (the bell, the menu).
struct GlassCircle: View {
    let symbol: String
    var size: CGFloat = 42
    var dot = false
    var help: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size * 0.38, weight: .medium))
                .foregroundStyle(Color.paper)
                .frame(width: size, height: size)
                .overlay(alignment: .topTrailing) { if dot { Circle().fill(Color.paper).frame(width: 8, height: 8).overlay(Circle().strokeBorder(Color.black, lineWidth: 2)).offset(x: -8, y: 8) } }
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .pane(Circle(), interactive: true)
        .help(help)
        .accessibilityLabel(help)
    }
}

/// A row of choices on one pane of glass. The paper highlight glides from one choice to the next, as on the website's menus.
struct GlassTabs<ID: Hashable>: View {
    let items: [(id: ID, label: String)]
    @Binding var selection: ID
    var compact = false
    @Namespace private var space

    var body: some View {
        HStack(spacing: 2) {
            ForEach(items, id: \.id) { item in
                let on = item.id == selection
                Button { withAnimation(Motion.ease(0.42)) { selection = item.id } } label: {
                    Text(item.label)
                        .font(.system(size: compact ? 12.5 : 14.5, weight: on ? .medium : .regular))
                        .foregroundStyle(on ? Color.black : Color.paper.opacity(0.65))
                        .padding(.horizontal, compact ? 12 : 20)
                        .frame(height: compact ? 28 : 38)
                        .background { if on { Capsule().fill(Color.paper).matchedGeometryEffect(id: "tab", in: space) } }
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(compact ? 4 : 5)
        .pane(Capsule())
    }
}

/// One figure with its label in a bordered card (the website's stat tiles).
struct StatCard: View {
    let label: String
    let value: String
    var note: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(label).font(.system(size: 13)).foregroundStyle(.mute)
            Text(value).font(.display(30)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.6)
                .contentTransition(.numericText()).animation(Motion.ease(0.7), value: value)
            if let note { Text(note).font(.system(size: 12)).foregroundStyle(.faint) }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).strokeBorder(Color.line))
    }
}

struct ErrorLine: View {
    let text: String?
    var retry: (() -> Void)?
    var body: some View {
        if let text {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle").foregroundStyle(Color.warn)
                Text(text).foregroundStyle(Color.paper.opacity(0.85))
                Spacer(minLength: 0)
                if let retry { GhostPill("Try again", height: 32, action: retry) }
            }
            .padding(14)
            .background(Color.warn.opacity(0.10), in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
        }
    }
}

struct EmptyNote: View {
    let symbol: String
    let title: String
    var message: String?
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol).font(.system(size: 28, weight: .light)).foregroundStyle(.faint)
            Text(title).font(.display(24)).foregroundStyle(Color.paper)
            if let message { Text(message).font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 360) }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 56)
    }
}

/// A text field drawn like the site's inputs: dark, bordered, rounded.
struct SiteField: View {
    let prompt: String
    @Binding var text: String
    var body: some View {
        TextField(prompt, text: $text)
            .textFieldStyle(.plain)
            .font(.system(size: 14))
            .padding(.horizontal, 16).frame(height: 46)
            .background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.chip, style: .continuous).strokeBorder(Color.line))
    }
}

/// A page's scrolling frame. (While the app is drawing itself into a picture for a layout check, scrolling and lazy lists cannot be drawn, so the content is laid out plainly.)
struct SiteScroll<Content: View>: View {
    var alignment: Alignment = .top
    @ViewBuilder var content: Content
    var body: some View {
        if Snap.flat { GeometryReader { geo in content.fixedSize(horizontal: false, vertical: true).frame(width: geo.size.width, height: geo.size.height, alignment: alignment).clipped() } }
        else { ScrollView { content }.scrollEdgeEffectStyle(.soft, for: .top) }
    }
}

/// Equal columns. Lazy in the app; laid out plainly for a layout check.
struct SiteGrid<Content: View>: View {
    let columns: Int
    var spacing: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        if Snap.flat { ColumnsLayout(columns: columns, spacing: spacing) { content } }
        else { LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: spacing), count: columns), spacing: spacing) { content } }
    }
}

private struct ColumnsLayout: Layout {
    let columns: Int
    let spacing: CGFloat
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? 800
        let cw = (w - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        var h: CGFloat = 0
        for row in stride(from: 0, to: subviews.count, by: columns) {
            let rh = subviews[row..<min(row + columns, subviews.count)].map { $0.sizeThatFits(.init(width: cw, height: nil)).height }.max() ?? 0
            h += rh + (row == 0 ? 0 : spacing)
        }
        return CGSize(width: w, height: h)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let cw = (bounds.width - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        var y = bounds.minY
        for row in stride(from: 0, to: subviews.count, by: columns) {
            let slice = subviews[row..<min(row + columns, subviews.count)]
            let rh = slice.map { $0.sizeThatFits(.init(width: cw, height: nil)).height }.max() ?? 0
            for (i, v) in slice.enumerated() { v.place(at: CGPoint(x: bounds.minX + CGFloat(i) * (cw + spacing), y: y), proposal: .init(width: cw, height: rh)) }
            y += rh + spacing
        }
    }
}
