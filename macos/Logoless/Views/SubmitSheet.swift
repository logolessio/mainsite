import SwiftUI

struct SubmitSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let campaign: Campaign
    @State private var platform = ""
    @State private var link = ""
    @State private var busy = false
    @State private var error: String?
    @State private var result: SubmitResult?

    private var valid: Bool { URL(string: link.trimmingCharacters(in: .whitespacesAndNewlines))?.host != nil }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if let result {
                done(result)
            } else {
                form
            }
        }
        .padding(30)
        .frame(width: 520)
        .background(Color.black)
        .onAppear { if platform.isEmpty { platform = campaign.platforms.first ?? "tiktok" } }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Submit content").font(.display(32)).foregroundStyle(Color.paper)
                Text("to \(campaign.title) by \(campaign.creator)").foregroundStyle(.mute)
            }
            Text("Post your content on your own account first, then paste the link to that post here. Views are counted once it is approved.")
                .font(.callout).foregroundStyle(.mute).fixedSize(horizontal: false, vertical: true)

            if campaign.platforms.count > 1 {
                Picker("Where you posted it", selection: $platform) {
                    ForEach(campaign.platforms, id: \.self) { Text($0.platformName).tag($0) }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
            }

            HStack(spacing: 10) {
                SiteField(prompt: "Link to your post", text: $link).onSubmit { Task { await send() } }
                GhostPill("Paste", height: 46) { if let s = NSPasteboard.general.string(forType: .string) { link = s.trimmingCharacters(in: .whitespacesAndNewlines) } }
            }
            ErrorLine(text: error)

            HStack {
                Spacer()
                GhostPill("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                PaperPill("Submit", busy: busy) { Task { await send() } }.disabled(!valid || busy).keyboardShortcut(.defaultAction)
            }
        }
    }

    private func done(_ r: SubmitResult) -> some View {
        let ok = r.status != "declined"
        return VStack(alignment: .leading, spacing: 18) {
            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill").font(.system(size: 40)).foregroundStyle(ok ? Color.good : Color.bad)
            Text(r.status == "approved" ? "Approved" : r.status == "declined" ? "Not approved" : "Sent for review").font(.display(32))
            Text(r.status == "approved" ? "Your views are checked while the campaign runs, and you are paid for the verified ones."
                 : r.status == "declined" ? (r.reason ?? "The link did not lead to a video.")
                 : "A person will look at it soon. You will hear when it is decided.")
                .foregroundStyle(.mute).fixedSize(horizontal: false, vertical: true)
            if !r.checks.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(r.checks) { c in
                        HStack(spacing: 10) {
                            Image(systemName: c.state == "pass" ? "checkmark" : c.state == "fail" ? "xmark" : "questionmark").foregroundStyle(c.state == "pass" ? Color.good : c.state == "fail" ? Color.bad : Color.warn).frame(width: 16)
                            Text(c.label)
                            if let n = c.note, !n.isEmpty { Text(n).foregroundStyle(.faint) }
                        }
                        .font(.callout)
                    }
                }
            }
            HStack {
                Spacer()
                PaperPill("Done") { dismiss() }.keyboardShortcut(.defaultAction)
            }
        }
    }

    private func send() async {
        guard valid, !busy else { return }
        busy = true
        error = nil
        defer { busy = false }
        do { result = try await app.submit(to: campaign, platform: platform, url: link.trimmingCharacters(in: .whitespacesAndNewlines)) }
        catch { self.error = (error as? APIError)?.message ?? "Something went wrong. Please try again." }
    }
}
