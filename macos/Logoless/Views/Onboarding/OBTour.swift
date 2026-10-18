import SwiftUI

/// The walk through the dashboard after sign up, the same as the site's: a small window with the dashboard's own menu and, for each
/// stop, a picture of that page with the one thing to notice pulsing. Sample numbers only; nothing here is the person's data.
enum TourMock { case overview, submissions, earnings, profile, settings, brandOverview, campaigns, brandSubmissions, balance }

struct TourStop {
    let symbol: String
    let label: String
    let title: String
    let text: String
    let tip: String
    let mock: TourMock

    static func stops(brand: Bool) -> [TourStop] {
        brand ? [
            TourStop(symbol: "square.grid.2x2", label: "Overview", title: "The whole picture.", text: "How your campaigns are doing, and the next thing to do to get set up.", tip: "The setup guide shows what is left before you launch.", mock: .brandOverview),
            TourStop(symbol: "megaphone", label: "Campaigns", title: "Launch in minutes.", text: "Launch a campaign with a brief, a rate and a budget cap. Pause it or change its budget any time.", tip: "A clear brief gets better clips.", mock: .campaigns),
            TourStop(symbol: "film.stack", label: "Submissions", title: "Everything made for you.", text: "Everything made for your campaigns, with its views and its status.", tip: "Open any clip to see where it was posted.", mock: .brandSubmissions),
            TourStop(symbol: "banknote", label: "Balance", title: "One balance for all of it.", text: "Add funds once. Every campaign draws from the same balance as creators earn.", tip: "Each campaign has its own cap, so none can overspend.", mock: .balance),
            TourStop(symbol: "gearshape", label: "Settings", title: "Make it quiet, or loud.", text: "Notifications, Discord, your password and your account.", tip: "Turn on email for the moments that matter.", mock: .settings),
        ] : [
            TourStop(symbol: "square.grid.2x2", label: "Overview", title: "Your home base.", text: "Your balance, how your submissions are going, and the next thing to do to get set up.", tip: "Start with the setup guide: it takes about five minutes.", mock: .overview),
            TourStop(symbol: "film.stack", label: "Submissions", title: "Paste a link, we do the rest.", text: "Paste the link to something you posted. We take a first look right away, and a person checks anything unclear.", tip: "Most clips are checked within seconds.", mock: .submissions),
            TourStop(symbol: "dollarsign.circle", label: "Earnings", title: "Watch it add up.", text: "Approved views are counted here. Withdraw to your PayPal once you reach the minimum.", tip: "Add your PayPal email first so withdrawing is one tap.", mock: .earnings),
            TourStop(symbol: "person.crop.circle", label: "Profile", title: "Your public page.", text: "Your look, a bio, and the accounts you post from. Brands see it before they work with you.", tip: "Verify your accounts with a code in your bio.", mock: .profile),
            TourStop(symbol: "gearshape", label: "Settings", title: "Make it quiet, or loud.", text: "Notifications, Discord, your password and your account.", tip: "Connect Discord to hear about new campaigns first.", mock: .settings),
        ]
    }
}

struct Tour: View {
    let brand: Bool
    let onFinish: () -> Void
    @State private var i = 0
    @State private var seen: Set<Int> = [0]
    @State private var forward = true
    @Namespace private var space
    @Environment(\.compact) private var compact

    private var stops: [TourStop] { TourStop.stops(brand: brand) }

    private func go(_ n: Int) {
        guard n >= 0, n < stops.count, n != i else { return }
        forward = n > i
        withAnimation(.spring(duration: 0.42, bounce: 0.12)) { i = n }
        seen.insert(n)
    }

