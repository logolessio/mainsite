import SwiftUI

// The parts the site's onboarding is made of (components/onboarding/onboarding-flow.tsx), drawn the same way.

enum OBState { case idle, checking, ok, bad }

let emerald = Color(red: 0.063, green: 0.725, blue: 0.506)
let redSignal = Color(red: 0.937, green: 0.267, blue: 0.267)

/// Types a line out one letter at a time. The letters still to come are already on the page (invisible), so the line takes its final shape from the
/// first letter and nothing below it moves.
struct TypedLine: View {
    let text: String
    let size: CGFloat
    var speed: Double = 0.024
    var onReady: () -> Void = {}
    var onDone: () -> Void = {}
    @Environment(\.accessibilityReduceMotion) private var reduce
    @State private var n = Snap.flat ? 10_000 : 0

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { tl in
            let blink = Int(tl.date.timeIntervalSinceReferenceDate / 0.5) % 2 == 0
            Text(attributed(cursor: n < text.count || blink))
                .font(.display(size))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: size * 2.2, alignment: .top)
                .accessibilityLabel(text)
        }
        .task(id: text) { await type() }
    }

    private func attributed(cursor: Bool) -> AttributedString {
        let k = min(n, text.count)
        var vis = AttributedString(String(text.prefix(k))); vis.foregroundColor = Color.paper
        var cur = AttributedString("|"); cur.foregroundColor = cursor ? Color.paper : Color.clear; cur.font = .system(size: size * 0.85, weight: .ultraLight)
        var tail = AttributedString(String(text.dropFirst(k))); tail.foregroundColor = Color.clear
        return vis + cur + tail
    }

    private func type() async {
        n = 0
        if reduce || Snap.flat { n = text.count; onReady(); onDone(); return }
        var fired = false
        for i in 1...max(1, text.count) {
            try? await Task.sleep(for: .seconds(speed))
            if Task.isCancelled { return }
            n = i
            if !fired && i >= Int((Double(text.count) * 0.6).rounded(.up)) { fired = true; onReady() }
        }
        onDone()
    }
}

/// The little icon at the end of a field: a spinner while we look, a green tick when it is good, a red cross when it is not.
struct StatusIcon: View {
    let st: OBState
    var body: some View {
        ZStack {
            switch st {
            case .checking: ProgressView().controlSize(.small).tint(Color.paper.opacity(0.6)).transition(.opacity)
            case .ok: Image(systemName: "checkmark").font(.system(size: 13, weight: .heavy)).foregroundStyle(.black).frame(width: 24, height: 24).background(emerald, in: Circle()).transition(.scale(scale: 0.3).combined(with: .opacity))
            case .bad: Image(systemName: "xmark").font(.system(size: 13, weight: .heavy)).foregroundStyle(.white).frame(width: 24, height: 24).background(redSignal, in: Circle()).transition(.scale(scale: 0.3).combined(with: .opacity))
            case .idle: Color.clear
            }
        }
        .frame(width: 28, height: 28)
        .animation(.spring(duration: 0.3, bounce: 0.4), value: st)
    }
}

/// An underlined field that answers as you type. The line turns green or red along with the icon.
struct AnswerField: View {
    @Binding var text: String
    let st: OBState
    let msg: String
    var placeholder = ""
    var prefix: String?
    var secure = false
    var numeric = false
    var maxLength = 80
    var onSubmit: () -> Void = {}
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                if let prefix { Text(prefix).font(.system(size: 24)).foregroundStyle(.mute) }
                TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(Color.paper.opacity(0.3)))
                    .textFieldStyle(.plain)
                    .font(.system(size: 24))
                    .foregroundStyle(Color.paper)
                    .multilineTextAlignment(prefix == nil ? .center : .leading)
                    .focused($focused)
                    .autocorrectionDisabled()
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    .keyboardType(numeric ? .numberPad : .default)
                    #endif
                    .onSubmit(onSubmit)
                    .onChange(of: text) { _, v in
                        var t = numeric ? v.filter(\.isNumber) : v
                        if t.count > maxLength { t = String(t.prefix(maxLength)) }
                        if t != v { text = t }
                    }
                StatusIcon(st: st)
            }
            .padding(.bottom, 12)
            .overlay(alignment: .bottom) { Rectangle().fill(st == .ok ? emerald : st == .bad ? redSignal : focused ? Color.paper : Color.white.opacity(0.22)).frame(height: 1).animation(.easeInOut(duration: 0.3), value: st) }
            Text(st == .checking ? "Checking" : msg)
                .font(.system(size: 14)).foregroundStyle(st == .ok ? emerald : st == .bad ? redSignal : Color.mute)
                .frame(maxWidth: .infinity, minHeight: 20).padding(.top, 12)
        }
        .frame(maxWidth: 448)
        .onAppear { focused = true }
    }
}

