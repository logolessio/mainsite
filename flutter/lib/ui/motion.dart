import 'package:flutter/material.dart';

/// One set of motion for the whole app, the same as the Mac and iPhone app: everything eases the same way (the site's curve: quick off the line,
/// a long soft landing), nothing bounces, a page arrives as one calm move, and the parts of a page arrive in order instead of all at once.
class Motion {
  static const ease = Cubic(0.22, 1, 0.36, 1);
  static const quick = Duration(milliseconds: 300);
  static const page = Duration(milliseconds: 460);
  static const panel = Duration(milliseconds: 440);

  /// A page comes in rising a few points while the old one is already leaving.
  static Widget pageIn(Widget child, Animation<double> a) => FadeTransition(
        opacity: CurvedAnimation(parent: a, curve: const Interval(0.25, 1, curve: ease)),
        child: SlideTransition(position: Tween(begin: const Offset(0, 0.012), end: Offset.zero).animate(CurvedAnimation(parent: a, curve: ease)), child: child),
      );

  /// Old and new pages are stacked, the new one on top.
  static Widget stack(Widget? current, List<Widget> previous) => Stack(fit: StackFit.expand, children: [...previous, if (current != null) current]);
}

/// Which things have already arrived, so scrolling back past a cover does not make it fade in a second time.
final Set<String> _seen = {};

/// Fades up into place once, when it first appears. [delay] lets a row of them arrive a few hundredths of a second apart.
/// With a [id], the same thing never replays (a cover scrolled out of view and back).
class Reveal extends StatefulWidget {
  const Reveal({super.key, required this.child, this.delay = 0, this.rise = 14, this.id});
  final Widget child;
  final double delay, rise;
  final String? id;
  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: Duration(milliseconds: 750 + (widget.delay * 1000).round()));
  late final bool _already = widget.id != null && _seen.contains(widget.id);

  @override
  void initState() {
    super.initState();
    if (_already) {
      _c.value = 1;
    } else {
      if (widget.id != null) _seen.add(widget.id!);
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) return widget.child;
    final start = widget.delay * 1000 / (750 + widget.delay * 1000);
    final curve = CurvedAnimation(parent: _c, curve: Interval(start.clamp(0, 0.9), 1, curve: Motion.ease));
    return AnimatedBuilder(
      animation: curve,
      builder: (_, child) => Opacity(opacity: curve.value.clamp(0, 1), child: Transform.translate(offset: Offset(0, (1 - curve.value) * widget.rise), child: child)),
      child: widget.child,
    );
  }
}

/// Shows [child] while [show] is true, and animates it in and out (a panel, a box, a sheet) instead of letting it blink.
class Presence extends StatelessWidget {
  const Presence({super.key, required this.show, required this.child, this.builder, this.duration = Motion.panel});
  final bool show;
  final Widget child;
  final Widget Function(Widget child, Animation<double> a)? builder;
  final Duration duration;
  @override
  Widget build(BuildContext context) => AnimatedSwitcher(
        duration: duration,
        reverseDuration: const Duration(milliseconds: 260),
        switchInCurve: Motion.ease,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: builder ?? (c, a) => FadeTransition(opacity: a, child: c),
        layoutBuilder: (cur, prev) => Stack(clipBehavior: Clip.none, children: [...prev, if (cur != null) cur]),
        child: show ? KeyedSubtree(key: const ValueKey('on'), child: child) : const SizedBox.shrink(key: ValueKey('off')),
      );
}

/// A soft light that moves across a shape while something loads, instead of a spinner.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});
  final Widget child;
  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _c,
        builder: (_, child) => ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (r) => LinearGradient(
            begin: Alignment(-1.5 + _c.value * 3, 0),
            end: Alignment(-0.5 + _c.value * 3, 0),
            colors: [Colors.white.withValues(alpha: 0), Colors.white.withValues(alpha: 0.07), Colors.white.withValues(alpha: 0)],
          ).createShader(r),
          child: child,
        ),
        child: widget.child,
      );
}

/// Placeholder covers while the campaigns load.
class SkeletonCovers extends StatelessWidget {
  const SkeletonCovers({super.key, required this.columns, this.gap = 24, this.count = 8});
  final int columns, count;
  final double gap;
  @override
  Widget build(BuildContext context) => GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: columns,
        mainAxisSpacing: gap,
        crossAxisSpacing: gap,
        children: [
          for (var i = 0; i < count; i++)
            Shimmer(
              child: Container(decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.04), borderRadius: BorderRadius.circular(22), border: Border.all(color: Colors.white.withValues(alpha: 0.06)))),
            ),
        ],
      );
}
