import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';

/// Fades and lifts a child into place once it appears.
class Rise extends StatefulWidget {
  const Rise({super.key, required this.child, this.delay = 0, this.dy = 16, this.blur = 8, this.scale = 1});
  final Widget child;
  final double delay;
  final double dy, blur, scale;
  @override
  State<Rise> createState() => _RiseState();
}

class _RiseState extends State<Rise> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: Duration(milliseconds: 900 + (widget.delay * 1000).round()));

  @override
  void initState() {
    super.initState();
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = 0.9 + widget.delay;
    final curve = CurvedAnimation(parent: _c, curve: Interval(widget.delay / total, 1, curve: const Cubic(0.22, 1, 0.36, 1)));
    return AnimatedBuilder(
      animation: curve,
      builder: (context, child) {
        final v = curve.value;
        Widget w = Opacity(opacity: v.clamp(0, 1), child: Transform.translate(offset: Offset(0, (1 - v) * widget.dy), child: Transform.scale(scale: widget.scale + (1 - widget.scale) * v, child: child)));
        if (widget.blur > 0 && v < 0.98) w = ImageFiltered(imageFilter: ui.ImageFilter.blur(sigmaX: (1 - v) * widget.blur, sigmaY: (1 - v) * widget.blur), child: w);
        return w;
      },
      child: widget.child,
    );
  }
}

/// A headline that arrives word by word: each word rises out of a blur, one after the other.
class WordReveal extends StatelessWidget {
  const WordReveal(this.text, {super.key, required this.size, this.delay = 0});
  final String text;
  final double size;
  final double delay;
  @override
  Widget build(BuildContext context) {
    final lines = text.split('\n');
    var k = 0;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      for (final line in lines)
        Transform.translate(
          offset: Offset(0, size * -0.02 * lines.indexOf(line)),
          child: Wrap(alignment: WrapAlignment.center, spacing: size * 0.24, children: [
            for (final w in line.split(' ').where((w) => w.isNotEmpty))
              Rise(delay: delay + (k++) * 0.09, dy: size * 0.3, blur: 14, scale: 0.94, child: Text(w, style: display(size, height: 1.0))),
          ]),
        ),
    ]);
  }
}

/// The covers of the live campaigns drifting past in rows, each row the other way, tilted. It sits behind everything and reacts to the step.
class CoverWall extends StatefulWidget {
  const CoverWall({super.key, required this.urls, required this.step});
  final List<Uri?> urls;
  final int step;
  @override
  State<CoverWall> createState() => _CoverWallState();
}

class _CoverWallState extends State<CoverWall> with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final ValueNotifier<double> _t = ValueNotifier(3);
  bool _moving = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) => _t.value = 3 + d.inMicroseconds / 1e6);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final move = !MediaQuery.disableAnimationsOf(context);
    if (move && !_moving) {
      _ticker.start();
    } else if (!move && _moving) {
      _ticker.stop();
    }
    _moving = move;
  }

  @override
  void dispose() {
    _ticker.dispose();
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final compact = isCompact(context);
    return IgnorePointer(
      child: LayoutBuilder(builder: (context, c) {
        final size = Size(c.maxWidth, c.maxHeight);
        final tile = compact ? 104.0 : 176.0, gap = compact ? 12.0 : 20.0;
        final rows = (math.max(size.width, size.height) * 1.3 / (tile + gap)).ceil() + 1;
        const n = 9;
        final period = n * (tile + gap);
        return ShaderMask(
          blendMode: BlendMode.dstIn,
          shaderCallback: (rect) {
            // the middle is left clear for the words and the site's own background; the covers show toward the edges
            final rx = rect.width * 0.62, ry = rect.height * 0.62;
            final m = Matrix4.translationValues(rect.width / 2, rect.height / 2, 0).multiplied(Matrix4.diagonal3Values(rx, ry, 1));
            return ui.Gradient.radial(Offset.zero, 1, [Colors.transparent, Colors.transparent, const Color(0x8C000000), Colors.black], [0, 0.42, 0.68, 0.92], TileMode.clamp, m.storage);
          },
          child: _Wall(urls: widget.urls, step: widget.step, t: _t, rows: rows, n: n, tile: tile, gap: gap, period: period, size: size),
        );
      }),
    );
  }
}

