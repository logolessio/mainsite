import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import '../core/models.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';

// The parts the site's onboarding is made of (components/onboarding/onboarding-flow.tsx), drawn the same way.

enum ObState { idle, checking, ok, bad }

const emerald = Color(0xFF10B981);
const redSignal = Color(0xFFEF4444);

/// Types a line out one letter at a time. The letters still to come are already on the page (invisible), so the line takes its final shape from the
/// first letter and nothing below it moves.
class TypedLine extends StatefulWidget {
  const TypedLine(
      {super.key,
      required this.text,
      required this.size,
      this.onReady,
      this.onDone});
  final String text;
  final double size;
  final VoidCallback? onReady, onDone;
  @override
  State<TypedLine> createState() => _TypedLineState();
}

class _TypedLineState extends State<TypedLine> {
  int _n = 0;
  Timer? _typing, _blink;
  bool _on = true;

  @override
  void initState() {
    super.initState();
    _blink = Timer.periodic(const Duration(milliseconds: 500),
        (_) => mounted ? setState(() => _on = !_on) : null);
  }

  bool _began = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_began) {
      _began = true;
      _start();
    } // needs MediaQuery, so not in initState
  }

  @override
  void didUpdateWidget(TypedLine old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text) _start();
  }

  void _start() {
    _typing?.cancel();
    _n = 0;
    final total = widget.text.length;
    if (MediaQuery.maybeDisableAnimationsOf(context) == true || total == 0) {
      _n = total;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.onReady?.call();
        widget.onDone?.call();
      });
      return;
    }
    var fired = false;
    _typing = Timer.periodic(const Duration(milliseconds: 24), (t) {
      if (!mounted) return t.cancel();
      setState(() => _n++);
      if (!fired && _n >= (total * 0.6).ceil()) {
        fired = true;
        widget.onReady?.call();
      }
      if (_n >= total) {
        t.cancel();
        widget.onDone?.call();
      }
    });
  }

  @override
  void dispose() {
    _typing?.cancel();
    _blink?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.text;
    final k = math.min(_n, t.length);
    final style = display(widget.size, height: 1.08);
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: widget.size * 2.2),
      child: Semantics(
        label: t,
        child: RichText(
          textAlign: TextAlign.center,
          text: TextSpan(style: style, children: [
            TextSpan(text: t.substring(0, k)),
            TextSpan(
                text: '|',
                style: style.copyWith(
                    fontWeight: FontWeight.w100,
                    color:
                        (k < t.length || _on) ? C.paper : Colors.transparent)),
            TextSpan(
                text: t.substring(k),
                style: style.copyWith(color: Colors.transparent)),
          ]),
        ),
      ),
    );
  }
}

/// The little icon at the end of a field: a spinner while we look, a green tick when it is good, a red cross when it is not.
class StatusIcon extends StatelessWidget {
  const StatusIcon(this.st, {super.key});
  final ObState st;
  @override
  Widget build(BuildContext context) => SizedBox(
        width: 28,
        height: 28,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: switch (st) {
            ObState.checking => const Center(
                key: ValueKey('c'),
                child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: C.mute))),
            ObState.ok => Container(
                key: const ValueKey('o'),
                width: 24,
                height: 24,
                decoration:
                    const BoxDecoration(color: emerald, shape: BoxShape.circle),
                child: const Icon(Icons.check_rounded,
                    size: 16, color: Colors.black)),
            ObState.bad => Container(
                key: const ValueKey('b'),
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                    color: redSignal, shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded,
                    size: 16, color: Colors.white)),
            ObState.idle => const SizedBox.shrink(key: ValueKey('i')),
          },
        ),
      );
}

/// An underlined field that answers as you type. The line turns green or red along with the icon.
class AnswerField extends StatefulWidget {
  const AnswerField(
      {super.key,
      required this.controller,
      required this.st,
      required this.msg,
      this.hint = '',
      this.prefix,
      this.numeric = false,
      this.maxLength = 80,
      this.onSubmit,
      this.onChanged,
      this.keyboard});
  final TextEditingController controller;
  final ObState st;
  final String msg, hint;
  final String? prefix;
  final bool numeric;
  final int maxLength;
  final VoidCallback? onSubmit;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboard;
  @override
  State<AnswerField> createState() => _AnswerFieldState();
}

