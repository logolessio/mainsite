import AppKit
import CoreText
import SwiftUI

// The site's look in native pieces: black, the Gloock headline face, and Apple's own liquid glass (macOS 26) for everything that floats.

enum Fonts {
    /// Makes Gloock (the headline face of the site, shipped inside the app) available. Called once at launch.
    static func register() {
        guard let url = Bundle.main.url(forResource: "Gloock-Regular", withExtension: "ttf") else { return }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
}

extension Font {
    static func display(_ size: CGFloat) -> Font { .custom("Gloock", size: size) }
}

extension Color {
    static let paper = Color(red: 0.953, green: 0.949, blue: 0.933)
}

/// A picture from the web, faded in. Until it arrives it is a quiet dark block (never see-through, so a trailer behind never shows).
struct Remote: View {
    let url: URL?
    var contentMode: ContentMode = .fill
    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.35))) { phase in
            if let image = phase.image {
                image.resizable().aspectRatio(contentMode: contentMode)
            } else {
                Color(white: 0.06)
            }
        }
    }
}

/// A line typed out one letter at a time, in the headline face.
struct TypedText: View {
    let text: String
    var size: CGFloat = 64
    var speed: Double = 0.028
    var onDone: () -> Void = {}
    @State private var n = 0

    /// The letters typed so far, then the rest invisibly, so the line does not move as it is typed.
    private var typedString: AttributedString {
        var a = AttributedString(String(text.prefix(n)))
        var b = AttributedString(String(text.dropFirst(n)))
        b.foregroundColor = .clear
        a.append(b)
        return a
    }

    var body: some View {
        Text(typedString)
            .font(.display(size))
            .multilineTextAlignment(.center)
            .foregroundStyle(Color.paper)
            .accessibilityLabel(text)
            .task(id: text) {
                n = 0
                for i in 1...max(1, text.count) {
                    try? await Task.sleep(for: .seconds(speed))
                    if Task.isCancelled { return }
                    n = i
                }
                onDone()
            }
    }
}

/// A company's own logo (Google, Discord, YouTube), drawn from the same vector files the website uses.
struct BrandGlyph: View {
    let name: String
    var size: CGFloat = 18
    var body: some View {
        Image(name).renderingMode(.template).resizable().scaledToFit().frame(width: size, height: size).accessibilityHidden(true)
    }
}

/// A round button of glass.
struct GlassIconButton: View {
    let symbol: String
    let label: String
    var on = false
    var size: CGFloat = 52
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size * 0.38, weight: .medium))
                .symbolVariant(on ? .fill : .none)
                .foregroundStyle(Color.paper)
                .frame(width: size, height: size)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .glassEffect(.regular.interactive(), in: .circle)
        .help(label)
        .accessibilityLabel(label)
    }
}

/// A capsule of glass holding a text field.
struct GlassField<Content: View>: View {
    var height: CGFloat = 56
    @ViewBuilder var content: () -> Content
    var body: some View {
        content()
            .padding(.horizontal, 24)
            .frame(height: height)
            .glassEffect(.regular, in: .capsule)
    }
}

extension View {
    /// A card of glass.
    func glassCard(_ radius: CGFloat = 32) -> some View { glassEffect(.regular, in: .rect(cornerRadius: radius)) }

    /// Fades with the rest of the screen's controls while a trailer plays and the mouse is still.
    func fadesWhileWatching(_ idle: Bool) -> some View {
        opacity(idle ? 0 : 1)
            .animation(.easeOut(duration: 0.7), value: idle)
            .allowsHitTesting(!idle)
    }
}

/// Settings of the window the app lives in: no title bar, a place for the pointer to be watched.
struct WindowAccessor: NSViewRepresentable {
    var configure: (NSWindow) -> Void
    func makeNSView(context: Context) -> NSView {
        let v = NSView()
        DispatchQueue.main.async { if let w = v.window { configure(w) } }
        return v
    }
    func updateNSView(_ v: NSView, context: Context) {}
}

/// A web page in a view, using the same cookies as the trailer player (so a YouTube sign-in made here is the player's too).
struct WebPanel: NSViewRepresentable {
    let view: WKWebViewBox
    func makeNSView(context: Context) -> NSView { view.web }
    func updateNSView(_ v: NSView, context: Context) {}
}

import WebKit

/// A web view with the player's settings, for pages the person uses themselves.
@MainActor
final class WKWebViewBox {
    let web: WKWebView
    init(url: URL?) {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        web = WKWebView(frame: .zero, configuration: cfg)
        web.customUserAgent = PlayerController.userAgent
        if let url { web.load(URLRequest(url: url)) }
    }
}