/// The site's main button: a paper pill, 56 tall.
struct OBPrimary: View {
    let title: String
    var busy = false
    let action: () -> Void
    @Environment(\.isEnabled) private var enabled
    init(_ title: String, busy: Bool = false, action: @escaping () -> Void) { self.title = title; self.busy = busy; self.action = action }
    var body: some View {
        Button(action: action) {
            Text(busy ? "One moment" : title).font(.system(size: 17, weight: .medium)).foregroundStyle(Color.black).padding(.horizontal, 40).frame(height: 56).contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .pane(Capsule(), tint: Color.paper.opacity(enabled ? 0.95 : 0.3), interactive: true)
        .opacity(enabled ? 1 : 0.5)
    }
}

/// A quiet underlined link under a button.
struct OBQuiet: View {
    let title: String
    let action: () -> Void
    init(_ title: String, action: @escaping () -> Void) { self.title = title; self.action = action }
    var body: some View {
        Button(action: action) { Text(title).font(.system(size: 15)).foregroundStyle(.mute).underline().contentShape(Rectangle()) }.buttonStyle(.plain)
    }
}

/// Choices as big words side by side. Pointing at one makes it grow and the others step back.
struct SplitChoice: View {
    let options: [(label: String, hint: String, action: () -> Void)]
    @State private var hover: String?
    @Environment(\.compact) private var compact

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(options.enumerated()), id: \.offset) { i, o in
                if i > 0 { Rectangle().fill(Color.white.opacity(0.22)).frame(width: 1) }
                Button(action: o.action) {
                    VStack(spacing: 12) {
                        Text(o.label).font(.display(compact ? 34 : 48)).foregroundStyle(Color.paper)
                        Text(o.hint).font(.system(size: 14)).foregroundStyle(.mute).multilineTextAlignment(.center).frame(maxWidth: 176)
                        Image(systemName: "arrow.right").font(.system(size: 16)).foregroundStyle(Color.paper).opacity(hover == o.label ? 1 : 0).offset(x: hover == o.label ? 0 : -8)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 24)
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .scaleEffect(hover == o.label ? 1.04 : 1)
                    .opacity(hover != nil && hover != o.label ? 0.35 : 1)
                }
                .buttonStyle(.plain)
                .onHover { hover = $0 ? o.label : (hover == o.label ? nil : hover) }
            }
        }
        .frame(maxWidth: 576)
        .animation(.easeOut(duration: 0.3), value: hover)
    }
}

