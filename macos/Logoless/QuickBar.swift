import SwiftUI

/// The floating bar of Liquid Glass at the bottom of the window: the four places people go to most. The chosen one is a glass pill
/// of its own, and the pills melt into each other as the choice moves, which is what GlassEffectContainer is for.
struct QuickBar: View {
    @Environment(Browser.self) private var browser
    @Namespace private var glass

    var body: some View {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 8) {
                ForEach(Quick.all) { item in
                    let on = browser.quickID == item.id
                    Button {
                        withAnimation(.smooth(duration: 0.45)) { browser.open(path: item.path) }
                    } label: {
                        Label(item.title, systemImage: item.symbol)
                            .font(.system(size: 13, weight: on ? .semibold : .regular))
                            .foregroundStyle(on ? .primary : .secondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .glassEffect(on ? .regular.tint(.white.opacity(0.18)).interactive() : .regular.interactive(), in: .capsule)
                    .glassEffectID(item.id, in: glass)
                }
            }
            .padding(6)
        }
        .shadow(color: .black.opacity(0.35), radius: 24, y: 10)
        .animation(.smooth(duration: 0.45), value: browser.quickID)
    }
}
