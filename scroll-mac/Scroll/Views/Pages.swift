import SwiftUI

/// A full-screen page over the trailers (account, settings, a person, search).
struct PageShell<Content: View>: View {
    var close: (() -> Void)?
    @ViewBuilder var content: () -> Content
    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            ScrollView {
                content()
                    .frame(maxWidth: 1100)
                    .padding(.horizontal, 56)
                    .padding(.top, 120)
                    .padding(.bottom, 170)
                    .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            if let close {
                Button("Close", action: close).buttonStyle(.glass).controlSize(.large).padding(.top, 30).padding(.trailing, 34)
            }
        }
        .foregroundStyle(Color.paper)
    }
}

/// A poster with its title, that plays the trailer when pressed.
struct PosterCard: View {
    let m: Mini
    @Environment(ScrollModel.self) private var model
    @State private var busy = false
    var body: some View {
        Button {
            busy = true
            Task { _ = await model.openMovie(m.id); busy = false }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Remote(url: Config.poster(m.p, 342)).aspectRatio(2.0 / 3.0, contentMode: .fit).clipShape(.rect(cornerRadius: 16))
                    .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(.white.opacity(0.1)) }
                    .overlay { if busy { ProgressView().controlSize(.regular) } }
                Text(m.t).font(.system(size: 13.5)).lineLimit(2).multilineTextAlignment(.leading)
                if !m.y.isEmpty { Text(m.y).font(.system(size: 12)).foregroundStyle(.white.opacity(0.45)) }
            }
        }
        .buttonStyle(.plain)
    }
}

private struct ShelfSection: View {
    let title: String
    let items: [Mini]
    let empty: String
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(title).font(.display(30))
            if items.isEmpty {
                Text(empty).foregroundStyle(.white.opacity(0.5)).padding(.vertical, 8)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150, maximum: 190), spacing: 20, alignment: .top)], alignment: .leading, spacing: 26) {
                    ForEach(items) { PosterCard(m: $0) }
                }
            }
        }
    }
}

// MARK: account

struct AccountView: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        PageShell {
            VStack(alignment: .leading, spacing: 52) {
                HStack(spacing: 26) {
                    Text(String((model.profile?.name ?? "?").prefix(1)).uppercased()).font(.display(44)).frame(width: 96, height: 96).glassEffect(.regular, in: .circle)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(model.profile?.name ?? "").font(.display(60))
                        Text("@\(model.profile?.username ?? "")").foregroundStyle(.white.opacity(0.55))
                    }
                }
                ShelfSection(title: "Liked", items: model.profile?.liked ?? [], empty: "Press the heart under a trailer and it will be here.")
                ShelfSection(title: "Saved", items: model.profile?.saved ?? [], empty: "Press the bookmark under a trailer to keep it for later.")
                ShelfSection(title: "Your picks", items: model.profile?.favorites ?? [], empty: "")
            }
        }
    }
}

// MARK: settings

struct SettingsView: View {
    @Environment(ScrollModel.self) private var model
    @State private var name = ""

