import SwiftUI

struct AcctState: Decodable, Identifiable, Hashable {
    let platform: String
    let handle: String
    let status: String // verified, code, waiting, none
    var code: String?
    var profileUrl: String?
    var id: String { platform }
}

private struct VerifyReply: Decodable {
    struct Result: Decodable { let status: String; var message: String? }
    var account: AcctState?
    var accounts: [AcctState]?
    var result: Result?
}

/// The last question in onboarding: prove the accounts that were just added by putting a short code in their bios. Each account can be done now or
/// left for later (it stays in the dashboard).
struct VerifyAccounts: View {
    @Environment(AppModel.self) private var app
    let linked: [String: String]
    let onDone: () -> Void
    @State private var states: [String: AcctState] = [:]
    @State private var open: String?

    private let order = ["tiktok", "youtube", "instagram"]
    private func bare(_ h: String) -> String { h.replacingOccurrences(of: "@", with: "").trimmingCharacters(in: .whitespaces) }
    private var mine: [String] { order.filter { !bare(linked[$0] ?? "").isEmpty } }
    private func status(_ p: String) -> String { states[p]?.status == "verified" ? "verified" : states[p]?.status == "waiting" ? "waiting" : "open" }
    private var done: Int { mine.filter { status($0) == "verified" }.count }

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 12) {
                ForEach(mine, id: \.self) { p in
                    HStack(spacing: 12) {
                        PlatformMark(platform: p, size: 20).foregroundStyle(.mute)
                        Text("@\(bare(states[p]?.handle ?? linked[p] ?? ""))").font(.system(size: 16)).foregroundStyle(Color.paper).lineLimit(1)
                        Spacer(minLength: 8)
                        switch status(p) {
                        case "verified": Label("Verified", systemImage: "checkmark").font(.system(size: 14)).foregroundStyle(Color(red: 0.43, green: 0.91, blue: 0.72)).padding(.horizontal, 16).frame(height: 40).background(Color(red: 0.2, green: 0.83, blue: 0.6).opacity(0.15), in: Capsule())
                        case "waiting": Text("Waiting for the team").font(.system(size: 14)).foregroundStyle(.mute).padding(.horizontal, 16)
                        default: Button { open = p } label: { Text("Verify").font(.system(size: 14, weight: .medium)).foregroundStyle(.black).padding(.horizontal, 20).frame(height: 40).background(Color.paper, in: Capsule()).contentShape(Capsule()) }.buttonStyle(.plain)
                        }
                    }
                    .padding(.leading, 20).padding(.trailing, 8).frame(height: 56)
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.22)))
                }
            }
            .frame(maxWidth: 384)
            VStack(spacing: 16) {
                OBPrimary(done > 0 || mine.contains { status($0) == "waiting" } ? "Continue" : "Do this later", action: onDone)
                if done == 0 { Text("Unverified accounts still work. Their submissions just wait for a person to check them. You can verify any time in Accounts.").font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 384) }
                else { Text(done == mine.count ? "All set. You can take the codes out of your bios." : "You can verify the rest later in Accounts.").font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 384) }
            }
            .padding(.top, 32)
        }
        .task { await load() }
        .sheet(item: Binding(get: { open.map { Platform2(id: $0) } }, set: { open = $0?.id })) { p in
            BioVerifySheet(platform: p.id, handle: bare(states[p.id]?.handle ?? linked[p.id] ?? "")) { Task { await load() } }
        }
    }

    private struct Platform2: Identifiable { let id: String }

    private func load() async {
        if let r: VerifyReply = try? await app.api.get("/api/me/accounts/verify") {
            var next: [String: AcctState] = [:]
            for a in r.accounts ?? [] { next[a.platform] = a }
            states = next
        }
    }
}

