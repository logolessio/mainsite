import SwiftUI

/// A campaign as its cover and nothing else. On hover the cover lifts, the picture drifts in, and a panel slides up from the bottom
/// edge carrying the name and the line under it, one after the other (the same moves as the website).
struct CampaignCard: View {
    let campaign: Campaign
    @Environment(AppModel.self) private var app
    @State private var hover = false

    private static let ease = Animation.timingCurve(0.22, 1, 0.36, 1, duration: 0.56)

    private var cover: CoverText { app.design.cover }
    /// The name is shown on hover, or always when the Design page says so (the way to see it on a touch screen).
    private var visible: Bool { hover || cover.show == "always" }
    private var titleText: String { cover.case == "upper" ? campaign.title.uppercased() : cover.case == "lower" ? campaign.title.lowercased() : campaign.title }
    private var metaText: String {
        switch cover.meta {
        case "creator": campaign.creator
        case "rate": "\(campaign.rateText) per 1K"
        case "none": ""
        default: "\(campaign.creator) · \(campaign.rateText) per 1K"
        }
    }
    /// The apps carry Gloock; any other typeface chosen on the site arrives as a kind and is drawn in the system face of that kind.
    private var titleFont: Font {
        let size: CGFloat = (cover.case == "upper" ? [ "s": 15, "m": 18, "l": 23 ] : [ "s": 18, "m": 22, "l": 29 ])[cover.size] ?? 22
        switch cover.fontKind {
        case "serif": return .system(size: size, weight: .regular, design: .serif)
        case "sans": return .system(size: size, weight: .medium, design: .default)
        case "mono": return .system(size: size, weight: .medium, design: .monospaced)
        default: return .display(size)
        }
    }
    @ViewBuilder private var panelBackground: some View {
        switch cover.panel {
        case "glass":
            if Snap.flat { Color.black.opacity(0.45) } else { Rectangle().fill(.ultraThinMaterial).overlay(Color.black.opacity(0.18)).overlay(alignment: .top) { Rectangle().fill(Color.white.opacity(0.15)).frame(height: 1) } }
        case "fade": Color.clear
        default: Color.black.opacity(0.92)
        }
    }

    var body: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    ZStack(alignment: .bottom) {
                        RemoteImage(url: campaign.coverURL, seed: campaign.id)
                            .frame(width: geo.size.width, height: geo.size.height)
                            .scaleEffect(hover ? 1.15 : 1)
                            .offset(y: hover ? -geo.size.height * 0.015 : 0)
                            .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.9), value: hover)

                        LinearGradient(colors: [.black.opacity(cover.panel == "fade" ? 0.8 : 0.55), .clear], startPoint: .bottom, endPoint: .top)
                            .frame(height: geo.size.height * (cover.panel == "fade" ? 0.8 : 0.6))
                            .opacity(visible ? 1 : 0)
                            .animation(.easeOut(duration: 0.5), value: visible)

                        if visible {
                            VStack(alignment: cover.align == "center" ? .center : .leading, spacing: 4) {
                                Text(titleText)
                                    .font(titleFont)
                                    .tracking(cover.case == "upper" ? 1.2 : 0)
                                    .foregroundStyle(Color.paper)
                                    .lineLimit(cover.size == "l" ? 2 : 1)
                                    .multilineTextAlignment(cover.align == "center" ? .center : .leading)
                                    .transition(.offset(y: 8).combined(with: .opacity).animation(Self.ease.delay(0.11)))
                                if !metaText.isEmpty {
                                    Text(metaText)
                                        .font(.footnote)
                                        .foregroundStyle(Color.paper.opacity(0.7))
                                        .lineLimit(1)
                                        .transition(.offset(y: 8).combined(with: .opacity).animation(Self.ease.delay(0.17)))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 14)
                            .padding(.bottom, 16)
                            .frame(maxWidth: .infinity, alignment: cover.align == "center" ? .center : .leading)
                            .background { panelBackground }
                            .transition(.move(edge: .bottom))
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: Radius.cover, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.cover, style: .continuous).strokeBorder(Color.white.opacity(hover ? 0.15 : 0.06)))
            .offset(y: hover ? -6 : 0)
            .shadow(color: .black.opacity(hover ? 0.7 : 0.3), radius: hover ? 22 : 8, y: hover ? 20 : 6)
            .animation(Self.ease, value: hover)
            .onHover { hover = $0 }
            .contentShape(RoundedRectangle(cornerRadius: Radius.cover, style: .continuous))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(campaign.title) by \(campaign.creator), \(campaign.rateText) per 1,000 views")
    }
}