    private func card<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title).font(.display(28)).padding(.leading, 6)
            VStack(spacing: 0) { content() }.padding(.horizontal, 28).padding(.vertical, 8).frame(maxWidth: .infinity, alignment: .leading).glassCard(30)
        }
    }

    private func line<C: View>(_ title: String, _ hint: String? = nil, @ViewBuilder _ trailing: () -> C) -> some View {
        HStack(spacing: 24) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 16.5))
                if let hint { Text(hint).font(.system(size: 13)).foregroundStyle(.white.opacity(0.5)).frame(maxWidth: 420, alignment: .leading) }
            }
            Spacer()
            trailing()
        }
        .padding(.vertical, 18)
    }

    var body: some View {
        PageShell {
            VStack(alignment: .leading, spacing: 44) {
                Text("Settings").font(.display(64))

                card("Playback") {
                    line("Start with sound", "Trailers begin with the sound on.") {
                        Toggle("", isOn: Binding(get: { model.settings.sound }, set: { v in model.muted = !v; Task { await model.patch(sound: v) } })).labelsHidden().toggleStyle(.switch)
                    }
                    Divider().opacity(0.2)
                    line("Play the next one by itself", "When a trailer ends, go on to the next. Off, the trailer plays again.") {
                        Toggle("", isOn: Binding(get: { model.settings.autoNext }, set: { v in Task { await model.patch(autoNext: v) } })).labelsHidden().toggleStyle(.switch)
                    }
                }

                card("YouTube") {
                    line(model.ytSignedIn ? "You are signed in to YouTube" : "Not signed in to YouTube", "Trailers play from YouTube. On a VPN or a shared network it asks for a sign-in before it plays anything; signing in once here fixes that.") {
                        if model.ytSignedIn {
                            Button("Sign out") { Task { await YouTubeAccount.signOut(); model.ytSignedIn = false } }.buttonStyle(.glass)
                        } else {
                            Button { model.showYouTubeSignIn = true } label: { HStack(spacing: 8) { BrandGlyph(name: "youtube", size: 17); Text("Sign in to YouTube") } }.buttonStyle(.glassProminent)
                        }
                    }
                }

                card("Where you watch") {
                    line("Country", "Which streaming services and shops we show under Where to watch.") {
                        Picker("", selection: Binding(get: { model.settings.region }, set: { v in Task { await model.patch(region: v) } })) {
                            ForEach(regions, id: \.code) { Text($0.name).tag($0.code) }
                        }
                        .labelsHidden().frame(width: 240)
                    }
                }

                card("You") {
                    line("Name", "What we call you.") {
                        HStack(spacing: 12) {
                            TextField("Name", text: $name).textFieldStyle(.roundedBorder).frame(width: 200)
                                .onSubmit { Task { await model.rename(name) } }
                            Button("Save") { Task { await model.rename(name) } }.buttonStyle(.glass).disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || name == model.profile?.name)
                        }
                    }
                    Divider().opacity(0.2)
                    line("Username", "Where your page lives.") { Text("@\(model.profile?.username ?? "")").foregroundStyle(.white.opacity(0.7)) }
                    Divider().opacity(0.2)
                    line("Your picks", "The movies we use to choose your trailers.") { Button("Change them") { model.replay() }.buttonStyle(.glass) }
                    Divider().opacity(0.2)
                    line("Sign out") { Button("Sign out") { Task { await model.signOut() } }.buttonStyle(.glass) }
                }

                card("Keys") {
                    ForEach([("↓  ↑   or   J  K", "Next and previous trailer"), ("Space", "Pause or play"), ("L", "Like"), ("S", "Save"), ("W", "Where to watch"), ("M", "Sound on or off"), ("⌘ K", "Search"), ("Esc", "Close a page")], id: \.0) { k in
                        HStack { Text(k.1).foregroundStyle(.white.opacity(0.7)); Spacer(); Text(k.0).font(.system(size: 13)).padding(.horizontal, 10).padding(.vertical, 5).background(.white.opacity(0.1), in: .rect(cornerRadius: 8)) }.padding(.vertical, 12)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("TMDB").font(.system(size: 13, weight: .semibold)).tracking(2.4).foregroundStyle(.white.opacity(0.6))
                    Text("This product uses the TMDB API but is not endorsed or certified by TMDB. Where-to-watch information is provided by JustWatch. Trailers play from YouTube.")
                        .font(.system(size: 12.5)).foregroundStyle(.white.opacity(0.4)).frame(maxWidth: 640, alignment: .leading)
                }
                .padding(.leading, 6)
            }
        }
        .onAppear { name = model.profile?.name ?? "" }
    }
}

// MARK: a person

struct PersonView: View {
    let id: Int
    @Environment(ScrollModel.self) private var model
    @State private var person: PersonPage?
    @State private var error = ""
    @State private var tab = "movies"
    @State private var fullBio = false
    @State private var showAll = false
    @State private var busy: Int?

