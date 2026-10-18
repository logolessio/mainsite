import SwiftUI

/// The ready-made "looks" (lib/looks.ts on the site): a gradient picture and a matching banner. Anyone who does not upload their own gets one,
/// chosen from their handle so it is always the same, and everyone can pick another.
struct Look: Identifiable, Hashable {
    let id: String
    let name: String
    let light: Color
    let mid: Color
    let dark: Color
}

enum Looks {
    static let all: [Look] = [
        Look(id: "ember", name: "Ember", light: Color.hex("#ff7a45")!, mid: Color.hex("#8f2410")!, dark: Color.hex("#140605")!),
        Look(id: "ocean", name: "Ocean", light: Color.hex("#3cc0e0")!, mid: Color.hex("#0d4f73")!, dark: Color.hex("#02080f")!),
        Look(id: "dusk", name: "Dusk", light: Color.hex("#c77bea")!, mid: Color.hex("#40237a")!, dark: Color.hex("#0b0b1e")!),
        Look(id: "forest", name: "Forest", light: Color.hex("#7fd18a")!, mid: Color.hex("#175a30")!, dark: Color.hex("#030a05")!),
        Look(id: "rose", name: "Rose", light: Color.hex("#ff82b0")!, mid: Color.hex("#701845")!, dark: Color.hex("#120309")!),
        Look(id: "sand", name: "Sand", light: Color.hex("#efd39a")!, mid: Color.hex("#8f5f2e")!, dark: Color.hex("#1a1008")!),
        Look(id: "violet", name: "Violet", light: Color.hex("#8d9bff")!, mid: Color.hex("#2f349a")!, dark: Color.hex("#06061a")!),
        Look(id: "mono", name: "Mono", light: Color.hex("#e4e4e8")!, mid: Color.hex("#505058")!, dark: Color.hex("#050505")!),
    ]

    static func byID(_ id: String) -> Look? { all.first { $0.id == id } }

    /// The same look for the same seed, every time (the site's hash, on UTF-16 units).
    static func forSeed(_ seed: String) -> Look {
        var h: UInt32 = 0
        for u in seed.utf16 { h = h &* 31 &+ UInt32(u) }
        return all[Int(h) % all.count]
    }

    /// Pictures kept as a look are stored as "g:<id>"; uploads are stored by their own id.
    static func key(_ id: String) -> String { "g:\(id)" }
}

/// A look drawn as a picture: a soft glow over a gradient, with the person's first letter on an avatar.
struct LookArt: View {
    enum Kind { case avatar, banner }
    let look: Look
    var kind: Kind = .avatar
    var letter: String?

    var body: some View {
        GeometryReader { geo in
            let s = max(geo.size.width, geo.size.height)
            ZStack {
                LinearGradient(colors: [look.mid, look.dark], startPoint: .topLeading, endPoint: kind == .avatar ? UnitPoint(x: 0.7, y: 1) : .bottomTrailing)
                RadialGradient(colors: [look.light, look.light.opacity(0)], center: kind == .avatar ? UnitPoint(x: 0.25, y: 0.15) : UnitPoint(x: 0.12, y: 0), startRadius: 0, endRadius: kind == .avatar ? s * 0.95 : s * 0.75)
                if kind == .avatar, let letter, !letter.isEmpty {
                    Text(letter.prefix(1).uppercased()).font(.system(size: geo.size.height * 0.46, weight: .semibold)).foregroundStyle(.white.opacity(0.92))
                }
            }
        }
    }
}

/// A profile's banner: its own picture, a plain colour, or one of the presets (the looks, and a few more).
struct BannerArt: View {
    let kind: String?
    let value: String?

    var body: some View {
        switch kind {
        case "image":
            RemoteImage(url: Config.resolve(value), seed: value ?? "banner")
        case "color":
            (Color.hex(value) ?? Color(white: 0.06))
        default:
            preset(value ?? "noir")
        }
    }

    @ViewBuilder private func preset(_ id: String) -> some View {
        if let look = Looks.byID(id) {
            LookArt(look: look, kind: .banner)
        } else if id == "chrome" {
            LinearGradient(stops: [.init(color: Color.hex("#2b2b2e")!, location: 0), .init(color: Color.hex("#d9d9de")!, location: 0.22), .init(color: Color.hex("#4a4a50")!, location: 0.45), .init(color: Color.hex("#f4f4f6")!, location: 0.6), .init(color: Color.hex("#34343a")!, location: 0.8), .init(color: Color.hex("#111111")!, location: 1)], startPoint: .topLeading, endPoint: .bottomTrailing)
        } else if id == "grid" || id == "halftone" {
            Color(white: 0.02).overlay(Canvas { ctx, size in
                let step = id == "grid" ? 28.0 : 12.0
                var x = 0.0
                while x < Double(size.width) {
                    var y = 0.0
                    while y < Double(size.height) {
                        if id == "grid" {
                            ctx.fill(Path(CGRect(x: x, y: y, width: 1, height: step)), with: .color(.white.opacity(0.07)))
                            ctx.fill(Path(CGRect(x: x, y: y, width: step, height: 1)), with: .color(.white.opacity(0.07)))
                        } else {
                            ctx.fill(Path(ellipseIn: CGRect(x: x + step / 2 - 1.4, y: y + step / 2 - 1.4, width: 2.8, height: 2.8)), with: .color(.white.opacity(0.22)))
                        }
                        y += step
                    }
                    x += step
                }
            })
        } else {
            LookArt(look: Looks.byID("mono")!, kind: .banner).overlay(Color.black.opacity(0.55))
        }
    }
}
