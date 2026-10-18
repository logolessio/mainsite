import 'package:flutter/material.dart';

/// The site's look: black, warm paper white, hairline borders, Gloock for the big words, glass for what floats.
class C {
  static const paper = Color(0xFFF3F2EE);
  static const ink = Color(0xFF000000);
  static const good = Color(0xFF73D99E);
  static const warn = Color(0xFFF5C761);
  static const bad = Color(0xFFF2736B);
  static const mute = Color(0x8CF3F2EE);
  static const faint = Color(0x59F3F2EE);
  static const line = Color(0x1AFFFFFF);
}

class R {
  static const card = 22.0;
  static const panel = 32.0;
  static const cover = 22.0;
  static const chip = 14.0;
}

/// Headings and big figures: Gloock, as on the website.
TextStyle display(double size, {Color color = C.paper, double? height}) => TextStyle(fontFamily: 'Gloock', fontSize: size, color: color, height: height ?? 1.05, fontWeight: FontWeight.w400);

/// Everything else: Inter, with the weight set on the variable font.
TextStyle body(double size, {Color color = C.paper, int weight = 400, double? height}) =>
    TextStyle(fontFamily: 'Inter', fontSize: size, color: color, height: height, fontWeight: FontWeight.values[((weight ~/ 100) - 1).clamp(0, 8)], fontVariations: [FontVariation('wght', weight.toDouble())]);

bool isCompact(BuildContext c) => MediaQuery.sizeOf(c).width < 760;

ThemeData siteTheme() => ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.black,
      fontFamily: 'Inter',
      colorScheme: const ColorScheme.dark(primary: C.paper, surface: Colors.black, onSurface: C.paper),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      textSelectionTheme: TextSelectionThemeData(cursorColor: C.paper, selectionColor: C.paper.withValues(alpha: 0.25)),
    );

String shortDate(DateTime d) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${m[d.month - 1]} ${d.day}, ${d.year}';
}

String relative(DateTime d) {
  final s = DateTime.now().difference(d).inSeconds.clamp(1, 1 << 40);
  if (s < 60) return 'now';
  if (s < 3600) return '${s ~/ 60}m';
  if (s < 86400) return '${s ~/ 3600}h';
  if (s < 604800) return '${s ~/ 86400}d';
  return shortDate(d);
}
