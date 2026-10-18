import SwiftUI

#if os(macOS)
import AppKit
typealias PlatformImage = NSImage
#else
import UIKit
typealias PlatformImage = UIImage
#endif

extension Image {
    init(platform image: PlatformImage) {
        #if os(macOS)
        self.init(nsImage: image)
        #else
        self.init(uiImage: image)
        #endif
    }
}

/// The few things that differ between the Mac and the iPhone.
@MainActor
enum Platform {
    static func open(_ url: URL) {
        #if os(macOS)
        NSWorkspace.shared.open(url)
        #else
        UIApplication.shared.open(url)
        #endif
    }

    static func copy(_ text: String) {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #else
        UIPasteboard.general.string = text
        #endif
    }

    static func paste() -> String? {
        #if os(macOS)
        NSPasteboard.general.string(forType: .string)
        #else
        UIPasteboard.general.string
        #endif
    }

    static var deviceName: String {
        #if os(macOS)
        Host.current().localizedName ?? "Mac"
        #else
        UIDevice.current.name
        #endif
    }

    static var isActive: Bool {
        #if os(macOS)
        NSApp.isActive
        #else
        UIApplication.shared.applicationState == .active
        #endif
    }

    /// A small tap under the finger (a phone only).
    enum Tap { case tick, step, success }
    static func tap(_ kind: Tap = .tick) {
        #if os(iOS)
        switch kind {
        case .tick: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .step: UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        case .success: UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        #endif
    }

    static func setBadge(_ n: Int) {
        #if os(macOS)
        NSApp?.dockTile.badgeLabel = n > 0 ? String(n) : nil
        #else
        UNUserNotificationCenter.current().setBadgeCount(n)
        #endif
    }
}

extension View {
    /// Escape on the Mac. (A phone has no such key; the system's back swipe does the job.)
    func onExit(perform action: @escaping () -> Void) -> some View {
        #if os(macOS)
        onExitCommand(perform: action)
        #else
        self
        #endif
    }
}

#if !os(macOS)
import UserNotifications
#endif