    private func date(_ s: String) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_GB")
        guard let d = f.date(from: s) else { return s }
        let o = DateFormatter(); o.dateStyle = .long; o.locale = Locale(identifier: "en_GB")
        return o.string(from: d)
    }

    private func age(_ born: String, _ died: String?) -> Int? {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        guard let b = f.date(from: born) else { return nil }
        let e = died.flatMap { f.date(from: $0) } ?? Date()
        return Calendar.current.dateComponents([.year], from: b, to: e).year
    }

    private func open(_ c: Credit) {
        guard c.isMovie, busy == nil else { return }
        busy = c.tmdb
        Task { let ok = await model.openMovie(c.tmdb); if !ok { busy = nil } }
    }

    var body: some View {
        PageShell(close: { model.personID = nil }) {
            if let p = person {
                VStack(alignment: .leading, spacing: 56) {
                    HStack(alignment: .top, spacing: 48) {
                        Group {
                            if let url = Config.portrait(p.photo) { Remote(url: url) } else { Color.white.opacity(0.06).overlay { Text(String(p.name.prefix(1))).font(.display(72)).foregroundStyle(.white.opacity(0.5)) } }
                        }
                        .frame(width: 260, height: 390).clipShape(.rect(cornerRadius: 28)).shadow(color: .black.opacity(0.6), radius: 40, y: 20)
                        VStack(alignment: .leading, spacing: 20) {
                            if !p.dept.isEmpty { Text(p.dept.uppercased()).font(.system(size: 13)).tracking(2.6).foregroundStyle(.white.opacity(0.5)) }
                            Text(p.name).font(.display(72)).minimumScaleFactor(0.5).lineLimit(2)
                            HStack(alignment: .top, spacing: 44) {
                                if let b = p.birthday { fact("Born", date(b) + (p.deathday == nil ? (age(b, nil).map { "  ·  \($0) years old" } ?? "") : "")) }
                                if let d = p.deathday { fact("Died", date(d) + (p.birthday.flatMap { age($0, d) }.map { "  ·  aged \($0)" } ?? "")) }
                                if let pl = p.place { fact("From", pl) }
                                fact("In", "\(p.movies.count) films" + (p.tv.isEmpty ? "" : " and \(p.tv.count) shows"))
                            }
                            if p.bio.isEmpty {
                                Text("We do not have a biography for \(p.name) yet.").foregroundStyle(.white.opacity(0.5))
                            } else {
                                let long = p.bio.count > 760
                                Text(fullBio || !long ? p.bio : String(p.bio.prefix(760)) + "…").font(.system(size: 16.5)).lineSpacing(6).foregroundStyle(.white.opacity(0.7)).frame(maxWidth: 720, alignment: .leading)
                                if long { Button(fullBio ? "Show less" : "Read the rest") { withAnimation { fullBio.toggle() } }.buttonStyle(.plain).underline().foregroundStyle(.white.opacity(0.6)) }
                            }
                            HStack(spacing: 12) {
                                if let i = p.imdb, let u = URL(string: i) { Link("IMDb ↗", destination: u).buttonStyle(.glass) }
                                if let u = URL(string: "https://www.themoviedb.org/person/\(p.id)") { Link("TMDB ↗", destination: u).buttonStyle(.glass) }
                            }
                        }
                    }

                    if !p.known.isEmpty {
                        VStack(alignment: .leading, spacing: 18) {
                            Text("Known for").font(.display(30))
                            ScrollView(.horizontal) {
                                HStack(alignment: .top, spacing: 20) {
                                    ForEach(p.known) { c in
                                        Button { open(c) } label: {
                                            VStack(alignment: .leading, spacing: 8) {
                                                Remote(url: Config.poster(c.p, 342)).frame(width: 150, height: 225).clipShape(.rect(cornerRadius: 18))
                                                    .overlay(alignment: .topLeading) { if !c.isMovie { Text("TV").font(.system(size: 11)).padding(.horizontal, 8).padding(.vertical, 3).background(.black.opacity(0.65), in: .capsule).padding(8) } }
                                                    .overlay { if busy == c.tmdb { ProgressView() } }
                                                Text(c.t).font(.system(size: 13.5)).lineLimit(2).frame(width: 150, alignment: .leading)
                                                if !c.role.isEmpty { Text(c.role).font(.system(size: 12)).foregroundStyle(.white.opacity(0.45)).lineLimit(1).frame(width: 150, alignment: .leading) }
                                            }
                                        }
                                        .buttonStyle(.plain).disabled(!c.isMovie)
                                    }
                                }
                            }
                            .scrollIndicators(.hidden)
                        }
                    }

                    VStack(alignment: .leading, spacing: 20) {
                        HStack {
                            Text("Everything they are in").font(.display(30))
                            Spacer()
                            Picker("", selection: $tab) {
                                Text("Films \(p.movies.count)").tag("movies")
                                if !p.tv.isEmpty { Text("Shows \(p.tv.count)").tag("tv") }
                            }
                            .pickerStyle(.segmented).labelsHidden().frame(width: 240)
                        }
                        let list = tab == "movies" ? p.movies : p.tv
                        let shown = showAll ? list : Array(list.prefix(40))
                        VStack(spacing: 0) {
                            ForEach(shown) { c in
                                Button { open(c) } label: {
                                    HStack(spacing: 20) {
                                        Text(c.y.isEmpty ? "TBA" : c.y).font(.system(size: 14)).foregroundStyle(.white.opacity(0.45)).frame(width: 52, alignment: .leading)
                                        Remote(url: Config.poster(c.p, 185)).frame(width: 46, height: 68).clipShape(.rect(cornerRadius: 8))
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(c.t).font(.system(size: 17)).lineLimit(1)
                                            if !c.role.isEmpty { Text(c.role).font(.system(size: 14)).foregroundStyle(.white.opacity(0.5)).lineLimit(1) }
                                        }
                                        Spacer()
                                        if c.r > 0 { Text("★ \(String(format: "%.1f", c.r))").font(.system(size: 13.5)).foregroundStyle(.white.opacity(0.5)) }
                                        if !c.isMovie, let e = c.eps { Text("\(e) \(e == 1 ? "episode" : "episodes")").font(.system(size: 13.5)).foregroundStyle(.white.opacity(0.5)) }
                                        if c.isMovie { if busy == c.tmdb { ProgressView().controlSize(.small) } else { Image(systemName: "play.fill").foregroundStyle(.white.opacity(0.35)) } }
                                    }
                                    .padding(.vertical, 12)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain).disabled(!c.isMovie)
                                Divider().opacity(0.15)
                            }
                        }
                        if !showAll && list.count > shown.count { Button("Show all \(list.count)") { showAll = true }.buttonStyle(.glass).frame(maxWidth: .infinity) }
                        Text("Credits and biographies from TMDB.").font(.system(size: 12.5)).foregroundStyle(.white.opacity(0.35)).padding(.top, 14)
                    }
                }
            } else if !error.isEmpty {
                VStack(spacing: 12) { Text("We could not load that page.").font(.display(36)); Text(error).foregroundStyle(.white.opacity(0.55)) }.frame(maxWidth: .infinity).padding(.top, 100)
            } else {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.top, 160)
            }
        }
        .task(id: id) {
            person = nil; error = ""; fullBio = false; showAll = false; busy = nil
            struct R: Decodable { let person: PersonPage }
            do {
                let r: R = try await model.api.get("/api/trailers/person/\(id)")
                person = r.person
                tab = r.person.movies.isEmpty && !r.person.tv.isEmpty ? "tv" : "movies"
            } catch { self.error = (error as? APIError)?.message ?? "Try again in a moment." }
        }
    }

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label.uppercased()).font(.system(size: 12)).tracking(1.6).foregroundStyle(.white.opacity(0.45))
            Text(value).font(.system(size: 16)).foregroundStyle(.white.opacity(0.85))
        }
    }
}