class _AnswerFieldState extends State<AnswerField> {
  final _focus = FocusNode();
  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final line = widget.st == ObState.ok
        ? emerald
        : widget.st == ObState.bad
            ? redSignal
            : (_focus.hasFocus
                ? C.paper
                : Colors.white.withValues(alpha: 0.22));
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 448),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.only(bottom: 12),
          decoration:
              BoxDecoration(border: Border(bottom: BorderSide(color: line))),
          child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                if (widget.prefix != null)
                  Text(widget.prefix!, style: body(24, color: C.mute)),
                Expanded(
                  child: TextField(
                    controller: widget.controller,
                    focusNode: _focus,
                    autofocus: true,
                    onChanged: (v) {
                      setState(() {});
                      widget.onChanged?.call(v);
                    },
                    onSubmitted: (_) => widget.onSubmit?.call(),
                    maxLength: widget.maxLength,
                    keyboardType:
                        widget.numeric ? TextInputType.number : widget.keyboard,
                    textAlign: widget.prefix == null
                        ? TextAlign.center
                        : TextAlign.start,
                    style: body(24),
                    cursorColor: C.paper,
                    autocorrect: false,
                    enableSuggestions: false,
                    decoration: InputDecoration(
                        counterText: '',
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                        hintText: widget.hint,
                        hintStyle:
                            body(24, color: C.paper.withValues(alpha: 0.3))),
                  ),
                ),
                StatusIcon(widget.st),
              ]),
        ),
        Padding(
            padding: const EdgeInsets.only(top: 12),
            child: SizedBox(
                height: 20,
                child: Text(
                    widget.st == ObState.checking ? 'Checking' : widget.msg,
                    style: body(14,
                        color: widget.st == ObState.ok
                            ? emerald
                            : widget.st == ObState.bad
                                ? redSignal
                                : C.mute)))),
      ]),
    );
  }
}

/// The site's main button: a paper pill, 56 tall.
class ObPrimary extends StatelessWidget {
  const ObPrimary(this.title, {super.key, this.busy = false, this.onTap});
  final String title;
  final bool busy;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Press(
        onTap: busy ? null : onTap,
        enabled: onTap != null,
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 40),
          decoration: BoxDecoration(
              color: C.paper.withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(999)),
          child: Center(
              widthFactor: 1,
              child: Text(busy ? 'One moment' : title,
                  style: body(17, color: Colors.black, weight: 500))),
        ),
      );
}

/// A quiet underlined link under a button.
class ObQuiet extends StatelessWidget {
  const ObQuiet(this.title, {super.key, required this.onTap});
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Press(
      onTap: onTap,
      child: Text(title,
          style: body(15, color: C.mute).copyWith(
              decoration: TextDecoration.underline, decorationColor: C.mute)));
}

/// Choices as big words side by side. Pointing at one makes it grow and the others step back.
class SplitChoice extends StatefulWidget {
  const SplitChoice({super.key, required this.options});
  final List<(String, String, VoidCallback)> options;
  @override
  State<SplitChoice> createState() => _SplitChoiceState();
}

class _SplitChoiceState extends State<SplitChoice> {
  String? _hover;
  @override
  Widget build(BuildContext context) {
    final compact = isCompact(context);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 576),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (var i = 0; i < widget.options.length; i++) ...[
          Expanded(
            child: MouseRegion(
              onEnter: (_) => setState(() => _hover = widget.options[i].$1),
              onExit: (_) => setState(() => _hover = null),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: widget.options[i].$3,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 300),
                  opacity: _hover != null && _hover != widget.options[i].$1
                      ? 0.35
                      : 1,
                  child: AnimatedScale(
                    duration: const Duration(milliseconds: 300),
                    scale: _hover == widget.options[i].$1 ? 1.04 : 1,
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 168),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 24),
                      decoration: i == 0
                          ? null
                          : BoxDecoration(
                              border: Border(
                                  left: BorderSide(
                                      color: Colors.white
                                          .withValues(alpha: 0.22)))),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(widget.options[i].$1,
                            style: display(compact ? 34 : 48)),
                        const SizedBox(height: 12),
                        ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 176),
                            child: Text(widget.options[i].$2,
                                textAlign: TextAlign.center,
                                style: body(14, color: C.mute, height: 1.3))),
                        const SizedBox(height: 16),
                        Icon(Icons.arrow_forward_rounded,
                            size: 20,
                            color: C.paper.withValues(
                                alpha: _hover == widget.options[i].$1 ? 1 : 0)),
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ]),
    );
  }
}

/// The one way in: a card that opens the website's own sign-in in a secure window (Google, Discord and email all work there).
class ObMethodCard extends StatefulWidget {
  const ObMethodCard(
      {super.key,
      required this.title,
      required this.sub,
      this.busy = false,
      required this.onTap});
  final String title, sub;
  final bool busy;
  final VoidCallback onTap;
  @override
  State<ObMethodCard> createState() => _ObMethodCardState();
}

