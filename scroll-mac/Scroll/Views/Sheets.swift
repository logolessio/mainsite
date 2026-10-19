import SwiftUI
import WebKit

/// The trailer in a window of its own, with YouTube's own controls: the way to watch one when the player behind the screen could not start,
/// and the place where YouTube's own "Sign in" button can be pressed.
struct TheaterView: View {
    @Environment(ScrollModel.self) private var model
    @State private var box: WKWebViewBox?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(model.current?.title ?? "Trailer").font(.display(24))
                Spacer()
                if let k = model.current?.trailer.key, let u = URL(string: "https://www.youtube.com/watch?v=\(k)") { Link("Open on YouTube ↗", destination: u).buttonStyle(.glass) }
                Button("Close") { model.showTheater = false }.buttonStyle(.glassProminent)
            }
            .padding(.horizontal, 24).padding(.vertical, 16)
            if let box { WebPanel(view: box) } else { Color.black }
        }
        .frame(minWidth: 960, minHeight: 620)
        .foregroundStyle(Color.paper)
        .background(.black)
        .onAppear {
            guard let k = model.current?.trailer.key else { return }
            // YouTube's own page for the video: it plays, and it has its own Sign in button (its embed page refuses to open on its own)
            box = WKWebViewBox(url: URL(string: "https://www.youtube.com/watch?v=\(k)"))
        }
    }
}

/// YouTube's own sign-in, in the same web view store the trailer player uses. Once it has signed in the player starts again, and trailers play.
struct YouTubeSignInView: View {
    @Environment(ScrollModel.self) private var model
    @State private var box = WKWebViewBox(url: URL(string: "https://accounts.google.com/ServiceLogin?service=youtube&hl=en&continue=https%3A%2F%2Fwww.youtube.com%2F"))
    @State private var done = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Sign in to YouTube").font(.display(24))
                    Text(done ? "Signed in. Starting your trailer…" : "Sign in once, and trailers play on any network.").font(.system(size: 13)).foregroundStyle(.white.opacity(0.55))
                }
                Spacer()
                if done { Button("Done") { finish() }.buttonStyle(.glassProminent) } else { Button("Cancel") { finish() }.buttonStyle(.glass) }
            }
            .padding(.horizontal, 24).padding(.vertical, 16)
            WebPanel(view: box)
        }
        .frame(width: 560, height: 760)
        .foregroundStyle(Color.paper)
        .background(.black)
        .task {
            #if DEBUG
            if ProcessInfo.processInfo.environment["SCROLL_LOG"] != nil {
                try? await Task.sleep(for: .seconds(6))
                let t = try? await box.web.evaluateJavaScript("document.location.href + ' | ' + document.body.innerText.slice(0, 300)")
                FileHandle.standardError.write(Data("[signin page] \(t ?? "nil")\n".utf8))
            }
            #endif
            // the sheet closes by itself once YouTube's cookies show somebody has signed in
            while !Task.isCancelled && !done {
                try? await Task.sleep(for: .seconds(1.2))
                if await YouTubeAccount.isSignedIn() { done = true; try? await Task.sleep(for: .seconds(1.0)); finish() }
            }
        }
    }

    private func finish() { Task { await model.youTubeSignInFinished() } }
}

/// A window YouTube's player asked to open (its own sign-in button does).
struct PopupView: View {
    @Environment(ScrollModel.self) private var model
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("YouTube").font(.display(22))
                Spacer()
                Button("Done") { model.popup = nil; Task { await model.youTubeSignInFinished() } }.buttonStyle(.glassProminent)
            }
            .padding(.horizontal, 24).padding(.vertical, 14)
            if let p = model.popup { PopupWeb(web: p) } else { Color.black }
        }
        .frame(width: 560, height: 720)
        .foregroundStyle(Color.paper)
        .background(.black)
    }
}

private struct PopupWeb: NSViewRepresentable {
    let web: WKWebView
    func makeNSView(context: Context) -> WKWebView { web }
    func updateNSView(_ v: WKWebView, context: Context) {}
}
