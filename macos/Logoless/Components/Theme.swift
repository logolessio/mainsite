import CoreText
import SwiftUI

/// The site's look: black, warm paper white, hairline borders, Gloock for the big words, glass for what floats.
extension Color {
    static let paper = Color(red: 0.953, green: 0.949, blue: 0.933)
    static let ink = Color.black
    static let good = Color(red: 0.45, green: 0.85, blue: 0.62)
    static let warn = Color(red: 0.96, green: 0.78, blue: 0.38)
    static let bad = Color(red: 0.95, green: 0.45, blue: 0.42)
    static func hex(_ s: String?) -> Color? {
        guard var h = s?.trimmingCharacters(in: .whitespaces), !h.isEmpty else { return nil }
        if h.hasPrefix("#") { h.removeFirst() }
        guard h.count == 6, let v = UInt32(h, radix: 16) else { return nil }
        return Color(red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255)
    }
}

extension ShapeStyle where Self == Color {
    static var mute: Color { Color.paper.opacity(0.55) }
    static var faint: Color { Color.paper.opacity(0.35) }
    static var line: Color { Color.white.opacity(0.10) }
}

enum Fonts {
    /// Makes Gloock (the site's heading face, shipped inside the app) available. Called once at launch.
    static func register() {
        guard let url = Bundle.main.url(forResource: "Gloock-Regular", withExtension: "ttf") else { return }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
}

extension Font {
    /// Headings and big figures: Gloock, as on the website.
    static func display(_ size: CGFloat) -> Font { .custom("Gloock", size: size) }
}

enum Radius {
    static let card: CGFloat = 22
    static let panel: CGFloat = 32
    static let cover: CGFloat = 22
    static let chip: CGFloat = 14
}

/// Set while the app is drawing itself into a picture for a layout check (glass cannot be drawn that way, so a flat stand-in is used).
enum Snap { nonisolated(unsafe) static var flat = false }

private struct Pane<S: InsettableShape>: ViewModifier {
    let shape: S
    var tint: Color?
    var interactive: Bool
    func body(content: Content) -> some View {
        if Snap.flat {
            content.background(tint ?? Color.white.opacity(0.10), in: shape).overlay(shape.strokeBorder(Color.white.opacity(0.12)))
        } else {
            content.glassEffect(Self.glass(tint: tint, interactive: interactive), in: shape)
        }
    }
    static func glass(tint: Color?, interactive: Bool) -> Glass {
        var g = Glass.regular
        if let tint { g = g.tint(tint) }
        if interactive { g = g.interactive() }
        return g
    }
}

extension View {
    /// A pane of Liquid Glass in the given shape.
    func pane<S: InsettableShape>(_ shape: S, tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(Pane(shape: shape, tint: tint, interactive: interactive))
    }
}

/// A bordered dark card, as the website draws its panels.
struct Card<Content: View>: View {
    var padding: CGFloat = 22
    var radius: CGFloat = Radius.card
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Color.line))
    }
}

struct Eyebrow: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).font(.system(size: 13)).foregroundStyle(.mute) }
}

/// A page's big title with the line under it, then a hairline (the website's page header).
struct PageTitle: View {
    let title: String
    var subtitle: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title).font(.display(64)).foregroundStyle(Color.paper).lineLimit(1).minimumScaleFactor(0.5)
            if let subtitle { Text(subtitle).font(.system(size: 16)).foregroundStyle(.mute).fixedSize(horizontal: false, vertical: true).frame(maxWidth: 560, alignment: .leading) }
            Rectangle().fill(Color.line).frame(height: 1).padding(.top, 14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct StatusPill: View {
    let text: String
    let tint: Color
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(tint.opacity(0.14), in: Capsule())
    }
}

extension SubmissionState {
    var tint: Color { self == .approved ? .good : self == .rejected ? .bad : .warn }
}

extension String {
    var platformName: String {
        switch lowercased() {
        case "tiktok": "TikTok"
        case "youtube": "YouTube"
        case "instagram": "Instagram"
        default: capitalized
        }
    }
    /// The logo's name in the asset catalog (white, as on the site).
    var platformLogo: String? {
        switch lowercased() {
        case "tiktok", "youtube", "instagram": lowercased()
        default: nil
        }
    }
}

struct PlatformMark: View {
    let platform: String
    var size: CGFloat = 14
    var body: some View {
        if let n = platform.platformLogo { Image(n).renderingMode(.template).resizable().scaledToFit().frame(width: size, height: size) }
        else { Image(systemName: "link").font(.system(size: size - 2)) }
    }
}

/// A placeholder cover: shown while a picture loads and in offline layout checks.
struct CoverFill: View {
    let seed: String
    var body: some View {
        let h = Double(seed.unicodeScalars.reduce(7) { ($0 &* 31 &+ Int($1.value)) % 360 }) / 360
        LinearGradient(colors: [Color(hue: h, saturation: 0.45, brightness: 0.55), Color(hue: (h + 0.12).truncatingRemainder(dividingBy: 1), saturation: 0.6, brightness: 0.22)], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

@MainActor
final class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSURL, NSImage>()
    func image(_ url: URL) -> NSImage? { cache.object(forKey: url as NSURL) }
    func load(_ url: URL) async -> NSImage? {
        if let i = image(url) { return i }
        guard let (data, res) = try? await URLSession.shared.data(from: url), (res as? HTTPURLResponse)?.statusCode == 200, let img = NSImage(data: data) else { return nil }
        cache.setObject(img, forKey: url as NSURL)
        return img
    }
}

/// A picture from the site. Shows a soft colour until it arrives, then fades in. Pictures are kept, so coming back to a page does not reload them.
struct RemoteImage: View {
    let url: URL?
    var seed = ""
    @State private var loaded: NSImage?

    var body: some View {
        ZStack {
            CoverFill(seed: seed.isEmpty ? (url?.absoluteString ?? "x") : seed)
            if let img = loaded ?? url.flatMap({ ImageCache.shared.image($0) }) {
                Image(nsImage: img).resizable().scaledToFill().transition(.opacity)
            }
        }
        .clipped()
        .task(id: url) {
            guard let url, ImageCache.shared.image(url) == nil else { return }
            let img = await ImageCache.shared.load(url)
            withAnimation(.easeOut(duration: 0.25)) { loaded = img }
        }
    }
}

extension Date {
    var short: String { formatted(.dateTime.month(.abbreviated).day().year()) }
    var relative: String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        return f.localizedString(for: self, relativeTo: .now)
    }
}

/// The black the site sits on, with its soft glow.
struct SiteBackground: View {
    var body: some View {
        ZStack {
            Color.black
            RadialGradient(colors: [Color.white.opacity(0.075), .clear], center: .init(x: 0.5, y: 0.02), startRadius: 0, endRadius: 560)
            RadialGradient(colors: [Color.white.opacity(0.035), .clear], center: .init(x: 0.85, y: 0.6), startRadius: 0, endRadius: 420)
        }
        .ignoresSafeArea()
    }
}