class _ObMethodCardState extends State<ObMethodCard> {
  bool _hover = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hover = true),
        onExit: (_) => setState(() => _hover = false),
        child: GestureDetector(
          onTap: widget.busy ? null : widget.onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            transform: Matrix4.translationValues(0, _hover ? -2 : 0, 0),
            constraints: const BoxConstraints(maxWidth: 448),
            padding: const EdgeInsets.fromLTRB(14, 14, 20, 14),
            decoration: BoxDecoration(
                color: _hover
                    ? Colors.white.withValues(alpha: 0.04)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(27),
                border: Border.all(
                    color: _hover
                        ? C.paper.withValues(alpha: 0.7)
                        : Colors.white.withValues(alpha: 0.22))),
            child: Row(children: [
              Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                      color: C.paper, shape: BoxShape.circle),
                  child: Center(
                      child: Image.asset('assets/images/mark.png',
                          width: 26, color: Colors.black))),
              const SizedBox(width: 16),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(
                        widget.busy
                            ? 'Opening the sign-in window'
                            : widget.title,
                        style: body(17, weight: 500)),
                    const SizedBox(height: 2),
                    Text(widget.sub, style: body(14, color: C.mute))
                  ])),
              AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _hover ? C.paper : Colors.transparent,
                      border: Border.all(
                          color: _hover
                              ? C.paper
                              : Colors.white.withValues(alpha: 0.22))),
                  child: widget.busy
                      ? Padding(
                          padding: const EdgeInsets.all(9),
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _hover ? Colors.black : C.paper))
                      : Icon(Icons.arrow_forward_rounded,
                          size: 16, color: _hover ? Colors.black : C.paper)),
            ]),
          ),
        ),
      );
}

/// One rectangular pill holding the picture and the banner side by side. Each half is its own tap target while it is being set up.
class ProfilePill extends StatelessWidget {
  const ProfilePill(
      {super.key,
      required this.name,
      required this.handle,
      required this.look,
      this.avatar,
      this.banner,
      this.editable = false,
      this.busy,
      this.onAvatar,
      this.onBanner});
  final String name, handle;
  final Look look;
  final ImageProvider? avatar, banner;
  final bool editable;
  final String? busy;
  final VoidCallback? onAvatar, onBanner;

  Widget _over(String label) => Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
          height: 28,
          color: Colors.black.withValues(alpha: 0.45),
          alignment: Alignment.center,
          child: Text(label, style: body(11, color: Colors.white))));

  @override
  Widget build(BuildContext context) {
    final h = isCompact(context) ? 88.0 : 120.0;
    final letter = (name.trim().isNotEmpty
            ? name.trim()
            : (handle.isNotEmpty ? handle : ' '))
        .substring(0, 1);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        GestureDetector(
          onTap: editable ? onAvatar : null,
          child: ClipOval(
              child: SizedBox(
                  width: h,
                  height: h,
                  child: Stack(fit: StackFit.expand, children: [
                    if (avatar != null)
                      Image(image: avatar!, fit: BoxFit.cover)
                    else
                      LookArt(look, letter: letter),
                    if (busy == 'avatar')
                      const Center(
                          child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))),
                    if (editable && busy == null) _over('Change'),
                  ]))),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: editable ? onBanner : null,
          child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: SizedBox(
                  width: h * 16 / 9,
                  height: h,
                  child: Stack(fit: StackFit.expand, children: [
                    if (banner != null)
                      Image(image: banner!, fit: BoxFit.cover)
                    else
                      LookArt(look, banner: true),
                    if (busy == 'banner')
                      const Center(
                          child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))),
                    if (editable && busy == null) _over('Change banner'),
                  ]))),
        ),
      ]),
    );
  }
}

/// The ready-made looks: a gradient picture and a banner that go together.
class LookPicker extends StatelessWidget {
  const LookPicker({super.key, required this.value, required this.onPick});
  final String value;
  final ValueChanged<String> onPick;
  @override
  Widget build(BuildContext context) => ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 448),
        child: GridView.count(
          crossAxisCount: 4,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 4 / 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (final l in Looks.all)
              Tooltip(
                message: l.name,
                child: Press(
                  onTap: () => onPick(l.id),
                  child: Container(
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: C.paper, width: value == l.id ? 2 : 0)),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(fit: StackFit.expand, children: [
                      LookArt(l, banner: true),
                      Positioned(
                          left: 6,
                          bottom: 6,
                          child: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color:
                                          Colors.black.withValues(alpha: 0.4),
                                      width: 2)),
                              clipBehavior: Clip.antiAlias,
                              child: LookArt(l))),
                      if (value == l.id)
                        Positioned(
                            top: 6,
                            right: 6,
                            child: Container(
                                width: 20,
                                height: 20,
                                decoration: const BoxDecoration(
                                    color: C.paper, shape: BoxShape.circle),
                                child: const Icon(Icons.check,
                                    size: 12, color: Colors.black))),
                    ]),
                  ),
                ),
              ),
          ],
        ),
      );
}

