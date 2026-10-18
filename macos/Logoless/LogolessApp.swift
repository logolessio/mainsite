import SwiftUI
import WebKit

@main
struct LogolessApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var browser = Browser()

    var body: some Scene {
        WindowGroup("logoless") {
            ContentView()
                .environment(browser)
                .preferredColorScheme(.dark)
                .containerBackground(.black, for: .window)
        }
        .defaultSize(width: 1280, height: 820)
        .commands {
            // one window, one web view: there is no "new" anything
            CommandGroup(replacing: .newItem) {}

            CommandGroup(after: .textEditing) {
                Button("Find…") { browser.find() }
                    .keyboardShortcut("f", modifiers: .command)
            }

            CommandMenu("Navigate") {
                Button("Back") { browser.goBack() }.keyboardShortcut("[", modifiers: .command)
                Button("Forward") { browser.goForward() }.keyboardShortcut("]", modifiers: .command)
                Button("Reload") { browser.reload() }.keyboardShortcut("r", modifiers: .command)
                Button("Home") { browser.goHome() }.keyboardShortcut("h", modifiers: [.command, .shift])
                Divider()
                Button("Search or Do Something") { browser.openSearch() }.keyboardShortcut("k", modifiers: .command)
                Divider()
                Button("Campaigns") { browser.open(path: "/") }.keyboardShortcut("1", modifiers: .command)
                Button("Dashboard") { browser.open(path: "/dashboard") }.keyboardShortcut("2", modifiers: .command)
                Button("Earnings") { browser.open(path: "/dashboard/earnings") }.keyboardShortcut("3", modifiers: .command)
                Button("Profile") { browser.open(path: "/dashboard/profile") }.keyboardShortcut("4", modifiers: .command)
                Button("Settings") { browser.open(path: "/dashboard/settings") }.keyboardShortcut("5", modifiers: .command)
                Divider()
                Button("Copy Link") { browser.copyLink() }.keyboardShortcut("c", modifiers: [.command, .shift])
                Button("Open in Browser") { browser.openInBrowser() }.keyboardShortcut("o", modifiers: [.command, .shift])
            }

            CommandGroup(replacing: .toolbar) {
                Button("Zoom In") { browser.zoomIn() }.keyboardShortcut("+", modifiers: .command)
                Button("Zoom Out") { browser.zoomOut() }.keyboardShortcut("-", modifiers: .command)
                Button("Actual Size") { browser.zoomReset() }.keyboardShortcut("0", modifiers: .command)
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationDidFinishLaunching(_ notification: Notification) {
        #if DEBUG
        // development aid: with LOGOLESS_SNAPSHOT set, a picture of the window and of the page is written to the app's temporary folder, then it quits
        if ProcessInfo.processInfo.environment["LOGOLESS_SNAPSHOT"] != nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { Self.snapshot(into: NSTemporaryDirectory() + "logoless-snap") }
        }
        #endif
    }

    #if DEBUG
    @MainActor private static func snapshot(into folder: String) {
        guard let window = NSApp.windows.first(where: { $0.contentView != nil && $0.isVisible || $0.contentView != nil }), let view = window.contentView else { NSApp.terminate(nil); return }
        try? FileManager.default.createDirectory(atPath: folder, withIntermediateDirectories: true)
        if let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) {
            view.cacheDisplay(in: view.bounds, to: rep)
            try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: folder + "/window.png"))
        }
        if let web = findWebView(view) {
            web.takeSnapshot(with: nil) { image, _ in
                if let image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) {
                    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: folder + "/page.png"))
                }
                NSApp.terminate(nil)
            }
        } else { NSApp.terminate(nil) }
    }

    @MainActor private static func findWebView(_ v: NSView) -> WKWebView? {
        if let w = v as? WKWebView { return w }
        for s in v.subviews { if let w = findWebView(s) { return w } }
        return nil
    }
    #endif
}
