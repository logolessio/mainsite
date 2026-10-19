import SwiftUI

@main
struct ScrollApp: App {
    @State private var model = ScrollModel()

    init() {
        Fonts.register()
        URLCache.shared = URLCache(memoryCapacity: 128 << 20, diskCapacity: 512 << 20) // posters and backdrops are kept between launches
    }

    var body: some Scene {
        WindowGroup("scroll") {
            RootView()
                .environment(model)
                .containerBackground(.black, for: .window)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1360, height: 860)
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandMenu("Trailers") {
                Button("Next Trailer") { model.step(1) }.keyboardShortcut(.downArrow, modifiers: [.command])
                Button("Previous Trailer") { model.step(-1) }.keyboardShortcut(.upArrow, modifiers: [.command])
                Button(model.paused ? "Play" : "Pause") { model.togglePause() }.keyboardShortcut("p", modifiers: [.command])
                Divider()
                Button("Search…") { model.showSearch.toggle() }.keyboardShortcut("k", modifiers: [.command])
                Button("Watch") { model.tab = .watch }.keyboardShortcut("1", modifiers: [.command])
                Button("Your Account") { model.tab = .account }.keyboardShortcut("2", modifiers: [.command])
                Button("Settings") { model.tab = .settings }.keyboardShortcut("3", modifiers: [.command])
            }
        }
    }
}