// MARK: search

struct SearchView: View {
    @Environment(ScrollModel.self) private var model
    @State private var query = ""
    @State private var found: [Mini] = []
    @State private var busy: Int?
    @FocusState private var focused: Bool

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea().onTapGesture { model.showSearch = false }
            VStack(spacing: 14) {
                HStack(spacing: 14) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.white.opacity(0.55))
                    TextField("Search for a movie", text: $query).textFieldStyle(.plain).font(.system(size: 20)).focused($focused)
                        .onSubmit { if let m = found.first { pick(m) } }
                    Text("esc").font(.system(size: 12)).padding(.horizontal, 8).padding(.vertical, 4).background(.white.opacity(0.12), in: .rect(cornerRadius: 6)).foregroundStyle(.white.opacity(0.6))
                }
                .padding(.horizontal, 26).frame(height: 66).glassEffect(.regular, in: .capsule)

                if !found.isEmpty {
                    ScrollView {
                        VStack(spacing: 2) {
                            ForEach(found) { m in
                                Button { pick(m) } label: {
                                    HStack(spacing: 16) {
                                        Remote(url: Config.poster(m.p, 185)).frame(width: 40, height: 60).clipShape(.rect(cornerRadius: 8))
                                        VStack(alignment: .leading, spacing: 3) { Text(m.t).font(.system(size: 17)).lineLimit(1); Text(m.y).font(.system(size: 13)).foregroundStyle(.white.opacity(0.5)) }
                                        Spacer()
                                        if m.r > 0 { Text("★ \(String(format: "%.1f", m.r))").font(.system(size: 13)).foregroundStyle(.white.opacity(0.5)) }
                                        if busy == m.id { ProgressView().controlSize(.small) }
                                    }
                                    .padding(.horizontal, 16).padding(.vertical, 8).contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(10)
                    }
                    .frame(maxHeight: 420).glassEffect(.regular, in: .rect(cornerRadius: 30))
                } else if query.count >= 2 {
                    Text("Nothing found. Try another spelling.").foregroundStyle(.white.opacity(0.55)).padding(.top, 10)
                }
            }
            .frame(width: 640)
            .frame(maxHeight: .infinity, alignment: .top)
            .padding(.top, 150)
            .foregroundStyle(Color.paper)
        }
        .onAppear { focused = true }
        .task(id: query) {
            try? await Task.sleep(for: .milliseconds(240))
            if Task.isCancelled { return }
            struct R: Decodable { let results: [Mini] }
            if query.trimmingCharacters(in: .whitespaces).count < 2 { found = []; return }
            if let r: R = try? await model.api.get("/api/trailers/search", query: ["q": query]) { if !Task.isCancelled { found = r.results } }
        }
    }

    private func pick(_ m: Mini) {
        busy = m.id
        Task { let ok = await model.openMovie(m.id); if !ok { busy = nil } }
    }
}

