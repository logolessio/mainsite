import AppKit
import SwiftUI

/// The whole window: setting up if you are new, then the trailers. Also watches the keyboard and the pointer for the app.
struct RootView: View {
    @Environment(ScrollModel.self) private var model
    @State private var monitor: Any?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch model.phase {
            case .launching: ProgressView().controlSize(.large).tint(.white)
            case .onboarding: OnboardingView().transition(.opacity)
            case .main: MainView().transition(.opacity)
            }
        }
        .animation(.smooth(duration: 0.6), value: model.phase)
        .preferredColorScheme(.dark)
        .background(WindowAccessor { w in
            w.acceptsMouseMovedEvents = true
            w.titlebarAppearsTransparent = true
            w.titleVisibility = .hidden
            w.isMovableByWindowBackground = true
            w.minSize = NSSize(width: 980, height: 640)
            w.backgroundColor = .black
        })
        .task { await model.start() }
        .onChange(of: model.signature) { model.syncPlayer() }
        .onChange(of: model.idleWatch) { model.wake() }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didResignActiveNotification)) { _ in model.windowActive = false }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) { _ in model.windowActive = true }
        .onAppear { install() }
        .onDisappear { if let monitor { NSEvent.removeMonitor(monitor); self.monitor = nil } }
    }

    /// Any movement, press or key brings the screen's controls back; the keys do what the site's keys do.
    private func install() {
        guard monitor == nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDown, .keyDown, .scrollWheel]) { event in
            Task { @MainActor in model.wake() }
            guard event.type == .keyDown else { return event }
            return handle(event) ? nil : event
        }
    }

    private func handle(_ e: NSEvent) -> Bool {
        guard model.phase == .main else { return false }
        if let r = e.window?.firstResponder, r is NSText || r is NSTextField || r is NSTextView { // typing somewhere
            if e.keyCode == 53 { Task { @MainActor in closeTopOverlay() }; return true }
            return false
        }
        let mods = e.modifierFlags.intersection([.command, .control, .option])
        let ch = (e.charactersIgnoringModifiers ?? "").lowercased()
        if mods == .command, ch == "k" { model.showSearch.toggle(); return true }
        guard mods.isEmpty else { return false }
        if e.keyCode == 53 { closeTopOverlay(); return true }
        guard model.tab == .watch, model.personID == nil, !model.showSearch, !model.showWhere else { return false }
        switch (e.keyCode, ch) {
        case (125, _), (_, "j"), (121, _): model.step(1)
        case (126, _), (_, "k"), (116, _): model.step(-1)
        case (49, _): model.togglePause()
        case (_, "m"): model.muted.toggle()
        case (_, "l"): if let c = model.current { Task { await model.toggle("like", c) } }
        case (_, "s"): if let c = model.current { Task { await model.toggle("save", c) } }
        case (_, "w"): if model.current != nil { model.showWhere = true }
        case (_, "f"): NSApp.keyWindow?.toggleFullScreen(nil)
        default: return false
        }
        return true
    }

    private func closeTopOverlay() {
        if model.showSearch { model.showSearch = false }
        else if model.showWhere { model.showWhere = false }
        else if model.personID != nil { model.personID = nil }
        else if model.tab != .watch { withAnimation(.smooth(duration: 0.4)) { model.tab = .watch } }
    }
}