/// The line sits in a circle while the wait runs; a thin arc fills round it over the five seconds.
class SettleOrb extends StatefulWidget {
  const SettleOrb(
      {super.key,
      required this.line,
      required this.note,
      required this.seconds,
      required this.size});
  final String line, note;
  final double seconds, size;
  @override
  State<SettleOrb> createState() => _SettleOrbState();
}

class _SettleOrbState extends State<SettleOrb>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: (widget.seconds * 1000).round()))
    ..forward();
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        width: widget.size,
        height: widget.size,
        child: Stack(alignment: Alignment.center, children: [
          AnimatedBuilder(
              animation: _c,
              builder: (context, _) => CustomPaint(
                  size: Size.square(widget.size),
                  painter:
                      _Arc(const Cubic(0.5, 0, 0.2, 1).transform(_c.value)))),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: widget.size * 0.19),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(widget.line,
                  textAlign: TextAlign.center,
                  style: display(math.min(40, math.max(27, widget.size * 0.1)),
                      height: 1.08)),
              const SizedBox(height: 12),
              AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: Text(widget.note,
                      key: ValueKey(widget.note),
                      style: body(15, color: C.mute))),
            ]),
          ),
        ]),
      );
}

class _Arc extends CustomPainter {
  _Arc(this.t);
  final double t;
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2 - 2;
    final c = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(
        c,
        r,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = C.paper.withValues(alpha: 0.2));
    canvas.drawArc(
        Rect.fromCircle(center: c, radius: r),
        -math.pi / 2,
        2 * math.pi * t,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..color = C.paper);
  }

  @override
  bool shouldRepaint(covariant _Arc old) => old.t != t;
}

/// White liquid that rises up the whole screen while a profile is made, over the length of the wait. Two waves ride its surface and a soft light
/// drifts inside it.
class LiquidFill extends StatefulWidget {
  const LiquidFill({super.key, required this.seconds});
  final double seconds;
  @override
  State<LiquidFill> createState() => _LiquidFillState();
}

class _LiquidFillState extends State<LiquidFill>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final ValueNotifier<double> _t = ValueNotifier(0);
  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) => _t.value = d.inMicroseconds / 1e6)..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
      child: CustomPaint(
          painter: _LiquidPainter(_t, widget.seconds), size: Size.infinite));
}

class _LiquidPainter extends CustomPainter {
  _LiquidPainter(this.t, this.seconds) : super(repaint: t);
  final ValueNotifier<double> t;
  final double seconds;
  @override
  void paint(Canvas canvas, Size size) {
    final time = t.value;
    final f = math.min(1.0, time / seconds);
    final ease = f < 0.5 ? 2 * f * f : 1 - math.pow(-2 * f + 2, 2) / 2;
    final top = size.height * (1.02 - 1.08 * ease);
    final body = Rect.fromLTWH(0, top, size.width, size.height * 1.2);
    canvas.drawRect(
        body,
        Paint()
          ..shader = const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.white, Color(0xFFF6F8FF), Color(0xFFE3EAFF)])
              .createShader(
                  Rect.fromLTWH(0, top, size.width, size.height - top + 1)));
    final dx = math.sin(time / 9 * math.pi * 2) * size.width * 0.08;
    canvas.drawCircle(
        Offset(size.width * 0.25 + dx, top + size.height * 0.2),
        size.width * 0.35,
        Paint()
          ..shader = RadialGradient(colors: [
            Colors.white,
            Colors.white.withValues(alpha: 0)
          ]).createShader(Rect.fromCircle(
              center: Offset(size.width * 0.25 + dx, top + size.height * 0.2),
              radius: size.width * 0.35)));
    canvas.drawCircle(
        Offset(size.width * 0.9 - dx, top + size.height * 0.5),
        size.width * 0.3,
        Paint()
          ..shader = RadialGradient(colors: [
            const Color(0xCCC4D6FF),
            const Color(0x00C4D6FF)
          ]).createShader(Rect.fromCircle(
              center: Offset(size.width * 0.9 - dx, top + size.height * 0.5),
              radius: size.width * 0.3)));
    for (final (k, a) in [(0, 0.55), (1, 1.0)]) {
      final amp = size.height * 0.018;
      final period = size.width * (k == 0 ? 0.9 : 0.6);
      final shift = time * (k == 0 ? -40 : 70);
      final path = Path()..moveTo(0, top);
      for (var x = 0.0; x <= size.width + 6; x += 6) {
        path.lineTo(
            x, top - amp - math.sin((x + shift) / period * math.pi * 2) * amp);
      }
      path
        ..lineTo(size.width + 6, top + 2)
        ..lineTo(0, top + 2)
        ..close();
      canvas.drawPath(path, Paint()..color = Colors.white.withValues(alpha: a));
    }
  }

  @override
  bool shouldRepaint(covariant _LiquidPainter old) => false;
}
