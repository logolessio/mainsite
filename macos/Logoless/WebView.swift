import SwiftUI
import WebKit

/// Puts the browser's web view on screen.
struct WebView: NSViewRepresentable {
    let browser: Browser

    func makeNSView(context: Context) -> WKWebView { browser.webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