    var body: some View {
        let stop = stops[i]
        let last = i == stops.count - 1
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                ForEach(0..<stops.count, id: \.self) { n in
                    Button { go(n) } label: {
                        Capsule().fill(Color.paper.opacity(n == i ? 1 : seen.contains(n) ? 0.45 : 0.15)).frame(height: 4).frame(maxWidth: .infinity).frame(height: 20)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(stops[n].label), step \(n + 1)")
                }
            }
            .padding(.bottom, 16)

            (compact ? AnyLayout(VStackLayout(spacing: 0)) : AnyLayout(HStackLayout(spacing: 0))) {
                rail
                if !compact { Rectangle().fill(Color.white.opacity(0.22)).frame(width: 1) } else { Rectangle().fill(Color.white.opacity(0.22)).frame(height: 1) }
                ZStack(alignment: .topLeading) {
                    TourMockView(kind: stop.mock)
                        .id(i)
                        .transition(.asymmetric(insertion: .opacity.combined(with: .offset(x: forward ? 22 : -22)), removal: .opacity))
                }
                .frame(maxWidth: .infinity, minHeight: 304, alignment: .topLeading)
                .padding(compact ? 16 : 20)
                .clipped()
            }
            .background(Color.black.opacity(0.25))
            .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 32, style: .continuous).strokeBorder(Color.white.opacity(0.22)))

            VStack(spacing: 0) {
                Text("\(i + 1) of \(stops.count)").font(.system(size: 13)).foregroundStyle(Color.paper.opacity(0.45))
                Text(stop.title).font(.display(30)).foregroundStyle(Color.paper).multilineTextAlignment(.center).padding(.top, 6)
                Text(stop.text).font(.system(size: 16)).foregroundStyle(.mute).lineSpacing(4).multilineTextAlignment(.center).frame(maxWidth: 440).fixedSize(horizontal: false, vertical: true).padding(.top, 12)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: "lightbulb").font(.system(size: 12))
                    Text(stop.tip).font(.system(size: 13)).fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(Color.paper.opacity(0.6))
                .padding(.horizontal, 16).padding(.vertical, 8)
                .overlay(Capsule().strokeBorder(Color.white.opacity(0.12)))
                .padding(.top, 12)
            }
            .id("caption\(i)")
            .transition(.opacity.combined(with: .offset(y: 8)))
            .frame(minHeight: 150, alignment: .top)
            .padding(.top, 24)

            HStack(spacing: 24) {
                OBQuiet("Back") { go(i - 1) }.opacity(i == 0 ? 0 : 1).disabled(i == 0)
                OBPrimary(last ? "Got it" : "Next") { if last { onFinish() } else { go(i + 1) } }
                if !last { OBQuiet("Skip") { onFinish() } }
            }
            .padding(.top, 24)
        }
        .frame(maxWidth: 640)
        #if os(macOS)
        .onKeyPress(.rightArrow) { go(i + 1); return .handled }
        .onKeyPress(.leftArrow) { go(i - 1); return .handled }
        #endif
    }

    private var rail: some View {
        Group {
            if compact {
                ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 4) { railItems }.padding(10) }
            } else {
                VStack(spacing: 4) { railItems; Spacer(minLength: 0) }.padding(12).frame(width: 192)
            }
        }
    }

    private var railItems: some View {
        ForEach(Array(stops.enumerated()), id: \.offset) { n, s in
            Button { go(n) } label: {
                HStack(spacing: 10) {
                    Image(systemName: s.symbol).font(.system(size: 14)).frame(width: 18)
                    Text(s.label).font(.system(size: 15))
                    Spacer(minLength: 0)
                    if n != i && seen.contains(n) && !compact { Image(systemName: "checkmark").font(.system(size: 10, weight: .semibold)).foregroundStyle(Color.paper.opacity(0.35)) }
                }
                .foregroundStyle(n == i ? Color.black : Color.paper.opacity(0.55))
                .padding(.horizontal, 12).frame(height: 40)
                .background { if n == i { RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.paper).matchedGeometryEffect(id: "hl", in: space) } }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: the pictures of each page

private struct TBox<Content: View>: View {
    var pad: CGFloat = 12
    @ViewBuilder let content: Content
    var body: some View {
        content.padding(pad)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.04)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.white.opacity(0.10)))
    }
}

