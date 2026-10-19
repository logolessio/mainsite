import SwiftUI

/// One set of motion for the whole app. Everything eases the same way (the site's curve: quick off the line, a long soft landing), nothing
/// bounces or overshoots, a page arrives as one calm move, and the parts of a page arrive in order instead of all at once.
enum Motion {
    /// The site's easing at any length.
    static func ease(_ seconds: Double = 0.5) -> Animation { .timingCurve(0.22, 1, 0.36, 1, duration: seconds) }
    /// Small state changes: a chip lighting up, a hover, a figure settling.
    static let quick = ease(0.3)
    /// Moving from one page to the next.
    static let page = ease(0.46)
    /// Panels that slide in and out (the menu, the bell, the jump box): a spring that settles without a wobble.
    static let panel = Animation.spring(response: 0.44, dampingFraction: 0.9)
    /// A press: fast, and back again.
    static let press = Animation.spring(response: 0.26, dampingFraction: 0.82)

    /// How a page comes in: it fades up a few points while the old one is already leaving.
    static var pageIn: AnyTransition {
        .asymmetric(insertion: .opacity.combined(with: .offset(y: 12)), removal: .opacity.animation(ease(0.16)))
    }
    /// How a step inside a flow comes in: the old step leaves first, then the new one rises into place.
    static var stepIn: AnyTransition {
        .asymmetric(insertion: .opacity.combined(with: .offset(y: 10)).animation(ease(0.5).delay(0.1)), removal: .opacity.animation(ease(0.16)))
    }
}

/// Which things have already arrived, so scrolling back past a cover or a row does not make it fade in a second time.
@MainActor enum RevealMemory { static var seen = Set<String>() }

/// Fades up into place once, when it first appears. `delay` lets a row of them arrive a few hundredths of a second apart.
/// With a `key`, the same thing never replays (a cover scrolled out of view and back); without one it plays whenever it is built.
private struct Reveal: ViewModifier {
    var delay: Double
    var rise: CGFloat
    var key: String?
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduce

    private var done: Bool { shown || reduce || Snap.flat || (key.map { RevealMemory.seen.contains($0) } ?? false) }

    func body(content: Content) -> some View {
        content
            .opacity(done ? 1 : 0)
            .offset(y: done ? 0 : rise)
            .onAppear {
                guard !done else { return }
                if let key { RevealMemory.seen.insert(key) }
                withAnimation(Motion.ease(0.75).delay(delay)) { shown = true }
            }
    }
}

extension View {
    /// Fades up into place when it first appears (see `Reveal`).
    func reveal(_ delay: Double = 0, rise: CGFloat = 14, key: String? = nil) -> some View { modifier(Reveal(delay: delay, rise: rise, key: key)) }
}

/// Press feedback for buttons that are not glass (glass answers presses by itself): a small, quick shrink.
struct PressScale: ButtonStyle {
    var scale: CGFloat = 0.97
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .animation(Motion.press, value: configuration.isPressed)
    }
}

/// A soft light that moves across a shape while something loads, instead of a spinner.
struct Shimmer: ViewModifier {
    @State private var phase: CGFloat = -1
    @Environment(\.accessibilityReduceMotion) private var reduce
    func body(content: Content) -> some View {
        content
            .overlay {
                if !reduce && !Snap.flat {
                    GeometryReader { geo in
                        LinearGradient(colors: [.clear, Color.white.opacity(0.07), .clear], startPoint: .leading, endPoint: .trailing)
                            .frame(width: geo.size.width * 0.6)
                            .offset(x: phase * geo.size.width * 1.6 - geo.size.width * 0.3)
                    }
                    .allowsHitTesting(false)
                }
            }
            .clipped()
            .onAppear { withAnimation(.linear(duration: 1.6).repeatForever(autoreverses: false)) { phase = 1 } }
    }
}

/// Placeholder covers while the campaigns load.
struct SkeletonCovers: View {
    let columns: Int
    var spacing: CGFloat = 24
    var count = 8
    var body: some View {
        SiteGrid(columns: columns, spacing: spacing) {
            ForEach(0..<count, id: \.self) { _ in
                RoundedRectangle(cornerRadius: Radius.cover, style: .continuous)
                    .fill(Color.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: Radius.cover, style: .continuous).strokeBorder(Color.white.opacity(0.06)))
                    .aspectRatio(1, contentMode: .fit)
                    .modifier(Shimmer())
                    .clipShape(RoundedRectangle(cornerRadius: Radius.cover, style: .continuous))
            }
        }
        .transition(.opacity)
    }
}