// MARK: where to watch

struct WhereView: View {
    let clip: Clip
    @Environment(ScrollModel.self) private var model
    @State private var info: WhereToWatch?
    @State private var failed = false

    private func group(_ title: String, _ items: [Provider]) -> some View {
        Group {
            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text(title.uppercased()).font(.system(size: 12)).tracking(1.8).foregroundStyle(.white.opacity(0.5))
                    FlowRow(items: items)
                }
            }
        }
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea().onTapGesture { model.showWhere = false }
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) { Text("Where to watch").font(.display(34)); Text(clip.title).foregroundStyle(.white.opacity(0.6)) }
                    Spacer()
                    Button { model.showWhere = false } label: { Image(systemName: "xmark").frame(width: 36, height: 36) }.buttonStyle(.glass).buttonBorderShape(.circle)
                }
                if let w = info {
                    if w.isEmpty { Text("We could not find where to watch this in \(regions.first { $0.code == w.region }?.name ?? w.region) yet.").foregroundStyle(.white.opacity(0.6)) }
                    else {
                        group("Stream", w.stream); group("Free", w.free); group("Rent", w.rent); group("Buy", w.buy)
                        if let l = w.link, let u = URL(string: l) { Link("See every option ↗", destination: u).buttonStyle(.glass) }
                    }
                } else if failed {
                    Text("We could not load that. Try again in a moment.").foregroundStyle(.white.opacity(0.6))
                } else { ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 40) }
                Text("Where-to-watch information is provided by JustWatch.").font(.system(size: 12)).foregroundStyle(.white.opacity(0.35))
            }
            .padding(34).frame(width: 600).glassCard(40).foregroundStyle(Color.paper)
        }
        .task(id: clip.id) {
            info = nil; failed = false
            struct R: Decodable { let `where`: WhereToWatch }
            do { let r: R = try await model.api.get("/api/trailers/where", query: ["id": String(clip.id), "region": model.settings.region]); info = r.where } catch { failed = true }
        }
    }
}

private struct FlowRow: View {
    let items: [Provider]
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 170), spacing: 10, alignment: .leading)], alignment: .leading, spacing: 10) {
            ForEach(items) { p in
                HStack(spacing: 10) {
                    Remote(url: Config.logo(p.logo)).frame(width: 30, height: 30).clipShape(.rect(cornerRadius: 8))
                    Text(p.name).font(.system(size: 14.5)).lineLimit(1)
                }
                .padding(.vertical, 6).padding(.leading, 6).padding(.trailing, 14)
                .glassEffect(.regular, in: .capsule)
            }
        }
    }
}
