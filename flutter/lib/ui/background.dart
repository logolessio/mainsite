import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// The website's own backdrop, drawn the same way: a soft black-and-white gradient that drifts and changes shape (five slow clouds), a faint
/// 72 pixel grid fading out toward the edges, a vignette, and fine film grain. It moves at 24 frames a second and stands still when the system
/// asks for less motion.
class SiteBackground extends StatefulWidget {
  const SiteBackground({super.key, this.still = false});
  final bool still;
  @override
  State<SiteBackground> createState() => _SiteBackgroundState();
}

class _SiteBackgroundState extends State<SiteBackground> with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final ValueNotifier<double> _t = ValueNotifier(8);
  Duration _last = Duration.zero;
  bool _moving = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((d) {
      if ((d - _last).inMilliseconds < 41) return; // about 24 frames a second
      _last = d;
      _t.value = 8 + d.inMicroseconds / 1e6;
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final move = !widget.still && !MediaQuery.disableAnimationsOf(context);
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
  Widget build(BuildContext context) => Positioned.fill(
        child: IgnorePointer(
          child: ColoredBox(
            color: Colors.black,
            child: Stack(fit: StackFit.expand, children: [
              CustomPaint(painter: _FieldPainter(_t)),
              const RepaintBoundary(child: CustomPaint(painter: _GridPainter())),
              const RepaintBoundary(child: CustomPaint(painter: _VignettePainter())),
              const RepaintBoundary(child: CustomPaint(painter: _GrainPainter())),
            ]),
          ),
        ),
      );
}

class _Cloud {
  const _Cloud(this.cx, this.cy, this.rx, this.ry, this.white, this.alpha, this.end, this.swayX, this.swayY, this.period, this.phase, this.spin, this.breathe);
  final double cx, cy, rx, ry, white, alpha, end, swayX, swayY, period, phase, spin, breathe;

  /// A cloud edge that eases out to nothing (a smooth S curve), so there is no visible ring where it ends.
  (List<Color>, List<double>) get stops {
    final colors = <Color>[];
    final at = <double>[];
    for (var i = 0; i <= 8; i++) {
      final t = i / 8;
      final k = 0.5 + 0.5 * math.cos(math.pi * t);
      colors.add(Color.fromRGBO((white * 255).round(), (white * 255).round(), (white * 255).round(), alpha * k * k));
      at.add(t * end);
    }
    return (colors, at);
  }
}

class _FieldPainter extends CustomPainter {
  _FieldPainter(this.t) : super(repaint: t);
  final ValueListenable<double> t;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width < 2 || size.height < 2) return;
    // the site paints on a canvas 200 across and stretches it; the same numbers are used here
    const w = 200.0;
    final h = math.max(80.0, (200 * size.height / size.width).roundToDouble());
    final m = math.max(w, h);
    final clouds = [
      _Cloud(0.21 * m, 0.05 * m, 0.39 * m, 0.29 * m, 1, 0.32, 0.8, 0.2 * w, 0.2 * h, 41, 0, 0.35, 0.18),
      _Cloud(w - 0.07 * m, 0.02 * h + 0.37 * m, 0.31 * m, 0.37 * m, 0.88, 0.26, 0.82, -0.26 * w, 0.18 * h, 53, 1.3, -0.5, 0.2),
      _Cloud(0.49 * m, h + 0.02 * m, 0.43 * m, 0.26 * m, 1, 0.22, 0.84, 0.2 * w, -0.24 * h, 47, 2.4, 0.4, 0.2),
      _Cloud(0.36 * w + 0.19 * m, 0.24 * h + 0.19 * m, 0.19 * m, 0.19 * m, 1, 0.2, 0.78, -0.22 * w, 0.18 * h, 29, 3.1, 0, 0.35),
      _Cloud(0.28 * w + 0.3 * m, 0.44 * h + 0.22 * m, 0.3 * m, 0.22 * m, 0, 0.7, 0.9, -0.24 * w, -0.16 * h, 37, 4.2, 0.5, 0.25),
    ];
    canvas.save();
    canvas.scale(size.width / w, size.height / h);
    final time = t.value;
    for (final c in clouds) {
      final s = math.sin(time / c.period * math.pi * 2 + c.phase);
      final s2 = math.sin(time / (c.period * 0.73) * math.pi * 2 + c.phase * 1.7);
      canvas.save();
      canvas.translate(c.cx + c.swayX * 0.5 * s, c.cy + c.swayY * 0.5 * s2);
      canvas.rotate(c.spin * s2);
      canvas.scale(c.rx * (1 + c.breathe * 0.5 * s2), c.ry * (1 - c.breathe * 0.5 * s2));
      final (colors, at) = c.stops;
      canvas.drawRect(const Rect.fromLTWH(-1, -1, 2, 2), Paint()..shader = ui.Gradient.radial(Offset.zero, 1, colors, at));
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FieldPainter old) => false;
}

/// The faint grid, strongest in the middle and gone toward the edges (the site masks it with an ellipse).
class _GridPainter extends CustomPainter {
  const _GridPainter();
  @override
  void paint(Canvas canvas, Size size) {
    const step = 72.0, seg = 12.0;
    final cx = size.width / 2, cy = size.height * 0.38;
    final rx = 0.8 * size.width, ry = 0.7 * size.height;
    double alpha(double x, double y) {
      final d = math.sqrt(math.pow((x - cx) / rx, 2) + math.pow((y - cy) / ry, 2));
      return d <= 0.25 ? 1 : d >= 0.78 ? 0 : 1 - (d - 0.25) / 0.53;
    }

    final p = Paint();
    for (var x = cx % step; x < size.width; x += step) {
      for (var y = 0.0; y < size.height; y += seg) {
        final a = alpha(x, y + seg / 2);
        if (a > 0.01) canvas.drawRect(Rect.fromLTWH(x, y, 1, seg + 0.5), p..color = Colors.white.withValues(alpha: 0.06 * a));
      }
    }
    for (var y = 0.0; y < size.height; y += step) {
      for (var x = 0.0; x < size.width; x += seg) {
        final a = alpha(x + seg / 2, y);
        if (a > 0.01) canvas.drawRect(Rect.fromLTWH(x, y, seg + 0.5, 1), p..color = Colors.white.withValues(alpha: 0.06 * a));
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// The soft vignette (the site's LightField): the middle stays clear, the edges fall to black.
class _VignettePainter extends CustomPainter {
  const _VignettePainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.translate(size.width / 2, size.height * 0.54);
    canvas.scale(size.width * 0.72, size.height * 0.68);
    final colors = [Colors.transparent, Colors.transparent, const Color(0x38000000), const Color(0x94000000), const Color(0xE0000000), const Color(0xFA000000), Colors.black];
    const at = [0.0, 0.26, 0.42, 0.58, 0.74, 0.88, 1.0];
    canvas.drawRect(const Rect.fromLTWH(-6, -6, 12, 12), Paint()..shader = ui.Gradient.radial(Offset.zero, 1, colors, at));
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// Fine film grain, painted once.
class _GrainPainter extends CustomPainter {
  const _GrainPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final rnd = math.Random(7);
    final n = math.min((size.width * size.height / 90).round(), 14000);
    final pts = Float32List(n * 2);
    for (var i = 0; i < n; i++) {
      pts[i * 2] = rnd.nextDouble() * size.width;
      pts[i * 2 + 1] = rnd.nextDouble() * size.height;
    }
    canvas.drawRawPoints(ui.PointMode.points, pts, Paint()..color = Colors.white.withValues(alpha: 0.07)..strokeWidth = 1);
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}
