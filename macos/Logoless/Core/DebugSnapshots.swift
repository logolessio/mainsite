#if DEBUG
import AppKit
import SwiftUI

/// Development aid. With LOGOLESS_SNAPSHOT set (for example "home,campaign:0,dash:overview,menu"), the app draws each page into a picture
/// (…/Containers/io.logoless.mac/Data/tmp/logoless-snap/) and quits. Glass cannot be drawn this way, so a flat stand-in is used.
@MainActor
enum DebugSnapshots {
    static func run(_ app: AppModel) async {
        guard let list = ProcessInfo.processInfo.environment["LOGOLESS_SNAPSHOT"], !list.isEmpty else { return }
        let folder = NSTemporaryDirectory() + "logoless-snap"
        try? FileManager.default.createDirectory(atPath: folder, withIntermediateDirectories: true)
        try? await Task.sleep(for: .seconds(6))
        Snap.flat = true
        for item in list.split(separator: ",").map(String.init) {
            app.showMenu = false; app.showBell = false; app.showOnboarding = false
            if item == "signin" { await app.signIn(); print("SIGNIN phase=\(app.isSignedIn ? "signedIn" : "signedOut") me=\(app.me?.profile?.handle ?? "-") tokenSaved=\(TokenStore.load() != nil)"); continue }
            if item.hasPrefix("campaign:"), let i = Int(item.dropFirst(9)), app.campaigns.indices.contains(i) { app.route = .campaign(app.campaigns[i].id) }
            else if item.hasPrefix("dash:"), let p = DashPage(rawValue: String(item.dropFirst(5))) { app.route = .dash(p) }
            else if item.hasPrefix("onboarding:") { app.onboardingStart = Int(item.dropFirst(11)) ?? 0; app.showOnboarding = true; app.route = .home }
            else if item == "menu" { app.route = .home; app.showMenu = true }
            else if item == "bell" { app.route = .home; app.showBell = true }
            else { app.route = .home }
            await app.loadCurrent()
            await preload(app)
            try? await Task.sleep(for: .milliseconds(400))
            let r = ImageRenderer(content: ShellView().environment(app).frame(width: 1280, height: 820, alignment: .top).clipped())
            r.scale = 1
            if let img = r.nsImage, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) {
                try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: "\(folder)/\(item.replacingOccurrences(of: ":", with: "-")).png"))
            }
        }
        NSApp.terminate(nil)
    }

    private static func preload(_ app: AppModel) async {
        var urls: [URL] = app.campaigns.compactMap(\.coverURL)
        urls += app.submissions.compactMap(\.coverURL) + (app.home?.recent.compactMap(\.coverURL) ?? [])
        if let a = app.me?.avatarURL { urls.append(a) }
        for u in urls { _ = await ImageCache.shared.load(u) }
    }
}
#endif
