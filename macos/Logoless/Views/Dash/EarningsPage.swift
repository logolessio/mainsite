import SwiftUI

struct EarningsPage: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact
    @State private var email = ""
    @State private var amount = ""
    @State private var busy = false
    @State private var message: (text: String, good: Bool)?
    @State private var confirming = false

    private var e: Earnings? { app.earnings }
    private var dollars: Double? { let t = amount.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "$", with: ""); return t.isEmpty ? nil : Double(t.replacingOccurrences(of: ",", with: ".")) }
    private var cents: Int { dollars.map { Int(($0 * 100).rounded()) } ?? (e?.balances.available ?? 0) }
    private var emailOK: Bool { email.contains("@") && email.contains(".") }
    private var canWithdraw: Bool { guard let e else { return false }; return e.open && emailOK && cents >= e.minPayoutCents && cents <= e.balances.available && !busy }

    var body: some View {
        DashPageFrame(page: .earnings, subtitle: "What your submissions have earned, your PayPal emails, and withdrawing. We cover PayPal's fees.") {
            ErrorLine(text: app.failures["earnings"]) { Task { await app.load(.earnings) } }
            if let e {
                if !e.open { Text("Withdrawals are not open yet. Your earnings are kept and will be here when they are.").font(.system(size: 13.5)).foregroundStyle(.mute).padding(14).frame(maxWidth: .infinity, alignment: .leading).overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.line)) }

                Card(padding: 26, radius: 26) {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Withdraw to PayPal").font(.display(26)).foregroundStyle(Color.paper)
                            Text("We pay PayPal's fees. Whatever you withdraw is what arrives. From \(Money.cents(e.minPayoutCents)).").font(.system(size: 13.5)).foregroundStyle(.mute)
                        }
                        (compact ? AnyLayout(VStackLayout(alignment: .leading, spacing: 14)) : AnyLayout(HStackLayout(alignment: .bottom, spacing: 14))) {
                            VStack(alignment: .leading, spacing: 8) {
                                Eyebrow("Send it to")
                                HStack(spacing: 8) {
                                    SiteField(prompt: "you@example.com", text: $email)
                                    if e.paypalEmails.count > 1 {
                                        Menu { ForEach(e.paypalEmails, id: \.self) { m in Button(m) { email = m } } } label: { Image(systemName: "chevron.down").frame(width: 40, height: 46) }
                                            .menuStyle(.button).buttonStyle(.plain).menuIndicator(.hidden).pane(Circle(), interactive: true)
                                    }
                                }
                            }
                            VStack(alignment: .leading, spacing: 8) {
                                Eyebrow("Amount")
                                SiteField(prompt: "All (\(Money.cents(e.balances.available)))", text: $amount).frame(width: compact ? nil : 190)
                            }
                            PaperPill("Withdraw", busy: busy) { confirming = true }.disabled(!canWithdraw)
                        }
                        if let message { Text(message.text).font(.system(size: 13.5)).foregroundStyle(message.good ? Color.good : Color.bad) }
                    }
                }
                .confirmationDialog("Withdraw \(Money.cents(cents)) to \(email)?", isPresented: $confirming, titleVisibility: .visible) {
                    Button("Withdraw") { Task { await withdraw() } }
                    Button("Cancel", role: .cancel) {}
                } message: { Text("It is sent to that PayPal address.") }

                SiteGrid(columns: compact ? 2 : (e.balances.pending > 0 ? 4 : 3), spacing: 14) {
                    StatCard(label: "Lifetime earned", value: Money.cents(e.balances.earned))
                    StatCard(label: "Available", value: Money.cents(e.balances.available), note: "Ready to withdraw")
                    if e.balances.pending > 0 { StatCard(label: "Pending", value: Money.cents(e.balances.pending), note: "Being confirmed") }
                    StatCard(label: "Withdrawn", value: Money.cents(e.balances.withdrawn), note: "All time")
                }

                if !e.payouts.isEmpty {
                    section("Withdrawals") { ForEach(e.payouts) { p in row(Money.cents(p.amountCents), p.date.short, pill: payoutLabel(p.status), tint: payoutTint(p.status)) } }
                }
                section("History") {
                    if e.ledger.isEmpty { EmptyNote(symbol: "dollarsign.circle", title: "No earnings yet", message: "Your history appears here once your first submission is verified.") }
                    ForEach(e.ledger) { l in row(kindLabel(l.kind) + (l.campaign.map { " · \($0)" } ?? ""), l.date.short, trailing: (l.amountCents > 0 ? "+" : "") + Money.cents(l.amountCents), good: l.amountCents > 0) }
                }
            } else if app.failures["earnings"] == nil {
                ProgressView().controlSize(.large).frame(maxWidth: .infinity).padding(.vertical, 80)
            }
        }
        .onChange(of: e?.paypalEmail) { _, v in if email.isEmpty, let v, !v.isEmpty { email = v } }
        .onAppear { if email.isEmpty, let v = e?.paypalEmail, !v.isEmpty { email = v } }
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.display(30)).foregroundStyle(Color.paper).padding(.bottom, 14)
            Rectangle().fill(Color.line).frame(height: 1)
            content()
        }
        .padding(.top, 10)
    }

    private func row(_ left: String, _ sub: String, pill: String? = nil, tint: Color = .mute, trailing: String? = nil, good: Bool = false) -> some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 3) { Text(left).font(.system(size: 15)).foregroundStyle(Color.paper).lineLimit(1); Text(sub).font(.system(size: 12)).foregroundStyle(.faint) }
                Spacer()
                if let pill { StatusPill(text: pill, tint: tint) }
                if let trailing { Text(trailing).font(.system(size: 15)).monospacedDigit().foregroundStyle(good ? Color.good : Color.paper.opacity(0.8)) }
            }
            .padding(.vertical, 14)
            Rectangle().fill(Color.line).frame(height: 1)
        }
    }

    private func kindLabel(_ k: String) -> String { switch k { case "earning": "Earned"; case "withdrawal": "Withdrawn"; case "withdrawal_reversal": "Returned"; case "earning_reversal": "Reversed"; default: k.capitalized } }
    private func payoutLabel(_ s: String) -> String { s == "review" ? "Being checked" : s == "sent" ? "Sent" : s.capitalized }
    private func payoutTint(_ s: String) -> Color { s == "sent" ? .good : s == "failed" || s == "reversed" ? .bad : .warn }

    private func withdraw() async {
        busy = true
        message = nil
        defer { busy = false }
        do {
            let r = try await app.withdraw(email: email.trimmingCharacters(in: .whitespaces).lowercased(), dollars: dollars)
            amount = ""
            message = (r.review == true ? "Sent for a quick check. This usually takes under a day." : "On its way to \(email).", true)
        } catch { message = ((error as? APIError)?.message ?? "Something went wrong. Please try again.", false) }
    }
}
