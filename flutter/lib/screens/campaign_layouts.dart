import 'package:flutter/material.dart';
import '../core/models.dart';
import '../ui/images.dart';
import '../ui/theme.dart';
import '../ui/motion.dart';
import 'campaign_card.dart';

/// Each cover arrives a few hundredths of a second after the one before it.
double _arrival(int i) => 0.34 + (i % 8) * 0.045;

/// The campaigns as the Design page lays them out (the same five as the website): a grid of four (the standard look), large covers, compact
/// covers, a magazine style mosaic where some covers are twice the size, or one row per campaign with the details beside the cover.
Widget campaignSliver({required String layout, required List<Campaign> list, required bool compact, required void Function(Campaign) onOpen}) {
  if (layout == 'list') {
    return SliverToBoxAdapter(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Column(children: [
            for (final (i, c) in list.indexed)
              Reveal(id: 'row-${c.id}', delay: _arrival(i), rise: 12, child: Padding(padding: const EdgeInsets.only(bottom: 12), child: CampaignRow(campaign: c, compact: compact, onTap: () => onOpen(c)))),
          ]),
        ),
      ),
    );
  }
  if (layout == 'mosaic') {
    return SliverToBoxAdapter(child: _Mosaic(list: list, columns: compact ? 2 : 4, gap: compact ? 16 : 34, onOpen: onOpen));
  }
  return SliverLayoutBuilder(builder: (context, c) {
    final wide = c.crossAxisExtent;
    final cols = switch (layout) {
      'large' => compact ? 1 : (wide > 1100 ? 3 : 2),
      'compact' => compact ? 3 : (wide > 1100 ? 6 : wide > 760 ? 4 : 3),
      _ => compact ? 2 : (wide > 1100 ? 4 : wide > 760 ? 3 : 2),
    };
    final gap = switch (layout) { 'compact' => compact ? 10.0 : 20.0, 'large' => compact ? 20.0 : 40.0, _ => compact ? 16.0 : 34.0 };
    return SliverGrid(
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisSpacing: gap, crossAxisSpacing: gap),
      delegate: SliverChildBuilderDelegate((context, i) => Reveal(id: 'card-${list[i].id}', delay: _arrival(i), rise: 16, child: CampaignCard(campaign: list[i], onTap: () => onOpen(list[i]))), childCount: list.length),
    );
  });
}

/// Square covers on a grid where every ninth one is twice as wide and tall, and the others fill in around it (the site's dense grid flow).
class _Mosaic extends StatelessWidget {
  const _Mosaic({required this.list, required this.columns, required this.gap, required this.onOpen});
  final List<Campaign> list;
  final int columns;
  final double gap;
  final void Function(Campaign) onOpen;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final cw = (c.maxWidth - gap * (columns - 1)) / columns;
        final taken = <int>{};
        var rows = 0;
        final placed = <Widget>[];
        for (var i = 0; i < list.length; i++) {
          final span = (i % 9 == 0 && columns >= 2) ? 2 : 1;
          var row = 0;
          var done = false;
          while (!done) {
            for (var col = 0; col <= columns - span && !done; col++) {
              var fits = true;
              for (var dr = 0; dr < span && fits; dr++) {
                for (var dc = 0; dc < span; dc++) {
                  if (taken.contains((row + dr) * columns + col + dc)) { fits = false; break; }
                }
              }
              if (!fits) continue;
              for (var dr = 0; dr < span; dr++) {
                for (var dc = 0; dc < span; dc++) { taken.add((row + dr) * columns + col + dc); }
              }
              rows = rows < row + span ? row + span : rows;
              final side = cw * span + gap * (span - 1);
              final item = list[i];
              placed.add(Positioned(left: col * (cw + gap), top: row * (cw + gap), width: side, height: side, child: Reveal(id: 'card-${item.id}', delay: _arrival(i), rise: 16, child: CampaignCard(campaign: item, onTap: () => onOpen(item)))));
              done = true;
            }
            if (!done) row++;
          }
        }
        return SizedBox(height: rows == 0 ? 0 : cw * rows + gap * (rows - 1), child: Stack(clipBehavior: Clip.none, children: placed));
      });
}

/// One campaign as a row: the cover on the left, the details beside it, and what it pays on the right.
class CampaignRow extends StatefulWidget {
  const CampaignRow({super.key, required this.campaign, required this.compact, required this.onTap});
  final Campaign campaign;
  final bool compact;
  final VoidCallback onTap;
  @override
  State<CampaignRow> createState() => _CampaignRowState();
}

class _CampaignRowState extends State<CampaignRow> {
  bool _hover = false;
  @override
  Widget build(BuildContext context) {
    final c = widget.campaign;
    final compact = widget.compact;
    final left = (c.budgetLeftPct ?? 100).clamp(0, 100);
    final side = compact ? 80.0 : 112.0;
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
            duration: const Duration(milliseconds: 250),
            transform: Matrix4.translationValues(0, _hover ? -2 : 0, 0),
            padding: EdgeInsets.fromLTRB(compact ? 10 : 12, compact ? 10 : 12, compact ? 16 : 26, compact ? 10 : 12),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: _hover ? 0.05 : 0.02), borderRadius: BorderRadius.circular(R.card), border: Border.all(color: Colors.white.withValues(alpha: _hover ? 0.2 : 0.1))),
            child: Row(children: [
              ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: side, height: side, child: RemoteImage(c.coverUrl, seed: c.id))),
              SizedBox(width: compact ? 16 : 24),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(c.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: display(compact ? 22 : 27)),
                  const SizedBox(height: 4),
                  Text('${c.creator} · ${c.type}', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(compact ? 13 : 15, color: C.paper.withValues(alpha: 0.6))),
                  const SizedBox(height: 8),
                  Wrap(spacing: 14, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                    if (compact) Text('\$${Money.plain(c.ratePer1k)} per 1K', style: body(12.5, color: C.paper.withValues(alpha: 0.8))),
                    if (c.endsOn.isNotEmpty) Text('Ends ${c.endsOn}', style: body(12.5, color: C.paper.withValues(alpha: 0.55))),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      ClipRRect(borderRadius: BorderRadius.circular(99), child: SizedBox(width: 64, height: 4, child: LinearProgressIndicator(value: left / 100, backgroundColor: Colors.white.withValues(alpha: 0.15), color: Colors.white.withValues(alpha: 0.85)))),
                      const SizedBox(width: 8),
                      Text('$left% left', style: body(12.5, color: C.paper.withValues(alpha: 0.55))),
                    ]),
                  ]),
                ]),
              ),
              if (!compact) ...[
                const SizedBox(width: 12),
                Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('\$${Money.plain(c.ratePer1k)}', style: display(32)),
                  const SizedBox(height: 4),
                  Text('per 1,000 views', style: body(12, color: C.paper.withValues(alpha: 0.5))),
                ]),
              ],
              const SizedBox(width: 14),
              Icon(Icons.arrow_outward, size: 16, color: C.paper.withValues(alpha: _hover ? 1 : 0.4)),
            ]),
          ),
        ),
      ),
    );
  }
}