class _Wall extends StatelessWidget {
  const _Wall({required this.urls, required this.step, required this.t, required this.rows, required this.n, required this.tile, required this.gap, required this.period, required this.size});
  final List<Uri?> urls;
  final int step, rows, n;
  final ValueListenable<double> t;
  final double tile, gap, period;
  final Size size;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: 0.8,
      child: ClipRect(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: step.toDouble()),
          duration: const Duration(milliseconds: 1200),
          curve: Curves.easeInOutCubic,
          builder: (context, s, child) => Transform.translate(
            offset: Offset(0, -14 * s),
            child: Transform.scale(scale: 1.18 + 0.03 * s, child: Transform.rotate(angle: (-8 + 2.2 * s) * math.pi / 180, child: child)),
          ),
          child: OverflowBox(
            maxWidth: size.width * 3,
            maxHeight: size.height * 3,
            child: SizedBox(
              width: size.width,
              height: size.height,
              child: Stack(clipBehavior: Clip.none, children: [
                for (var r = 0; r < rows; r++)
                  Positioned(
                    left: 0,
                    top: size.height / 2 - tile / 2 + (r - (rows - 1) / 2) * (tile + gap),
                    child: ValueListenableBuilder<double>(
                      valueListenable: t,
                      builder: (context, time, _) {
                        final speed = 22.0 + (r % 3) * 9;
                        final phase = (time * speed) % period;
                        final dx = r % 2 == 0 ? -phase : -period + phase;
                        return Transform.translate(
                          offset: Offset(dx, 0),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [for (var i = 0; i < n * 2; i++) Padding(padding: EdgeInsets.only(right: gap), child: _cover(r * 5 + i % n))]),
                        );
                      },
                    ),
                  ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _cover(int i) {
    final url = urls.isEmpty ? null : urls[i % urls.length];
    return Container(
      width: tile,
      height: tile,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(tile * 0.14), border: Border.all(color: Colors.white.withValues(alpha: 0.08))),
      clipBehavior: Clip.antiAlias,
      child: RemoteImage(url, seed: 'wall-$i'),
    );
  }
}

/// "Drag to see what your views are worth": a glass track with a glowing thumb that runs from 1K to 1M views.
class WorthDial extends StatelessWidget {
  const WorthDial({super.key, required this.value, required this.onChanged, required this.onTick});
  final double value;
  final ValueChanged<double> onChanged;
  final VoidCallback onTick;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final w = c.maxWidth;
        final x = value.clamp(0.0, 1.0) * w;
        var last = (value * 3).floor();
        void set(double dx) {
          final v = (dx / w).clamp(0.0, 1.0);
          final d = (v * 3).floor();
          if (d != last) { last = d; onTick(); }
          onChanged(v);
        }

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onHorizontalDragUpdate: (d) => set(d.localPosition.dx),
          onTapDown: (d) => set(d.localPosition.dx),
          child: SizedBox(
            height: 40,
            child: Stack(alignment: Alignment.centerLeft, clipBehavior: Clip.none, children: [
              Container(height: 12, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(99), border: Border.all(color: Colors.white.withValues(alpha: 0.14)))),
              Container(width: math.max(12, x), height: 12, decoration: BoxDecoration(gradient: LinearGradient(colors: [C.paper.withValues(alpha: 0.35), C.paper]), borderRadius: BorderRadius.circular(99), boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: 0.35), blurRadius: 14)])),
              Positioned(left: x - 20, child: Container(width: 40, height: 40, decoration: BoxDecoration(color: C.paper, shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2), boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: 0.55), blurRadius: 18)]))),
            ]),
          ),
        );
      });
}

/// A burst of light from the middle of the screen, for the last step.
class Burst extends StatefulWidget {
  const Burst({super.key});
  @override
  State<Burst> createState() => _BurstState();
}