private struct Hot<Content: View>: View {
    var shape: AnyShape = AnyShape(Capsule())
    @ViewBuilder let content: Content
    @State private var on = false
    var body: some View {
        content.padding(2)
            .overlay(shape.stroke(Color.paper.opacity(on ? 0.35 : 0.8), lineWidth: 2))
            .onAppear { withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) { on = true } }
    }
}

private struct TChip: View {
    enum Tone { case green, amber, blue }
    let text: String
    let tone: Tone
    var body: some View {
        let c: Color = tone == .green ? Color(red: 0.43, green: 0.9, blue: 0.64) : tone == .amber ? Color(red: 0.99, green: 0.85, blue: 0.45) : Color(red: 0.5, green: 0.8, blue: 1)
        Text(text).font(.system(size: 10.5)).foregroundStyle(c).padding(.horizontal, 8).frame(height: 20).background(Capsule().fill(c.opacity(0.15)))
    }
}

private struct THead: View {
    let title: String
    var note: String? = nil
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.display(20)).foregroundStyle(Color.paper)
            Spacer()
            if let note { Text(note).font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.4)) }
        }
    }
}

private struct TStat: View {
    let v: String
    let k: String
    var body: some View {
        TBox(pad: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text(v).font(.system(size: 17).monospacedDigit()).foregroundStyle(Color.paper)
                Text(k).font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct TThumb: View {
    let n: Int
    var body: some View {
        let hues: [Double] = [0.02, 0.6, 0.08, 0.75, 0.13, 0.5, 0.95, 0.33]
        let h = hues[n % hues.count]
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(LinearGradient(colors: [Color(hue: h, saturation: 0.55, brightness: 0.8), Color(hue: h, saturation: 0.7, brightness: 0.25)], startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: 32, height: 32)
    }
}

private struct TRow: View {
    let n: Int?
    let title: String
    var sub: String? = nil
    var chip: (String, TChip.Tone)? = nil
    var trailing: String? = nil
    var body: some View {
        TBox(pad: 10) {
            HStack(spacing: 12) {
                if let n { TThumb(n: n) }
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(size: 13)).foregroundStyle(Color.paper).lineLimit(1)
                    if let sub { Text(sub).font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45)).lineLimit(1) }
                }
                Spacer(minLength: 0)
                if let trailing { Text(trailing).font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.5)) }
                if let chip { TChip(text: chip.0, tone: chip.1) }
            }
        }
    }
}