/// The one way in: a card that opens the website's own sign-in in a secure window (Google, Discord and email all work there).
struct OBMethodCard: View {
    let title: String
    let sub: String
    var busy = false
    let action: () -> Void
    @State private var hover = false
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 26, height: 20).foregroundStyle(Color.black).frame(width: 48, height: 48).background(Color.paper, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(busy ? "Opening the sign-in window" : title).font(.system(size: 17, weight: .medium)).foregroundStyle(Color.paper)
                    Text(sub).font(.system(size: 14)).foregroundStyle(.mute)
                }
                Spacer(minLength: 0)
                ZStack {
                    Circle().strokeBorder(hover ? Color.paper : Color.white.opacity(0.22)).background(Circle().fill(hover ? Color.paper : .clear))
                    if busy { ProgressView().controlSize(.small).tint(hover ? .black : Color.paper) } else { Image(systemName: "arrow.right").font(.system(size: 14, weight: .medium)).foregroundStyle(hover ? Color.black : Color.paper) }
                }
                .frame(width: 36, height: 36)
            }
            .padding(.leading, 14).padding(.trailing, 20).padding(.vertical, 14)
            .frame(maxWidth: 448)
            .background(hover ? Color.white.opacity(0.04) : .clear, in: RoundedRectangle(cornerRadius: 27, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 27, style: .continuous).strokeBorder(hover ? Color.paper.opacity(0.7) : Color.white.opacity(0.22)))
            .offset(y: hover ? -2 : 0)
            .contentShape(RoundedRectangle(cornerRadius: 27, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(busy)
        .onHover { hover = $0 }
        .animation(.easeOut(duration: 0.3), value: hover)
    }
}

/// One rectangular pill holding the picture and the banner side by side. Each half is its own tap target while it is being set up.
struct ProfilePill: View {
    let name: String
    let handle: String
    let look: Look
    var avatar: PlatformImage?
    var banner: PlatformImage?
    var editable = false
    var busy: String?
    var onAvatar: () -> Void = {}
    var onBanner: () -> Void = {}
    @Environment(\.compact) private var compact

    var body: some View {
        let h: CGFloat = compact ? 88 : 120
        HStack(spacing: 12) {
            Button(action: onAvatar) {
                ZStack(alignment: .bottom) {
                    if let avatar { Image(platform: avatar).resizable().scaledToFill() } else { LookArt(look: look, kind: .avatar, letter: String((name.trimmingCharacters(in: .whitespaces).first ?? handle.first ?? " "))) }
                    if busy == "avatar" { ProgressView().controlSize(.small).tint(.white) }
                    if editable && busy == nil { Text("Change").font(.system(size: 11)).foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 28).background(Color.black.opacity(0.45)) }
                }
                .frame(width: h, height: h).clipShape(Circle())
            }
            .buttonStyle(.plain).disabled(!editable).accessibilityLabel("Profile picture")
            Button(action: onBanner) {
                ZStack(alignment: .bottom) {
                    if let banner { Image(platform: banner).resizable().scaledToFill() } else { LookArt(look: look, kind: .banner) }
                    if busy == "banner" { ProgressView().controlSize(.small).tint(.white) }
                    if editable && busy == nil { Text("Change banner").font(.system(size: 11)).foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 28).background(Color.black.opacity(0.45)) }
                }
                .frame(width: h * 16 / 9, height: h).clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            }
            .buttonStyle(.plain).disabled(!editable).accessibilityLabel("Banner")
        }
        .padding(12)
        .overlay(RoundedRectangle(cornerRadius: 32, style: .continuous).strokeBorder(Color.white.opacity(0.22)))
    }
}

/// The ready-made looks: a gradient picture and a banner that go together.
struct LookPicker: View {
    let value: String
    let onPick: (String) -> Void
    var body: some View {
        SiteGrid(columns: 4, spacing: 10) {
            ForEach(Looks.all) { l in
                let on = value == l.id
                Button { onPick(l.id) } label: {
                    ZStack(alignment: .bottomLeading) {
                        LookArt(look: l, kind: .banner)
                        LookArt(look: l, kind: .avatar).frame(width: 24, height: 24).clipShape(Circle()).overlay(Circle().strokeBorder(Color.black.opacity(0.4), lineWidth: 2)).padding(6)
                        if on { Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundStyle(.black).frame(width: 20, height: 20).background(Color.paper, in: Circle()).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(6) }
                    }
                    .aspectRatio(4 / 3, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.paper, lineWidth: on ? 2 : 0))
                    .scaleEffect(on ? 1 : 1)
                }
                .buttonStyle(.plain).help(l.name).accessibilityLabel(l.name)
            }
        }
        .frame(maxWidth: 448)
    }
}

