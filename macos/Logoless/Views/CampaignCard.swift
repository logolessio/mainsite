import SwiftUI

/// A campaign as its cover and nothing else. On hover the cover lifts, the picture drifts in, and a panel slides up from the bottom
/// edge carrying the name and the line under it, one after the other (the same moves as the website).
struct CampaignCard: View {
    let campaign: Campaign
    @State private var hover = false

    private static let ease = Animation.timingCurve(0.22, 1, 0.36, 1, duration: 0.56)

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

                        LinearGradient(colors: [.black.opacity(0.55), .clear], startPoint: .bottom, endPoint: .top)
                            .frame(height: geo.size.height * 0.6)
                            .opacity(hover ? 1 : 0)
                            .animation(.easeOut(duration: 0.5), value: hover)

                        if hover {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(campaign.title)
                                    .font(.display(22))
                                    .foregroundStyle(Color.paper)
                                    .lineLimit(1)
                                    .transition(.offset(y: 8).combined(with: .opacity).animation(Self.ease.delay(0.11)))
                                Text("\(campaign.creator) · \(campaign.rateText) per 1K")
                                    .font(.footnote)
                                    .foregroundStyle(Color.paper.opacity(0.65))
                                    .lineLimit(1)
                                    .transition(.offset(y: 8).combined(with: .opacity).animation(Self.ease.delay(0.17)))
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 14)
                            .padding(.bottom, 16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.black.opacity(0.92))
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
