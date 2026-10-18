import SwiftUI
import WebKit

/// A page of the website shown inside the app, for every page that has no screen of its own (pricing, the brand and owner dashboards, legal pages,
/// public profiles...). It is signed in as the person (see /app/web on the site), has no browser around it, and the site's own top bar is hidden
/// because the app draws that. Links to a page the app has its own screen for open that screen.
struct WebPageView: View {
    @Environment(AppModel.self) private var app
    let path: String
    @State private var loading = true
    @State private var failed: String?
    @State private var reload = 0

    var body: some View {
        ZStack {
            WebHost(path: path, reload: reload, app: app, loading: $loading, failed: $failed)
                .opacity(loading && failed == nil ? 0 : 1)
                .animation(.easeOut(duration: 0.3), value: loading)
            if loading && failed == nil { ProgressView().controlSize(.large).tint(Color.paper) }
            if let failed {
                VStack(spacing: 16) {
                    Text("That page did not open").font(.display(34)).foregroundStyle(Color.paper)
                    Text(failed).font(.system(size: 15)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 380)
                    PaperPill("Try again") { self.failed = nil; loading = true; reload += 1 }
                }
                .padding(30)
            }
        }
        #if os(macOS)
        .padding(.top, app.route.isFullWeb ? 28 : 0) // the window's buttons float over the top-left corner
        #endif
        .onDisappear { app.webBack = nil }
    }
}

private let appScript = """
(function () {
  var root = document.documentElement;
  root.setAttribute('data-app', '1');
  var NATIVE = [/^\\/?$/, /^\\/campaign\\/[^\\/]+\\/?$/, /^\\/dashboard(\\/(overview|submissions|earnings|payouts|profile|achievements|saved|settings|notifications))?\\/?$/, /^\\/login\\/?$/, /^\\/signup\\/?$/, /^\\/onboarding\\/?$/];
  function isNative(p) { for (var i = 0; i < NATIVE.length; i++) if (NATIVE[i].test(p)) return true; return false; }
  function post(msg) { try { window.webkit.messageHandlers.logoless.postMessage(msg); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || e.defaultPrevented) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin) return;
    if (isNative(u.pathname)) { e.preventDefault(); e.stopPropagation(); post({ type: 'native', path: u.pathname + u.search }); }
  }, true);
  function report() { post({ type: 'path', path: location.pathname + location.search }); }
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () { var r = orig.apply(this, arguments); setTimeout(report, 0); return r; };
  });
  window.addEventListener('popstate', report);
})();
"""

#if os(macOS)
private typealias Representable = NSViewRepresentable
#else
private typealias Representable = UIViewRepresentable
#endif

