import SwiftUI

struct ContentView: View {
    @Environment(Browser.self) private var browser

    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            ZStack(alignment: .bottom) {
                WebView(browser: browser)
                QuickBar()
                    .padding(.bottom, 20)
            }
            .navigationTitle(browser.title)
            .navigationSubtitle(browser.url?.host ?? "")
        }
        .toolbar {
            ToolbarItemGroup(placement: .navigation) {
                Button { browser.goBack() } label: { Label("Back", systemImage: "chevron.backward") }
                    .disabled(!browser.canGoBack)
                    .help("Back")
                Button { browser.goForward() } label: { Label("Forward", systemImage: "chevron.forward") }
                    .disabled(!browser.canGoForward)
                    .help("Forward")
            }
            ToolbarItemGroup(placement: .primaryAction) {
                Button { browser.openSearch() } label: { Label("Search", systemImage: "magnifyingglass") }
                    .help("Search, or do something (⌘K)")
                Button { browser.isLoading ? browser.stop() : browser.reload() } label: {
                    Label(browser.isLoading ? "Stop" : "Reload", systemImage: browser.isLoading ? "xmark" : "arrow.clockwise")
                }
                .help(browser.isLoading ? "Stop loading" : "Reload")
            }
            ToolbarSpacer(.fixed, placement: .primaryAction)
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Copy Link", systemImage: "link") { browser.copyLink() }
                    Button("Open in Browser", systemImage: "safari") { browser.openInBrowser() }
                    Divider()
                    Button("Home", systemImage: "house") { browser.goHome() }
                } label: {
                    Label("More", systemImage: "ellipsis")
                }
                .help("More")
            }
        }
        .frame(minWidth: 960, minHeight: 620)
    }
}
