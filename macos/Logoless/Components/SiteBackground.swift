import SwiftUI

/// The website's own backdrop, drawn the same way: a soft black-and-white gradient that drifts and changes shape (five slow clouds), a faint
/// 72 point grid fading out toward the edges, a vignette, and fine film grain. It moves at 24 frames a second and stands still for Reduce Motion.
struct SiteBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduce

    var body: some View {
        ZStack {
            Color.black
            if reduce || Snap.flat {
                GradientFieldCanvas(t: 8)
            } else {
                TimelineView(.animation(minimumInterval: 1.0 / 24)) { tl in
                    GradientFieldCanvas(t: tl.date.timeIntervalSinceReferenceDate)
                }
            }
            GridOverlay()
            Vignette()
            Grain()
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}

private struct Cloud {
    let cx, cy, rx, ry: Double
    let stops: [Gradient.Stop]
    let swayX, swayY, period, phase, spin, breathe: Double
}

/// A cloud edge that eases out to nothing (a smooth S curve), so there is no visible ring where it ends.
private func soft(_ white: Double, _ alpha: Double, _ end: Double) -> [Gradient.Stop] {
    (0...8).map { i in
        let t = Double(i) / 8
        let k = 0.5 + 0.5 * cos(Double.pi * t)
        return Gradient.Stop(color: Color(white: white, opacity: alpha * k * k), location: t * end)
    }
}

private struct GradientFieldCanvas: View {
    let t: Double

    var body: some View {
        Canvas { ctx, size in
            guard size.width > 1, size.height > 1 else { return }
            // the site paints on a canvas 200 across and stretches it; the same numbers are used here
            let w = 200.0
            let h = max(80.0, (200 * Double(size.height) / Double(size.width)).rounded())
            let m = max(w, h)
            let clouds: [Cloud] = [
                Cloud(cx: 0.21 * m, cy: 0.05 * m, rx: 0.39 * m, ry: 0.29 * m, stops: soft(1, 0.32, 0.8), swayX: 0.2 * w, swayY: 0.2 * h, period: 41, phase: 0, spin: 0.35, breathe: 0.18),
                Cloud(cx: w - 0.07 * m, cy: 0.02 * h + 0.37 * m, rx: 0.31 * m, ry: 0.37 * m, stops: soft(0.88, 0.26, 0.82), swayX: -0.26 * w, swayY: 0.18 * h, period: 53, phase: 1.3, spin: -0.5, breathe: 0.2),
                Cloud(cx: 0.49 * m, cy: h + 0.02 * m, rx: 0.43 * m, ry: 0.26 * m, stops: soft(1, 0.22, 0.84), swayX: 0.2 * w, swayY: -0.24 * h, period: 47, phase: 2.4, spin: 0.4, breathe: 0.2),
                Cloud(cx: 0.36 * w + 0.19 * m, cy: 0.24 * h + 0.19 * m, rx: 0.19 * m, ry: 0.19 * m, stops: soft(1, 0.2, 0.78), swayX: -0.22 * w, swayY: 0.18 * h, period: 29, phase: 3.1, spin: 0, breathe: 0.35),
                Cloud(cx: 0.28 * w + 0.3 * m, cy: 0.44 * h + 0.22 * m, rx: 0.3 * m, ry: 0.22 * m, stops: soft(0, 0.7, 0.9), swayX: -0.24 * w, swayY: -0.16 * h, period: 37, phase: 4.2, spin: 0.5, breathe: 0.25),
            ]
            var base = ctx
            base.scaleBy(x: size.width / w, y: size.height / h)
            for c in clouds {
                let s = sin(t / c.period * .pi * 2 + c.phase)
                let s2 = sin(t / (c.period * 0.73) * .pi * 2 + c.phase * 1.7)
                var g = base
                g.translateBy(x: c.cx + c.swayX * 0.5 * s, y: c.cy + c.swayY * 0.5 * s2)
                g.rotate(by: .radians(c.spin * s2))
                g.scaleBy(x: c.rx * (1 + c.breathe * 0.5 * s2), y: c.ry * (1 - c.breathe * 0.5 * s2))
                g.fill(Path(CGRect(x: -1, y: -1, width: 2, height: 2)), with: .radialGradient(Gradient(stops: c.stops), center: .zero, startRadius: 0, endRadius: 1))
            }
        }
    }
}

/// The faint grid, strongest in the middle and gone toward the edges (the site masks it with an ellipse).
private struct GridOverlay: View {
    var body: some View {
        Canvas { ctx, size in
            let step = 72.0
            let cx = Double(size.width) / 2, cy = Double(size.height) * 0.38
            let rx = 0.8 * Double(size.width), ry = 0.7 * Double(size.height)
            func alpha(_ x: Double, _ y: Double) -> Double {
                let d = (((x - cx) / rx) * ((x - cx) / rx) + ((y - cy) / ry) * ((y - cy) / ry)).squareRoot()
                return d <= 0.25 ? 1 : d >= 0.78 ? 0 : 1 - (d - 0.25) / 0.53
            }
            let seg = 12.0
            // lines are cut into short pieces so each can fade on its own
            var x = cx.truncatingRemainder(dividingBy: step)
            while x < Double(size.width) {
                var y = 0.0
                while y < Double(size.height) {
                    let a = alpha(x, y + seg / 2)
                    if a > 0.01 { ctx.fill(Path(CGRect(x: x, y: y, width: 1, height: seg + 0.5)), with: .color(.white.opacity(0.06 * a))) }
                    y += seg
                }
                x += step
            }
            var y = 0.0
            while y < Double(size.height) {
                var xx = 0.0
                while xx < Double(size.width) {
                    let a = alpha(xx + seg / 2, y)
                    if a > 0.01 { ctx.fill(Path(CGRect(x: xx, y: y, width: seg + 0.5, height: 1)), with: .color(.white.opacity(0.06 * a))) }
                    xx += seg
                }
                y += step
            }
        }
        .drawingGroup()
    }
}

/// The soft vignette (the site's LightField): the middle stays clear, the edges fall to black.
private struct Vignette: View {
    var body: some View {
        Canvas { ctx, size in
            var g = ctx
            g.translateBy(x: size.width / 2, y: size.height * 0.54)
            g.scaleBy(x: size.width * 0.72, y: size.height * 0.68)
            let stops: [Gradient.Stop] = [
                .init(color: .clear, location: 0), .init(color: .clear, location: 0.26), .init(color: .black.opacity(0.22), location: 0.42),
                .init(color: .black.opacity(0.58), location: 0.58), .init(color: .black.opacity(0.88), location: 0.74), .init(color: .black.opacity(0.98), location: 0.88), .init(color: .black, location: 1),
            ]
            g.fill(Path(CGRect(x: -6, y: -6, width: 12, height: 12)), with: .radialGradient(Gradient(stops: stops), center: .zero, startRadius: 0, endRadius: 1))
        }
    }
}

/// Fine film grain, painted once.
private struct Grain: View {
    var body: some View {
        Canvas { ctx, size in
            var seed: UInt64 = 0x9E3779B97F4A7C15
            func next() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double((seed >> 33) & 0xFFFFF) / Double(0xFFFFF) }
            let n = Int(Double(size.width * size.height) / 90)
            for _ in 0..<min(n, 14000) {
                let x = next() * Double(size.width), y = next() * Double(size.height)
                ctx.fill(Path(CGRect(x: x, y: y, width: 1, height: 1)), with: .color(.white.opacity(0.03 + next() * 0.07)))
            }
        }
        .drawingGroup()
    }
}