class _BurstState extends State<Burst> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 3000))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(child: CustomPaint(painter: _BurstPainter(_c), size: Size.infinite));
}

class _BurstPainter extends CustomPainter {
  _BurstPainter(this.c) : super(repaint: c);
  final AnimationController c;

  @override
  void paint(Canvas canvas, Size size) {
    final t = c.value * 3.0;
    final center = Offset(size.width / 2, size.height * 0.42);
    const life = 2.4;
    for (var k = 0; k < 3; k++) {
      final tt = t - k * 0.22;
      if (tt <= 0 || tt >= 1.6) continue;
      final e = 1 - math.pow(1 - tt / 1.6, 3);
      canvas.drawCircle(center, e * math.max(size.width, size.height) * 0.55, Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = Colors.white.withValues(alpha: (1 - tt / 1.6) * 0.5));
    }
    final scale = math.min(1.4, math.max(0.6, math.min(size.width, size.height) / 700));
    final p = Paint();
    for (var i = 0; i < 140; i++) {
      final a = i * 2.399963;
      final sp = 140 + ((i * 37) % 11) * 70;
      final tt = t - (i % 5) * 0.015;
      if (tt <= 0 || tt >= life) continue;
      final e = 1 - math.pow(1 - tt / life, 3);
      final d = sp * e * scale;
      final pt = Offset(center.dx + math.cos(a) * d, center.dy + math.sin(a) * d + 40 * e * e);
      final alpha = math.max(0.0, 1 - tt / life);
      if (i % 6 == 0) {
        canvas.drawLine(pt, Offset(pt.dx - math.cos(a) * 14 * alpha, pt.dy - math.sin(a) * 14 * alpha), p..color = Colors.white.withValues(alpha: alpha * 0.8)..strokeWidth = 1.2);
      } else {
        canvas.drawCircle(pt, 1.2 + ((i * 13) % 5) * 0.9, p..color = C.paper.withValues(alpha: alpha));
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BurstPainter old) => false;
}

/// The mark in a ring of glass that turns slowly, with a glow that breathes.
class Orb extends StatefulWidget {
  const Orb({super.key, this.size = 132});
  final double size;
  @override
  State<Orb> createState() => _OrbState();
}

class _OrbState extends State<Orb> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 40))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return SizedBox(
      width: s * 1.5,
      height: s * 1.5,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value * 40;
          return Stack(alignment: Alignment.center, clipBehavior: Clip.none, children: [
            Container(width: s * 2.2, height: s * 2.2, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [Colors.white.withValues(alpha: 0.18 + 0.06 * math.sin(t * 1.4)), Colors.transparent]))),
            Transform.rotate(angle: t * 9 * math.pi / 180, child: CustomPaint(size: Size.square(s * 1.28), painter: _DashRing(dash: 2, gap: 7, alpha: 0.5))),
            Transform.rotate(angle: -t * 6 * math.pi / 180, child: CustomPaint(size: Size.square(s * 1.5), painter: _DashRing(dash: 10, gap: 14, alpha: 0.25))),
            Glass(radius: s, child: SizedBox(width: s, height: s, child: Center(child: Image.asset('assets/images/mark.png', width: s * 0.5, color: C.paper)))),
          ]);
        },
      ),
    );
  }
}

class _DashRing extends CustomPainter {
  const _DashRing({required this.dash, required this.gap, required this.alpha});
  final double dash, gap, alpha;
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final circ = 2 * math.pi * r;
    final count = (circ / (dash + gap)).floor();
    final p = Paint()..color = Colors.white.withValues(alpha: alpha)..style = PaintingStyle.stroke..strokeWidth = 1;
    for (var i = 0; i < count; i++) {
      final a0 = i * (dash + gap) / r;
      canvas.drawArc(Rect.fromCircle(center: Offset(r, r), radius: r), a0, dash / r, false, p);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// The segmented bar along the top that fills as the steps go by (as on the site's "Finish setting up").
class StepBars extends StatelessWidget {
  const StepBars({super.key, required this.count, required this.step});
  final int count, step;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        for (var i = 0; i < count; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 450),
            curve: Curves.easeOutCubic,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == step ? 44 : 26,
            height: 4,
            decoration: BoxDecoration(color: i <= step ? C.paper : C.paper.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(4), boxShadow: i == step ? [BoxShadow(color: Colors.white.withValues(alpha: 0.6), blurRadius: 8)] : null),
          ),
      ]);
}

