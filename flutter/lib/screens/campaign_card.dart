import 'package:flutter/material.dart';
import '../core/models.dart';
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
                  AnimatedOpacity(opacity: _hover ? 1 : 0, duration: const Duration(milliseconds: 500), curve: _ease, child: const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.center, colors: [Color(0x8C000000), Color(0x00000000)])))),
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: AnimatedSlide(
                      offset: _hover ? Offset.zero : const Offset(0, 1),
                      duration: const Duration(milliseconds: 520),
                      curve: _ease,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                        color: Colors.black.withValues(alpha: 0.92),
                        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(c.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: display(22)),
                          const SizedBox(height: 4),
                          Text('${c.creator} · \$${Money.plain(c.ratePer1k)} per 1K', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(12.5, color: C.paper.withValues(alpha: 0.65))),
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
