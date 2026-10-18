import SwiftUI

/// The sidebar. On macOS 26 it floats on Liquid Glass by itself.
struct SidebarView: View {
    @Environment(Browser.self) private var browser

    var body: some View {
        @Bindable var browser = browser
        List(selection: Binding<String?>(
            get: { browser.placeID },
            set: { id in
                guard let id, let place = Places.all.first(where: { $0.id == id }) else { return }
                browser.open(place)
            }
        )) {
            ForEach(Places.groups) { group in
                Section(group.title) {
                    ForEach(group.places) { place in
                        Label(place.title, systemImage: place.symbol)
                            .tag(place.id)
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationSplitViewColumnWidth(min: 190, ideal: 220, max: 280)
    }
}