/// A check mark that draws itself inside a ring.
class DrawnCheck extends StatefulWidget {
  const DrawnCheck({super.key, this.size = 92});
  final double size;
  @override
  State<DrawnCheck> createState() => _DrawnCheckState();
}

class _DrawnCheckState extends State<DrawnCheck> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..forward();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        width: widget.size,
        height: widget.size,
        child: DecoratedBox(
          decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: 0.25), blurRadius: 30)]),
          child: AnimatedBuilder(animation: _c, builder: (context, _) => CustomPaint(painter: _CheckPainter(Curves.easeInOut.transform(_c.value)))),
        ),
      );
}

class _CheckPainter extends CustomPainter {
  _CheckPainter(this.t);
  final double t;
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    final ring = Paint()..color = C.paper..style = PaintingStyle.stroke..strokeWidth = 2.5..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromLTWH(1.25, 1.25, s - 2.5, s - 2.5), -math.pi / 2, 2 * math.pi * t, false, ring);
    final check = Path()..moveTo(s * 0.29, s * 0.52)..lineTo(s * 0.44, s * 0.66)..lineTo(s * 0.72, s * 0.36);
    final m = check.computeMetrics().first;
    canvas.drawPath(m.extractPath(0, m.length * t), Paint()..color = C.paper..style = PaintingStyle.stroke..strokeWidth = 3.5..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round);
  }

  @override
  bool shouldRepaint(covariant _CheckPainter old) => old.t != t;
}

/// A live preview of the profile being made: it changes as the person types.
class ProfilePreview extends StatelessWidget {
  const ProfilePreview({super.key, required this.name, required this.handle, required this.bio, required this.platforms});
  final String name, handle, bio;
  final List<String> platforms;

  @override
  Widget build(BuildContext context) => AnimatedSize(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        child: Container(
          width: 280,
          decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(26), border: Border.all(color: Colors.white.withValues(alpha: 0.16)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 30, offset: const Offset(0, 16))]),
          clipBehavior: Clip.antiAlias,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(
              height: 96,
              child: Stack(alignment: Alignment.bottomCenter, clipBehavior: Clip.none, children: [
                Positioned.fill(bottom: 32, child: Opacity(opacity: 0.85, child: CoverFill(name.isEmpty ? 'logoless' : name))),
                Positioned(
                  bottom: 0,
                  child: Container(
                    width: 64,
                    height: 64,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(shape: BoxShape.circle, gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF505058), Color(0xFF050505)]), border: Border.all(color: Colors.black, width: 4)),
                    child: Text((name.isEmpty ? '?' : name.substring(0, 1)).toUpperCase(), style: body(28, color: Colors.white.withValues(alpha: 0.92), weight: 600)),
                  ),
                ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
              child: Column(children: [
                Text(name.isEmpty ? 'Your name' : name, maxLines: 1, overflow: TextOverflow.ellipsis, style: display(28, color: C.paper.withValues(alpha: name.isEmpty ? 0.35 : 1))),
                const SizedBox(height: 6),
                Text(handle.isEmpty ? '@username' : '@$handle', style: body(13.5, color: C.mute)),
                if (bio.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(bio, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: body(13, color: C.paper.withValues(alpha: 0.75)))),
                if (platforms.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 10), child: Row(mainAxisSize: MainAxisSize.min, children: [for (final p in platforms) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: PlatformMark(p, size: 13, color: C.paper.withValues(alpha: 0.8)))])),
              ]),
            ),
          ]),
        ),
      );
}
