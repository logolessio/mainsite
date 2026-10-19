import AppKit
import SwiftUI
import WebKit

/// What the YouTube player tells the app.
enum PlayerEvent {
    case ready
    /// -1 not started, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    case state(Int)
    case time(Double, Double)
    /// 2 or 5: the player failed; 100: gone or private; 101 or 150: the owner does not allow it outside YouTube; 153: YouTube wants more than it was given
    case error(Int)
    /// The answer to "has it not started because YouTube wants a sign-in?": the first value is the verdict, the second the words on the player.
    case gate(Bool, String)
}

/// The one YouTube player of the app. It is a web view that holds YouTube's own player (the official IFrame API) and is told which trailer to hold,
/// so scrolling through trailers never builds or tears a player down. The page is served from youtube.com's own address (how native apps are meant to
/// embed it), and the web view keeps its cookies on this Mac: signing in to YouTube once, here, is remembered.
@MainActor
final class PlayerController: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    var onEvent: ((PlayerEvent) -> Void)?
    /// A window the player's page asked to open (YouTube's own "Sign in" button does); nil when it has been closed.
    var onPopup: ((WKWebView?) -> Void)?
    private(set) var started = false

    /// A current Safari: Google does not show its sign-in to an app that looks like an embedded browser.
    static let userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15"

    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.mediaTypesRequiringUserActionForPlayback = [] // a trailer starts by itself, with sound if sound is on
        let ucc = WKUserContentController()
        cfg.userContentController = ucc
        webView = WKWebView(frame: .zero, configuration: cfg)
        super.init()
        ucc.add(WeakHandler(self), name: "yt")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.customUserAgent = Self.userAgent
        webView.setValue(false, forKey: "drawsBackground")
    }

    private static func safe(_ id: String) -> String? {
        id.range(of: "^[A-Za-z0-9_-]{6,20}$", options: .regularExpression) != nil ? id : nil
    }

    /// How the player is embedded. `pageItself` is the way that works: YouTube's own player page, opened as the page (so its cookies are first-party and a
    /// sign-in sticks), with the referrer that says who is showing it. Putting it in a frame of our own page makes YouTube answer with misleading errors
    /// (152 "unavailable", 150 "not allowed"). The other modes are development aids to compare them (and "E" plays a sample video, to try the screen
    /// without YouTube).
    enum Mode: String { case iframeOnYouTube = "A", iframeOnSite = "C", pageItself = "D", testVideo = "E" }
    var mode: Mode = {
        #if DEBUG
        if let m = ProcessInfo.processInfo.environment["SCROLL_PLAYER_MODE"], let mode = Mode(rawValue: m) { return mode }
        #endif
        return .pageItself
    }()

    /// Builds the player around the first trailer. Later trailers are switched with `load`.
    func start(videoID: String, muted: Bool) {
        guard let id = Self.safe(videoID) else { return }
        started = true
        switch mode {
        case .iframeOnYouTube:
            webView.loadHTMLString(Self.page(id: id, muted: muted, origin: "https://www.youtube.com"), baseURL: URL(string: "https://www.youtube.com"))
        case .iframeOnSite:
            webView.loadHTMLString(Self.page(id: id, muted: muted, origin: "https://scroll.logoless.io"), baseURL: URL(string: "https://scroll.logoless.io"))
        case .testVideo:
            webView.loadHTMLString(Self.testPage, baseURL: URL(string: "https://scroll.logoless.io"))
        case .pageItself:
            // YouTube's own player page, opened as the page (so its cookies are first-party), telling it who embeds it
            var c = URLComponents(string: "https://www.youtube.com/embed/\(id)")!
            c.queryItems = ["autoplay": "1", "mute": muted ? "1" : "0", "controls": "0", "rel": "0", "modestbranding": "1", "playsinline": "1", "iv_load_policy": "3", "disablekb": "1", "fs": "0", "enablejsapi": "1"].map { URLQueryItem(name: $0.key, value: $0.value) }
            var req = URLRequest(url: c.url!)
            req.setValue("https://scroll.logoless.io/", forHTTPHeaderField: "Referer")
            webView.load(req)
        }
    }

    /// Builds the player again (after a YouTube sign-in, so it starts with the new cookies).
    func restart(videoID: String, muted: Bool) {
        start(videoID: videoID, muted: muted)
    }

    func load(_ id: String) { if let id = Self.safe(id) { run("sc.load('\(id)')") } }
    func play() { run("sc.play()") }
    func pause() { run("sc.pause()") }
    func mute(_ m: Bool) { run(m ? "sc.mute()" : "sc.unmute()") }
    func seekToStart() { run("sc.seek(0)") }

    /// Asks the page what the player shows (YouTube's sign-in request is text inside the player).
    func probe() {
        webView.evaluateJavaScript("sc.probe()") { [weak self] result, _ in
            let text = (result as? String) ?? ""
            let lower = text.lowercased()
            let gated = lower.contains("not a bot") || lower.contains("sign in to confirm") || lower.contains("confirm you")
            Task { @MainActor in self?.onEvent?(.gate(gated, String(text.prefix(160)))) }
        }
    }

    private func run(_ js: String) { webView.evaluateJavaScript(js, completionHandler: nil) }

    // MARK: messages from the page

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let d = message.body as? [String: Any], let t = d["t"] as? String else { return }
        let state = (d["s"] as? NSNumber)?.intValue
        let code = (d["c"] as? NSNumber)?.intValue
        let cur = (d["cur"] as? NSNumber)?.doubleValue
        let dur = (d["dur"] as? NSNumber)?.doubleValue
        switch t {
        case "ready": onEvent?(.ready)
        case "state": if let state { onEvent?(.state(state)) }
        case "time": if let cur, let dur { onEvent?(.time(cur, dur)) }
        case "error": if let code { onEvent?(.error(code)) }
        default: break
        }
    }

    // MARK: windows the page opens (YouTube's own sign-in)

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        let popup = WKWebView(frame: .zero, configuration: configuration)
        popup.customUserAgent = Self.userAgent
        popup.uiDelegate = self
        onPopup?(popup)
        return popup
    }

    func webViewDidClose(_ webView: WKWebView) { onPopup?(nil) }

    private static let testPage = """
    <!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}</style></head>
    <body><video id="v" playsinline autoplay muted src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4"></video>
    <script>
    var v=document.getElementById('v');
    function post(o){try{window.webkit.messageHandlers.yt.postMessage(o)}catch(e){}}
    v.addEventListener('playing',function(){post({t:'state',s:1})});
    v.addEventListener('pause',function(){post({t:'state',s:2})});
    v.addEventListener('waiting',function(){post({t:'state',s:3})});
    v.addEventListener('ended',function(){post({t:'state',s:0})});
    v.addEventListener('timeupdate',function(){post({t:'time',cur:v.currentTime,dur:v.duration||0})});
    window.sc={load:function(id){v.src='https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4?v='+id;v.play()},play:function(){v.play()},pause:function(){v.pause()},mute:function(){v.muted=true},unmute:function(){v.muted=false},seek:function(s){v.currentTime=s},probe:function(){return ''}};
    post({t:'ready'});
    </script></body></html>
    """

    /// In the "page itself" mode there is no page of ours to hold the script: it is put into YouTube's page when that has loaded.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard mode == .pageItself, webView === self.webView else { return }
        webView.evaluateJavaScript(Self.pageScript, completionHandler: nil)
    }

    private static let pageScript = """
    (function(){
      function post(o){try{window.webkit.messageHandlers.yt.postMessage(o)}catch(e){}}
      window.__scState=function(s){post({t:'state',s:s})};
      window.__scErr=function(c){post({t:'error',c:c})};
      var tries=0,p=null;
      var iv=setInterval(function(){
        tries++; p=document.getElementById('movie_player');
        if(p&&p.getPlayerState){clearInterval(iv);post({t:'ready'});p.addEventListener('onStateChange','__scState');p.addEventListener('onError','__scErr');p.playVideo&&p.playVideo();}
        if(tries>150){clearInterval(iv);post({t:'error',c:-1})}
      },100);
      setInterval(function(){var q=document.getElementById('movie_player');if(q&&q.getPlayerState&&q.getPlayerState()===1){post({t:'time',cur:q.getCurrentTime(),dur:q.getDuration()})}},250);
      window.sc={
        load:function(id){var q=document.getElementById('movie_player');q&&q.loadVideoById(id)},
        play:function(){var q=document.getElementById('movie_player');q&&q.playVideo()},
        pause:function(){var q=document.getElementById('movie_player');q&&q.pauseVideo()},
        mute:function(){var q=document.getElementById('movie_player');q&&q.mute()},
        unmute:function(){var q=document.getElementById('movie_player');if(q){q.unMute();q.setVolume(100)}},
        seek:function(s){var q=document.getElementById('movie_player');q&&q.seekTo(s,true)},
        probe:function(){return document.body.innerText||''}
      };
    })();
    """


    // MARK: the page

    private static func page(id: String, muted: Bool, origin: String) -> String {
        """
        <!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin">
        <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p,iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
        <body><div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var player=null,ready=false,pending=null;
        function post(o){try{window.webkit.messageHandlers.yt.postMessage(o)}catch(e){}}
        function onYouTubeIframeAPIReady(){
          player=new YT.Player('p',{host:'https://www.youtube.com',width:'100%',height:'100%',videoId:'\(id)',
            playerVars:{autoplay:1,mute:\(muted ? 1 : 0),controls:0,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,disablekb:1,fs:0,cc_load_policy:0,enablejsapi:1,origin:'\(origin)'},
            events:{
              onReady:function(){ready=true;post({t:'ready'});if(pending){player.loadVideoById(pending);pending=null}else{player.playVideo()}},
              onStateChange:function(e){post({t:'state',s:e.data})},
              onError:function(e){post({t:'error',c:e.data})}
            }});
        }
        setInterval(function(){if(ready&&player.getPlayerState&&player.getPlayerState()===1){post({t:'time',cur:player.getCurrentTime(),dur:player.getDuration()})}},250);
        window.sc={
          load:function(id){if(ready){player.loadVideoById(id)}else{pending=id}},
          play:function(){if(ready)player.playVideo()},
          pause:function(){if(ready)player.pauseVideo()},
          mute:function(){if(ready)player.mute()},
          unmute:function(){if(ready){player.unMute();player.setVolume(100)}},
          seek:function(s){if(ready)player.seekTo(s,true)},
          probe:function(){try{var f=document.querySelector('iframe');return f.contentDocument.body.innerText||''}catch(e){return ''}}
        };
        </script></body></html>
        """
    }
}

/// Lets the web view's script handler be removed without a retain cycle.
@MainActor
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ t: WKScriptMessageHandler) { target = t }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { target?.userContentController(c, didReceive: m) }
}

/// The player's web view, placed behind the interface.
struct PlayerSurface: NSViewRepresentable {
    let controller: PlayerController
    func makeNSView(context: Context) -> WKWebView { controller.webView }
    func updateNSView(_ view: WKWebView, context: Context) {}
}

/// YouTube's cookies on this Mac: whether somebody has signed in (which is what lets a trailer play on a network YouTube distrusts), and signing out.
@MainActor
enum YouTubeAccount {
    static func isSignedIn() async -> Bool {
        let cookies = await WKWebsiteDataStore.default().httpCookieStore.allCookies()
        return cookies.contains { ($0.domain.contains("youtube.com") || $0.domain.contains("google.com")) && ["LOGIN_INFO", "SAPISID", "__Secure-1PSID", "__Secure-3PSID"].contains($0.name) }
    }

    static func signOut() async {
        let store = WKWebsiteDataStore.default()
        let records = await store.dataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes())
        let mine = records.filter { $0.displayName.contains("youtube") || $0.displayName.contains("google") }
        await store.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), for: mine)
    }
}
