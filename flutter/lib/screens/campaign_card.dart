import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/images.dart';
import '../ui/theme.dart';

/// A campaign as its cover and nothing else. On hover the cover lifts, the picture drifts in, and a panel slides up from the bottom
/// edge carrying the name and the line under it (the same moves as the website). Touch screens simply show the cover.
class CampaignCard extends StatefulWidget {
  const CampaignCard({super.key, required this.campaign, required this.onTap});
  final Campaign campaign;
  final VoidCallback onTap;
  @override
  State<CampaignCard> createState() => _CampaignCardState();
}

class _CampaignCardState extends State<CampaignCard> {
  bool _hover = false;
  static const _ease = Cubic(0.22, 1, 0.36, 1);

  @override
  Widget build(BuildContext context) {
    final c = widget.campaign;
    final cv = context.select<AppState, CoverText>((a) => a.design.cover);
    final visible = _hover || cv.show == 'always';
    final center = cv.align == 'center';
    final title = cv.letters == 'upper' ? c.title.toUpperCase() : cv.letters == 'lower' ? c.title.toLowerCase() : c.title;
    final rate = '\$${Money.plain(c.ratePer1k)} per 1K';
    final meta = switch (cv.meta) { 'creator' => c.creator, 'rate' => rate, 'none' => '', _ => '${c.creator} · $rate' };
    final size = (cv.letters == 'upper' ? const {'s': 15.0, 'm': 18.0, 'l': 23.0} : const {'s': 18.0, 'm': 22.0, 'l': 29.0})[cv.size] ?? 22.0;
    // the apps carry Gloock; any other typeface chosen on the site arrives as a kind and is drawn in the system face of that kind
    final TextStyle nameStyle = switch (cv.fontKind) {
      'serif' => TextStyle(fontFamily: 'serif', fontFamilyFallback: const ['Georgia', 'Times New Roman'], fontSize: size, color: C.paper, height: 1.1, letterSpacing: cv.letters == 'upper' ? 1.2 : 0),
      'sans' => body(size, weight: 500, height: 1.1).copyWith(letterSpacing: cv.letters == 'upper' ? 1.2 : 0),
      'mono' => TextStyle(fontFamily: 'monospace', fontSize: size, color: C.paper, height: 1.1, fontWeight: FontWeight.w500),
      _ => display(size).copyWith(letterSpacing: cv.letters == 'upper' ? 1.2 : 0),
    };
    final panelColor = switch (cv.panel) { 'glass' => Colors.black.withValues(alpha: 0.45), 'fade' => Colors.transparent, _ => Colors.black.withValues(alpha: 0.92) };
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Semantics(
          button: true,
          label: '${c.title} by ${c.creator}, \$${Money.plain(c.ratePer1k)} per 1,000 views',
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 560),
            curve: _ease,
            transform: Matrix4.translationValues(0, _hover ? -6 : 0, 0),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.cover), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: _hover ? 0.7 : 0.3), blurRadius: _hover ? 22 : 8, offset: Offset(0, _hover ? 20 : 6))]),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(R.cover),
              child: AspectRatio(
                aspectRatio: 1,
                child: Stack(fit: StackFit.expand, children: [
                  AnimatedScale(scale: _hover ? 1.15 : 1, duration: const Duration(milliseconds: 900), curve: _ease, child: RemoteImage(c.coverUrl, seed: c.id)),
                  AnimatedOpacity(opacity: visible ? 1 : 0, duration: const Duration(milliseconds: 500), curve: _ease, child: const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [Color(0x8C000000), Color(0x00000000)])))),
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: AnimatedSlide(
                      offset: visible ? Offset.zero : const Offset(0, 1),
                      duration: const Duration(milliseconds: 520),
                      curve: _ease,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                        color: panelColor,
                        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: center ? CrossAxisAlignment.center : CrossAxisAlignment.start, children: [
                          Text(title, maxLines: cv.size == 'l' ? 2 : 1, textAlign: center ? TextAlign.center : TextAlign.start, overflow: TextOverflow.ellipsis, style: nameStyle),
                          if (meta.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(meta, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(12.5, color: C.paper.withValues(alpha: 0.7))),
                          ],
                        ]),
                      ),
                    ),
                  ),
                  IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(borderRadius: BorderRadius.circular(R.cover), border: Border.all(color: Colors.white.withValues(alpha: _hover ? 0.15 : 0.06))))),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
