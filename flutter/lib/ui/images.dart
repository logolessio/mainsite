import 'package:flutter/material.dart';
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

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.url, required this.name, this.size = 36});
  final Uri? url;
  final String name;
  final double size;

  /// The ready-made looks (/api/look/...) are vector pictures; they are drawn here as the same dark gradient with the first letter.
  bool get _isLook => url?.path.startsWith('/api/look/') == true;
  String get _letter {
    final l = url?.queryParameters['l'];
    final s = (l != null && l.isNotEmpty) ? l : name;
    return s.isEmpty ? '?' : s.substring(0, 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.15))),
        clipBehavior: Clip.antiAlias,
        child: (url != null && !_isLook)
            ? RemoteImage(url, seed: name)
            : DecoratedBox(
                decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF505058), Color(0xFF050505)])),
                child: Center(child: Text(_letter, style: body(size * 0.46, color: Colors.white.withValues(alpha: 0.92), weight: 600))),
              ),
      );
}