/// Prove an account is yours: put a short code in its bio, then we look for it. A person on the team can check by hand when a site will not let us read it.
struct BioVerifySheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let platform: String
    let handle: String
    let onChange: () -> Void

    enum Phase: Equatable { case loading, ready, checking, verified, notFound(String), unreadable(String), waiting, error(String) }
    @State private var phase = Phase.loading
    @State private var code = ""
    @State private var profileUrl = ""
    @State private var copied = false

    private var label: String { platform.platformName }
    private var where_: String {
        switch platform {
        case "tiktok": "In TikTok, open your profile, press Edit profile, and add the code to your Bio."
        case "youtube": "In YouTube Studio, open Customization, then Basic info, and add the code to your Description."
        default: "In Instagram, open your profile, press Edit profile, and add the code to your Bio."
        }
    }
    private var busy: Bool { phase == .loading || phase == .checking }
    private var canAsk: Bool { if case .unreadable = phase { return true }; if case .notFound = phase { return true }; return platform == "instagram" && phase == .ready }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                PlatformMark(platform: platform, size: 24).frame(width: 48, height: 48).overlay(Circle().strokeBorder(Color.line))
                VStack(alignment: .leading, spacing: 2) { Text("Verify \(label)").font(.display(24)).foregroundStyle(Color.paper); Text("@\(handle)").font(.system(size: 14)).foregroundStyle(.mute).lineLimit(1) }
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 13)).foregroundStyle(Color.paper).frame(width: 36, height: 36).contentShape(Circle()) }.buttonStyle(.plain)
            }
            if phase == .verified {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark").font(.system(size: 26, weight: .semibold)).foregroundStyle(Color(red: 0.43, green: 0.91, blue: 0.72)).frame(width: 56, height: 56).background(Color(red: 0.2, green: 0.83, blue: 0.6).opacity(0.15), in: Circle())
                    Text("@\(handle) is verified").font(.system(size: 18)).foregroundStyle(Color.paper).padding(.top, 12)
                    Text("Submissions from this account can now be checked automatically. You can take the code out of your bio.").font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 320)
                    OBPrimary("Done") { dismiss() }.padding(.top, 20)
                }.frame(maxWidth: .infinity).padding(.top, 32)
            } else if phase == .waiting {
                VStack(spacing: 8) {
                    Text("Waiting for the team").font(.system(size: 18)).foregroundStyle(Color.paper)
                    Text("Someone will look at your bio and you will get a notification. Leave the code in your bio until then.").font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 320)
                    Text(code).font(.system(size: 14, design: .monospaced)).foregroundStyle(Color.paper).padding(.horizontal, 16).padding(.vertical, 8).overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.white.opacity(0.22))).padding(.top, 12)
                    GhostPill("Close") { dismiss() }.padding(.top, 20)
                }.frame(maxWidth: .infinity).padding(.top, 32)
            } else {
                VStack(alignment: .leading, spacing: 20) {
                    step("1", title: "Put this code in your bio") {
                        HStack(spacing: 8) {
                            Text(phase == .loading ? "…" : code).font(.system(size: 16, design: .monospaced)).foregroundStyle(Color.paper).textSelection(.enabled).lineLimit(1).frame(maxWidth: .infinity).padding(.vertical, 12).background(Color.black.opacity(0.5), in: RoundedRectangle(cornerRadius: 16, style: .continuous)).overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.white.opacity(0.22)))
                            Button { Platform.copy(code); copied = true; Task { try? await Task.sleep(for: .seconds(1.6)); copied = false } } label: { Image(systemName: copied ? "checkmark" : "doc.on.doc").font(.system(size: 14)).foregroundStyle(copied ? Color(red: 0.43, green: 0.91, blue: 0.72) : Color.paper).frame(width: 48, height: 48).overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.white.opacity(0.22))).contentShape(Rectangle()) }.buttonStyle(.plain).disabled(code.isEmpty)
                        }
                        Text(where_).font(.system(size: 14)).foregroundStyle(.mute)
                    }
                    step("2", title: "Save it, then check") { Text("It can take a minute for the platform to show the new bio.").font(.system(size: 14)).foregroundStyle(.mute) }
                }
                .padding(.top, 24)
                if case .notFound(let m) = phase { Text(m).font(.system(size: 14)).foregroundStyle(Color(red: 1, green: 0.95, blue: 0.8)).padding(.horizontal, 16).padding(.vertical, 12).frame(maxWidth: .infinity, alignment: .leading).background(Color.warn.opacity(0.06), in: RoundedRectangle(cornerRadius: 16)).overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.warn.opacity(0.3))).padding(.top, 20) }
                if case .unreadable(let m) = phase { Text(m + (code.isEmpty ? "" : " If the code is in your bio, ask the team to check it by hand.")).font(.system(size: 14)).foregroundStyle(Color.paper.opacity(0.8)).padding(.horizontal, 16).padding(.vertical, 12).frame(maxWidth: .infinity, alignment: .leading).overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.white.opacity(0.22))).padding(.top, 20) }
                if case .error(let m) = phase { Text(m).font(.system(size: 14)).foregroundStyle(redSignal).padding(.top, 20) }
                if platform == "instagram" && phase == .ready { Text("Instagram does not let a website read profiles, so a person on our team will check this one. Try the check first, or ask us straight away once the code is in your bio.").font(.system(size: 14)).foregroundStyle(.mute).padding(.top, 20) }
                VStack(spacing: 10) {
                    PaperPill("Check my bio", busy: phase == .checking, height: 48, fullWidth: true) { Task { await run() } }.disabled(busy || code.isEmpty)
                    if canAsk { GhostPill("Ask the team to check it", height: 48) { Task { await ask() } }.disabled(busy) }
                    if let u = URL(string: profileUrl), !profileUrl.isEmpty { Button { Platform.open(u) } label: { Label("Open my \(label) profile", systemImage: "arrow.up.right").font(.system(size: 14)).foregroundStyle(.mute).frame(height: 40).contentShape(Rectangle()) }.buttonStyle(.plain) }
                }
                .padding(.top, 24)
            }
        }
        .padding(28)
        .frame(maxWidth: 460)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Color.black)
        .task { await begin() }
    }

    private func step<C: View>(_ n: String, title: String, @ViewBuilder _ content: () -> C) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(n).font(.system(size: 12)).foregroundStyle(Color.paper).frame(width: 24, height: 24).overlay(Circle().strokeBorder(Color.white.opacity(0.22))).padding(.top, 2)
            VStack(alignment: .leading, spacing: 10) { Text(title).font(.system(size: 15)).foregroundStyle(Color.paper); content() }
        }
    }

    private struct Req: Encodable { let action: String; let platform: String }

    private func begin() async {
        do {
            let r: VerifyReply = try await app.api.post("/api/me/accounts/verify", Req(action: "start", platform: platform))
            guard let a = r.account else { throw APIError(message: "Could not start that.") }
            code = a.code ?? ""; profileUrl = a.profileUrl ?? ""
            phase = a.status == "verified" ? .verified : a.status == "waiting" ? .waiting : .ready
        } catch { phase = .error((error as? APIError)?.message ?? "Could not start that.") }
    }

    private func run() async {
        phase = .checking
        do {
            let r: VerifyReply = try await app.api.post("/api/me/accounts/verify", Req(action: "check", platform: platform))
            switch r.result?.status {
            case "verified": phase = .verified; onChange()
            case "unreadable": phase = .unreadable(r.result?.message ?? "")
            case "not-found": phase = .notFound(r.result?.message ?? "")
            default: phase = .error(r.result?.message ?? "Could not check that.")
            }
        } catch { phase = .error((error as? APIError)?.message ?? "Could not check that.") }
    }

    private func ask() async {
        phase = .checking
        do { let _: VerifyReply = try await app.api.post("/api/me/accounts/verify", Req(action: "ask", platform: platform)); phase = .waiting; onChange() }
        catch { phase = .error((error as? APIError)?.message ?? "Could not ask the team.") }
    }
}
