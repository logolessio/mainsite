import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/models.dart';
import 'theme.dart';

/// A soft colour from a name, shown while a picture loads.
class CoverFill extends StatelessWidget {
  const CoverFill(this.seed, {super.key});
  final String seed;
  @override
  Widget build(BuildContext context) {
    final h = seed.codeUnits.fold<int>(7, (a, c) => (a * 31 + c) % 360).toDouble();
    return DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [HSVColor.fromAHSV(1, h, 0.45, 0.55).toColor(), HSVColor.fromAHSV(1, (h + 43) % 360, 0.6, 0.22).toColor()])));
  }
}

/// A picture from the site. Shows a soft colour until it arrives, then fades in.
class RemoteImage extends StatelessWidget {
  const RemoteImage(this.url, {super.key, this.seed = ''});
  final Uri? url;
  final String seed;
  @override
  Widget build(BuildContext context) => Stack(fit: StackFit.expand, children: [
        CoverFill(seed.isEmpty ? '${url ?? 'x'}' : seed),
        if (url != null)
          Image.network(
            url!.toString(),
            fit: BoxFit.cover,
            gaplessPlayback: true,
            frameBuilder: (context, child, frame, sync) => AnimatedOpacity(opacity: frame == null && !sync ? 0 : 1, duration: const Duration(milliseconds: 250), child: child),
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
      ]);
}

/// A look drawn as a picture: a soft glow over a gradient, with the person's first letter on an avatar.
class LookArt extends StatelessWidget {
  const LookArt(this.look, {super.key, this.banner = false, this.letter});
  final Look look;
  final bool banner;
  final String? letter;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final s = c.biggest.shortestSide.isFinite ? math.max(c.maxWidth.isFinite ? c.maxWidth : 100, c.maxHeight.isFinite ? c.maxHeight : 100) : 100.0;
        return Stack(fit: StackFit.expand, children: [
          DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: banner ? Alignment.bottomRight : const Alignment(0.4, 1), colors: [look.mid, look.dark]))),
          DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(center: banner ? const Alignment(-0.76, -1) : const Alignment(-0.5, -0.7), radius: banner ? 0.75 * s / (c.maxWidth.isFinite && c.maxWidth > 0 ? c.maxWidth : s) : 0.95, colors: [look.light, look.light.withValues(alpha: 0)]))),
          if (!banner && letter != null && letter!.isNotEmpty) Center(child: Text(letter!.substring(0, 1).toUpperCase(), style: body((c.maxHeight.isFinite ? c.maxHeight : 100) * 0.46, color: Colors.white.withValues(alpha: 0.92), weight: 600))),
        ]);
      });
}

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.url, required this.name, this.size = 36});
  final Uri? url;
  final String name;
  final double size;

  /// The ready-made looks (/api/look/ID?l=L) are drawn here from the look's colours, as the site draws them.
  (Look, String)? get _look {
    final u = url;
    if (u == null || !u.path.startsWith('/api/look/')) return null;
    final id = u.path.substring('/api/look/'.length);
    final l = u.queryParameters['l'];
    return (Looks.byId(id) ?? Looks.forSeed(name), (l != null && l.isNotEmpty) ? l : (name.isEmpty ? '?' : name.substring(0, 1)));
  }

  @override
  Widget build(BuildContext context) {
    final look = _look;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.15))),
      clipBehavior: Clip.antiAlias,
      child: look != null ? LookArt(look.$1, letter: look.$2) : (url != null ? RemoteImage(url, seed: name) : LookArt(Looks.forSeed(name), letter: name.isEmpty ? '?' : name.substring(0, 1))),
    );
  }
}
