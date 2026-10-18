import AppKit
import WebKit

/// Everything the web page asks the app to do: where links go, file pickers, alerts, downloads.
final class WebDelegate: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    private var downloadDestinations: [ObjectIdentifier: URL] = [:]

    // MARK: Links

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        if navigationAction.shouldPerformDownload { return decisionHandler(.download) }
        // an address that is not the site or one of its sign-in pages opens in the browser, but only when a person pressed a link to it
        if navigationAction.navigationType == .linkActivated, !Site.staysInApp(url), let url {
            if url.scheme == "https" || url.scheme == "http" || url.scheme == "mailto" { NSWorkspace.shared.open(url) }
            return decisionHandler(.cancel)
        }
        if let url, url.scheme == "mailto" || url.scheme == "tel" {
            NSWorkspace.shared.open(url)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    /// A link that wants a new window (target="_blank", window.open): the site's own pages and sign-in open in this window, anything else in the browser.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if Site.staysInApp(url) {
            webView.load(navigationAction.request)
        } else {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // MARK: Files

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.canChooseFiles = true
        if let window = webView.window {
            panel.beginSheetModal(for: window) { response in completionHandler(response == .OK ? panel.urls : nil) }
        } else {
            completionHandler(panel.runModal() == .OK ? panel.urls : nil)
        }
    }

    // MARK: Alerts (the site asks "leave without saving?" and similar)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }

    // MARK: Downloads (exports from the owner dashboard)

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        guard let folder = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first else { return completionHandler(nil) }
        var target = folder.appendingPathComponent(suggestedFilename)
        var n = 1
        while FileManager.default.fileExists(atPath: target.path) {
            let base = (suggestedFilename as NSString).deletingPathExtension
            let ext = (suggestedFilename as NSString).pathExtension
            target = folder.appendingPathComponent(ext.isEmpty ? "\(base) \(n)" : "\(base) \(n).\(ext)")
            n += 1
        }
        downloadDestinations[ObjectIdentifier(download)] = target
        completionHandler(target)
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let target = downloadDestinations.removeValue(forKey: ObjectIdentifier(download)) { NSWorkspace.shared.activateFileViewerSelecting([target]) }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadDestinations.removeValue(forKey: ObjectIdentifier(download))
    }
}
