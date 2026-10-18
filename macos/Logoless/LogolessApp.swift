import SwiftUI

@main
struct LogolessApp: App {
    #if os(macOS)
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    #endif
    @State private var app = AppModel()

    init() { Fonts.register() }

    var body: some Scene {
        #if os(macOS)
        WindowGroup("logoless") {
            ShellView()
                .environment(app)
                .containerBackground(.black, for: .window)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1280, height: 820)
        .commands { MacCommands(app: app) }
        #else
        WindowGroup {
            ShellView()
                .environment(app)
                .preferredColorScheme(.dark)
        }
        #endif
    }
}

#if os(macOS)
struct MacCommands: Commands {
    let app: AppModel

    var body: some Commands {
        CommandGroup(replacing: .newItem) {}

        CommandMenu("Go") {
            Button("Back") { app.back() }.keyboardShortcut("[", modifiers: .command).disabled(!app.canGoBack)
            Button("Jump to…") { app.showJump = true }.keyboardShortcut("k", modifiers: .command)
            Divider()
            Button("Campaigns") { app.go(.home) }.keyboardShortcut("1", modifiers: .command)
            Button("Overview") { app.go(.dash(.overview)) }.keyboardShortcut("2", modifiers: .command)
            Button("Submissions") { app.go(.dash(.submissions)) }.keyboardShortcut("3", modifiers: .command)
            Button("Earnings") { app.go(.dash(.earnings)) }.keyboardShortcut("4", modifiers: .command)
            Button("Profile") { app.go(.dash(.profile)) }.keyboardShortcut("5", modifiers: .command)
            Button("Settings") { app.go(.dash(.settings)) }.keyboardShortcut("6", modifiers: .command)
            Button("Notifications") { app.go(.dash(.notifications)) }.keyboardShortcut("7", modifiers: .command)
            if app.isAdmin { Button("Queue") { app.go(.dash(.queue)) }.keyboardShortcut("8", modifiers: .command) }
            Divider()
            Button("Refresh") { Task { await app.refreshCurrent() } }.keyboardShortcut("r", modifiers: .command)
            Button("Open This on logoless.io") { app.openOnWeb() }.keyboardShortcut("o", modifiers: [.command, .shift])
        }

        CommandMenu("Account") {
            if app.isSignedIn { Button("Sign Out") { Task { await app.signOut() } } }
            else { Button("Sign In…") { Task { await app.signIn() } } }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
#endif