/// The line sits in a circle while the wait runs; a thin arc fills round it over the five seconds.
struct SettleOrb: View {
    let line: String
    let note: String
    let seconds: Double
    var size: CGFloat
    @State private var p: CGFloat = 0
    var body: some View {
        ZStack {
            Circle().stroke(Color.paper.opacity(0.2), lineWidth: 2)
            Circle().trim(from: 0, to: Snap.flat ? 0.6 : p).stroke(Color.paper, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(-90))
            VStack(spacing: 12) {
                Text(line).font(.display(min(40, max(27, size * 0.1)))).foregroundStyle(Color.paper).multilineTextAlignment(.center)
                Text(note).font(.system(size: 15)).foregroundStyle(.mute).id(note).transition(.opacity.combined(with: .offset(y: 6)))
            }
            .padding(.horizontal, size * 0.19)
        }
        .frame(width: size, height: size)
        .animation(.easeInOut(duration: 0.25), value: note)
        .onAppear { withAnimation(.timingCurve(0.5, 0, 0.2, 1, duration: seconds)) { p = 1 } }
    }
}

/// White liquid that rises up the whole screen while a profile is made, over the length of the wait. Two waves ride its surface and a soft light
/// drifts inside it.
struct LiquidFill: View {
    let seconds: Double
    @State private var start = Date()
    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { tl in
                let t = tl.date.timeIntervalSince(start)
                let f = min(1, t / seconds)
                let ease = f < 0.5 ? 2 * f * f : 1 - pow(-2 * f + 2, 2) / 2
                let top = geo.size.height * (1.02 - 1.08 * ease)
                Canvas { ctx, size in
                    // the body of the liquid
                    let body = Path(CGRect(x: 0, y: top, width: size.width, height: size.height * 1.2))
                    ctx.fill(body, with: .linearGradient(Gradient(colors: [.white, Color(red: 0.965, green: 0.973, blue: 1), Color(red: 0.89, green: 0.918, blue: 1)]), startPoint: CGPoint(x: 0, y: top), endPoint: CGPoint(x: 0, y: size.height)))
                    // a soft light drifting inside it
                    let dx = sin(t / 9 * .pi * 2) * size.width * 0.08
                    ctx.fill(Path(ellipseIn: CGRect(x: -size.width * 0.1 + dx, y: top - size.height * 0.1, width: size.width * 0.7, height: size.width * 0.7)), with: .radialGradient(Gradient(colors: [.white, .clear]), center: CGPoint(x: size.width * 0.25 + dx, y: top + size.height * 0.2), startRadius: 0, endRadius: size.width * 0.35))
                    ctx.fill(Path(ellipseIn: CGRect(x: size.width * 0.6, y: top + size.height * 0.3, width: size.width * 0.6, height: size.width * 0.6)), with: .radialGradient(Gradient(colors: [Color(red: 0.77, green: 0.84, blue: 1).opacity(0.8), .clear]), center: CGPoint(x: size.width * 0.9 - dx, y: top + size.height * 0.5), startRadius: 0, endRadius: size.width * 0.3))
                    // two waves along the surface
                    for (k, a) in [(0, 0.55), (1, 1.0)] {
                        let amp = size.height * 0.018
                        let period = Double(size.width) * (k == 0 ? 0.9 : 0.6)
                        let shift = t * (k == 0 ? -40 : 70)
                        var wave = Path()
                        wave.move(to: CGPoint(x: 0, y: top))
                        var x = 0.0
                        while x <= Double(size.width) + 6 {
                            wave.addLine(to: CGPoint(x: x, y: Double(top) - amp - sin((x + shift) / period * .pi * 2) * amp))
                            x += 6
                        }
                        wave.addLine(to: CGPoint(x: Double(size.width) + 6, y: Double(top) + 2)); wave.addLine(to: CGPoint(x: 0, y: Double(top) + 2)); wave.closeSubpath()
                        ctx.fill(wave, with: .color(.white.opacity(a)))
                    }
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}