private struct TourMockView: View {
    let kind: TourMock
    @State private var shown = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            switch kind {
            case .overview:
                THead(title: "Overview", note: "Example numbers")
                TBox(pad: 14) {
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Available to withdraw").font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45))
                            Text("$128.40").font(.display(36)).foregroundStyle(Color.paper)
                        }
                        Spacer()
                        TChip(text: "+ $12.10 today", tone: .green)
                    }
                }
                HStack(spacing: 10) { TStat(v: "48.2K", k: "Verified views"); TStat(v: "12", k: "Clips"); TStat(v: "9", k: "Approved") }
                HStack {
                    Text("Next step: link your TikTok").font(.system(size: 13)).foregroundStyle(Color.black)
                    Spacer()
                    Hot { Image(systemName: "arrow.right").font(.system(size: 13, weight: .medium)).foregroundStyle(Color.black).padding(4) }
                }
                .padding(.horizontal, 16).padding(.vertical, 10).background(Capsule().fill(Color.paper))
            case .submissions:
                THead(title: "Submissions", note: "Example clips")
                TBox(pad: 10) {
                    HStack {
                        Text("Paste the link to your post").font(.system(size: 13)).foregroundStyle(Color.paper.opacity(0.45))
                        Spacer()
                        Hot { Text("Submit").font(.system(size: 12)).foregroundStyle(Color.black).padding(.horizontal, 12).frame(height: 28).background(Capsule().fill(Color.paper)) }
                    }
                }
                TRow(n: 0, title: "Red Room", sub: "TikTok · 18.4K views", chip: ("Approved", .green))
                TRow(n: 1, title: "Night Drive", sub: "Instagram · 6.1K views", chip: ("Checking", .amber))
                TRow(n: 2, title: "Static Bloom", sub: "YouTube · 23.7K views", chip: ("Paid", .blue))
            case .earnings:
                THead(title: "Earnings", note: "Last 7 days, example")
                TBox(pad: 14) {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(alignment: .bottom) {
                            Text("$128.40").font(.display(36)).foregroundStyle(Color.paper)
                            Spacer()
                            Hot {
                                HStack(spacing: 6) { Image(systemName: "banknote").font(.system(size: 12)); Text("Withdraw").font(.system(size: 12)) }
                                    .foregroundStyle(Color.black).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(Color.paper))
                            }
                        }
                        HStack(alignment: .bottom, spacing: 8) {
                            ForEach(Array([28, 46, 36, 62, 54, 80, 96].enumerated()), id: \.offset) { n, h in
                                UnevenRoundedRectangle(topLeadingRadius: 5, topTrailingRadius: 5)
                                    .fill(Color.paper.opacity(n == 6 ? 1 : 0.25))
                                    .frame(height: shown ? CGFloat(h) * 0.8 : 0)
                                    .animation(.spring(duration: 0.7, bounce: 0.1).delay(0.1 + Double(n) * 0.05), value: shown)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .frame(height: 80, alignment: .bottom)
                    }
                }
                HStack(spacing: 8) {
                    Image(systemName: "checkmark").font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.good)
                    Text("Minimum to withdraw is $10. PayPal fees are on us.").font(.system(size: 12)).foregroundStyle(Color.paper.opacity(0.5))
                }
            case .profile:
                THead(title: "Profile", note: "This is public")
                VStack(spacing: 0) {
                    LinearGradient(colors: [Color(red: 0.43, green: 0.36, blue: 0.82), Color(red: 0.16, green: 0.16, blue: 0.37), Color(red: 0.06, green: 0.06, blue: 0.09)], startPoint: .topLeading, endPoint: .bottomTrailing).frame(height: 64)
                    HStack(alignment: .bottom) {
                        HStack(alignment: .bottom, spacing: 12) {
                            Circle().fill(RadialGradient(colors: [Color(red: 1, green: 0.85, blue: 0.66), Color(red: 0.88, green: 0.44, blue: 0.48), Color(red: 0.29, green: 0.16, blue: 0.42)], center: .topLeading, startRadius: 2, endRadius: 40))
                                .frame(width: 56, height: 56).overlay(Circle().strokeBorder(Color.black, lineWidth: 2)).offset(y: -22).padding(.bottom, -22)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Your name").font(.display(20)).foregroundStyle(Color.paper)
                                Text("logoless.io/@you").font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45))
                            }
                        }
                        Spacer()
                        HStack(spacing: 6) {
                            Hot { Image(systemName: "play.rectangle").font(.system(size: 12)).frame(width: 28, height: 28).foregroundStyle(Color.paper).background(Circle().fill(Color.white.opacity(0.06))) }
                            Image(systemName: "camera").font(.system(size: 12)).frame(width: 28, height: 28).foregroundStyle(Color.paper).background(Circle().fill(Color.white.opacity(0.06)))
                            Image(systemName: "play.circle").font(.system(size: 12)).frame(width: 28, height: 28).foregroundStyle(Color.paper).background(Circle().fill(Color.white.opacity(0.06)))
                        }
                    }
                    .padding(.horizontal, 14).padding(.bottom, 14).padding(.top, 8)
                }
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.white.opacity(0.10)))
                Text("Verified accounts get a tick, and brands notice.").font(.system(size: 12)).foregroundStyle(Color.paper.opacity(0.5))
            case .settings:
                THead(title: "Settings")
                ForEach([("bell", "Email me about payouts", true), ("link", "Discord", true), ("gearshape", "Password and account", false)], id: \.1) { icon, title, on in
                    TBox(pad: 12) {
                        HStack(spacing: 12) {
                            Image(systemName: icon).font(.system(size: 14)).foregroundStyle(Color.paper.opacity(0.6)).frame(width: 18)
                            Text(title).font(.system(size: 13)).foregroundStyle(Color.paper)
                            Spacer()
                            if on {
                                Hot { Capsule().fill(Color.paper).frame(width: 36, height: 20).overlay(alignment: .trailing) { Circle().fill(Color.black).frame(width: 16, height: 16).padding(.trailing, 2) } }
                            } else {
                                Image(systemName: "arrow.right").font(.system(size: 12)).foregroundStyle(Color.paper.opacity(0.4))
                            }
                        }
                    }
                }
            case .brandOverview:
                THead(title: "Overview", note: "Example numbers")
                HStack(spacing: 10) { TStat(v: "3", k: "Live campaigns"); TStat(v: "214K", k: "Views bought"); TStat(v: "$640", k: "Spent") }
                TBox(pad: 14) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Balance").font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45))
                            Text("$1,360.00").font(.display(30)).foregroundStyle(Color.paper)
                        }
                        Spacer()
                        Hot {
                            HStack(spacing: 6) { Image(systemName: "megaphone").font(.system(size: 12)); Text("New campaign").font(.system(size: 12)) }
                                .foregroundStyle(Color.black).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(Color.paper))
                        }
                    }
                }
            case .campaigns:
                THead(title: "Campaigns", note: "Example campaigns")
                ForEach(Array([("Red Room", "$3 per 1K", 0.62), ("Static Bloom", "$2.50 per 1K", 0.28), ("Night Drive", "$4 per 1K", 0.91)].enumerated()), id: \.offset) { n, c in
                    TBox(pad: 10) {
                        HStack(spacing: 12) {
                            TThumb(n: n)
                            VStack(alignment: .leading, spacing: 6) {
                                HStack { Text(c.0).font(.system(size: 13)).foregroundStyle(Color.paper); Spacer(); Text(c.1).font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.5)) }
                                GeometryReader { g in
                                    ZStack(alignment: .leading) {
                                        Capsule().fill(Color.white.opacity(0.10))
                                        Capsule().fill(Color.paper).frame(width: shown ? g.size.width * c.2 : 0).animation(.spring(duration: 0.8, bounce: 0.05).delay(0.15 + Double(n) * 0.1), value: shown)
                                    }
                                }
                                .frame(height: 6)
                            }
                        }
                    }
                }
                Hot { Text("Pause or change budget").font(.system(size: 12)).foregroundStyle(Color.paper).padding(.horizontal, 16).frame(height: 32) }
            case .brandSubmissions:
                THead(title: "Submissions", note: "Example clips")
                TRow(n: 0, title: "@maya.cuts", sub: "TikTok · 41.2K views", chip: ("Approved", .green))
                TRow(n: 1, title: "@clipwolf", sub: "YouTube · 18.9K views", chip: ("Approved", .green))
                TRow(n: 2, title: "@nova", sub: "Instagram · 3.3K views", chip: ("Checking", .amber))
            case .balance:
                THead(title: "Balance", note: "Example")
                TBox(pad: 14) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Available").font(.system(size: 11)).foregroundStyle(Color.paper.opacity(0.45))
                        HStack(alignment: .bottom) {
                            Text("$1,360.00").font(.display(36)).foregroundStyle(Color.paper)
                            Spacer()
                            Hot {
                                HStack(spacing: 6) { Image(systemName: "dollarsign.circle").font(.system(size: 12)); Text("Add funds").font(.system(size: 12)) }
                                    .foregroundStyle(Color.black).padding(.horizontal, 12).frame(height: 30).background(Capsule().fill(Color.paper))
                            }
                        }
                    }
                }
                TRow(n: nil, title: "Red Room", trailing: "$310 drawn")
                TRow(n: nil, title: "Static Bloom", trailing: "$180 drawn")
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .onAppear { shown = true }
    }
}
