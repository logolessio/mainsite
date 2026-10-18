import AppKit
import Observation
import WebKit

/// The one web view the whole app shows, and what the interface needs to know about it.
@MainActor
@Observable
final class Browser {
    @ObservationIgnored let webView: WKWebView
    @ObservationIgnored private let delegate = WebDelegate()
    @ObservationIgnored private var observations: [NSKeyValueObservation] = []

    var url: URL?
    var title = "logoless"
    var canGoBack = false
    var canGoForward = false
    var isLoading = false
    var zoom = 1.0

    /// The sidebar place and the glass-bar place that match the page on screen.
    var placeID: String?
    var quickID: String?

    private static let lastKey = "lastURL"

    init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default() // keeps the sign-in between launches
        // look like Safari to the sign-in pages (some refuse an unnamed web view), and tell the site this is the app
        config.applicationNameForUserAgent = "Version/26.0 Safari/605.1.15 LogolessMac/1.0"
        config.preferences.isElementFullscreenEnabled = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = delegate
        webView.uiDelegate = delegate
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        webView.underPageBackgroundColor = .black
        if #available(macOS 13.3, *) { webView.isInspectable = true }

        observations = [
            webView.observe(\.url) { [weak self] _, _ in MainActor.assumeIsolated { self?.sync() } },
            webView.observe(\.title) { [weak self] _, _ in MainActor.assumeIsolated { self?.sync() } },
            webView.observe(\.canGoBack) { [weak self] _, _ in MainActor.assumeIsolated { self?.sync() } },
            webView.observe(\.canGoForward) { [weak self] _, _ in MainActor.assumeIsolated { self?.sync() } },
            webView.observe(\.isLoading) { [weak self] _, _ in MainActor.assumeIsolated { self?.sync() } },
        ]

        let start = UserDefaults.standard.string(forKey: Self.lastKey).flatMap(URL.init(string:)).flatMap { Site.isSite($0.host) ? $0 : nil } ?? Site.home
        webView.load(URLRequest(url: start))
    }

    private func sync() {
        url = webView.url
        title = (webView.title?.isEmpty == false ? webView.title : nil) ?? "logoless"
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        isLoading = webView.isLoading
        let path = url?.path ?? "/"
        placeID = Places.match(host: url?.host, path: path)?.id
        quickID = Quick.match(host: url?.host, path: path)?.id
        if let url, Site.isSite(url.host) { UserDefaults.standard.set(url.absoluteString, forKey: Self.lastKey) }
    }

    // MARK: Going places

    func open(_ place: Place) { webView.load(URLRequest(url: place.url)) }
    func open(path: String) { webView.load(URLRequest(url: Site.url(path: path))) }
    func goHome() { webView.load(URLRequest(url: Site.home)) }
    func goBack() { webView.goBack() }
    func goForward() { webView.goForward() }
    func reload() { webView.reload() }
    func stop() { webView.stopLoading() }

    func copyLink() {
        guard let url else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(url.absoluteString, forType: .string)
    }

    func openInBrowser() {
        if let url { NSWorkspace.shared.open(url) }
    }

    /// The site's own search and command box (it answers to ⌘K).
    func openSearch() {
        webView.evaluateJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))")
    }

    func zoomIn() { setZoom(min(3, zoom + 0.1)) }
    func zoomOut() { setZoom(max(0.5, zoom - 0.1)) }
    func zoomReset() { setZoom(1) }
    private func setZoom(_ value: Double) {
        zoom = value
        webView.pageZoom = value
    }

    /// ⌘F: the web view's own find bar.
    func find() {
        let item = NSMenuItem()
        item.tag = NSTextFinder.Action.showFindInterface.rawValue
        NSApp.sendAction(#selector(NSResponder.performTextFinderAction(_:)), to: webView, from: item)
    }
}