private struct WebHost: Representable {
    let path: String
    let reload: Int
    let app: AppModel
    @Binding var loading: Bool
    @Binding var failed: String?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    private func make(_ c: Coordinator) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.applicationNameForUserAgent = "LogolessApp/1.0"
        cfg.userContentController.add(c, name: "logoless")
        cfg.userContentController.addUserScript(WKUserScript(source: appScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.navigationDelegate = c
        wv.uiDelegate = c
        #if os(macOS)
        wv.setValue(false, forKey: "drawsBackground")
        wv.allowsMagnification = false
        #else
        wv.isOpaque = false
        wv.backgroundColor = .black
        wv.scrollView.backgroundColor = .black
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        #endif
        c.web = wv
        c.start(path)
        return wv
    }

    func updateCoordinator(_ c: Coordinator) {
        c.parent = self
        if c.lastReload != reload { c.lastReload = reload; c.start(path) }
    }

    #if os(macOS)
    func makeNSView(context: Context) -> WKWebView { make(context.coordinator) }
    func updateNSView(_ v: WKWebView, context: Context) { updateCoordinator(context.coordinator) }
    #else
    func makeUIView(context: Context) -> WKWebView { make(context.coordinator) }
    func updateUIView(_ v: WKWebView, context: Context) { updateCoordinator(context.coordinator) }
    #endif

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: WebHost
        weak var web: WKWebView?
        var lastReload = 0
        var after: URL?
        init(_ p: WebHost) { parent = p }

        func start(_ path: String) {
            parent.loading = true
            parent.failed = nil
            parent.app.webBack = { [weak self] in
                guard let wv = self?.web, wv.canGoBack else { return false }
                wv.goBack()
                return true
            }
            Task { [weak self] in
                guard let self else { return }
                // another address on the site (the owner dashboard): sign in on this address first, then go there
                if path.hasPrefix("http"), let target = URL(string: path) {
                    after = target
                    web?.load(URLRequest(url: await parent.app.webURL(for: "/")))
                } else {
                    after = nil
                    web?.load(URLRequest(url: await parent.app.webURL(for: path)))
                }
            }
        }

        private func isSite(_ url: URL) -> Bool {
            guard let h = url.host?.lowercased(), let base = Config.base.host?.lowercased() else { return false }
            return h == base || h.hasSuffix("." + base) || h == "logoless.io" || h.hasSuffix(".logoless.io")
        }

        /// Hands a path to the app if it has its own screen for it. Returns true when it did.
        private func routeNatively(_ path: String) -> Bool {
            let app = parent.app
            let bare = path.components(separatedBy: CharacterSet(charactersIn: "?#"))[0]
            if bare == "/login" || bare == "/signup" { Task { await app.signIn() }; return true }
            if bare == "/onboarding" {
                let role = URLComponents(string: "x:" + path)?.queryItems?.first(where: { $0.name == "role" })?.value
                app.beginOnboarding(role: role)
                return true
            }
            if let r = app.nativeRoute(forPath: path) { app.go(r); return true }
            return false
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = action.request.url else { return .cancel }
            if ["about", "blob", "data", "javascript"].contains(url.scheme ?? "") { return .allow }
            if url.scheme == "mailto" || url.scheme == "tel" { Platform.open(url); return .cancel }
            if isSite(url) {
                if url.path.hasPrefix("/app/web") || url.path.hasPrefix("/api/") { return .allow }
                if action.navigationType == .linkActivated || action.navigationType == .formSubmitted {
                    let q = url.query.map { "?" + $0 } ?? ""
                    if routeNatively(url.path + q) { return .cancel }
                }
                return .allow
            }
            if action.targetFrame?.isMainFrame ?? true { Platform.open(url); return .cancel }
            return .allow
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isSite(url) { webView.load(URLRequest(url: url)) } else { Platform.open(url) }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if let next = after { after = nil; webView.load(URLRequest(url: next)); return }
            parent.loading = false
            #if DEBUG
            webView.evaluateJavaScript("[location.pathname, document.documentElement.dataset.app, (document.querySelector('[data-site-nav]') ? getComputedStyle(document.querySelector('[data-site-nav]')).display : 'no-nav'), document.title].join(' | ')") { r, _ in
                fputs("WEBPAGE \(r ?? "?")\n", stderr)
            }
            #endif
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail(error) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail(error) }

        private func fail(_ error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            parent.loading = false
            parent.failed = "Check your connection and try again."
        }

        func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let type = body["type"] as? String, let path = body["path"] as? String else { return }
            if type == "native" { _ = routeNatively(path) }
            else if type == "path" { _ = routeNatively(path) } // the page moved itself to a path the app has a screen for
        }

        // file inputs and alerts
        #if os(macOS)
        func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo) async -> [URL]? {
            let panel = NSOpenPanel()
            panel.allowsMultipleSelection = parameters.allowsMultipleSelection
            panel.canChooseDirectories = parameters.allowsDirectories
            return panel.runModal() == .OK ? panel.urls : nil
        }
        #endif
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
            #if os(macOS)
            let a = NSAlert(); a.messageText = message; a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
            return a.runModal() == .alertFirstButtonReturn
            #else
            return await withCheckedContinuation { cont in
                let ac = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                ac.addAction(UIAlertAction(title: "OK", style: .default) { _ in cont.resume(returning: true) })
                ac.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in cont.resume(returning: false) })
                UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first?.rootViewController?.present(ac, animated: true)
            }
            #endif
        }
    }
}
