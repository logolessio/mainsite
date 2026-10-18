import AVFoundation
import Observation

/// Plays a campaign's short audio preview. One at a time.
@MainActor @Observable
final class PreviewPlayer {
    private(set) var playingID: String?
    private(set) var elapsed: Double = 0
    private(set) var duration: Double = 0
    private var timeObserver: Any?
    private var player: AVPlayer?
    private var endObserver: NSObjectProtocol?

    func toggle(id: String, url: URL?) {
        if playingID == id { stop(); return }
        stop()
        guard let url else { return }
        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item)
        player = p
        playingID = id
        elapsed = 0
        duration = 0
        timeObserver = p.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { [weak self] t in
            MainActor.assumeIsolated {
                self?.elapsed = t.seconds
                let d = item.duration.seconds
                if d.isFinite, d > 0 { self?.duration = d }
            }
        }
        endObserver = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.stop() }
        }
        p.play()
    }

    func stop() {
        if let t = timeObserver { player?.removeTimeObserver(t); timeObserver = nil }
        player?.pause()
        elapsed = 0
        player = nil
        playingID = nil
        if let o = endObserver { NotificationCenter.default.removeObserver(o); endObserver = nil }
    }
}
