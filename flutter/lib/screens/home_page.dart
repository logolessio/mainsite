import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'campaign_card.dart';

enum CampaignSort { featured('Newest'), rate('Highest rate'), budget('Most budget left');
  const CampaignSort(this.label);
  final String label;
}

/// The front page: the promise, a search that pins as you scroll, the filters, and every open campaign as its cover.
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _query = TextEditingController();
  String _kind = 'All';
  String? _platform;
  CampaignSort _sort = CampaignSort.featured;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    final kinds = ['All', ...{...app.campaigns.map((c) => c.kind)}.toList()..sort()];
    var list = app.campaigns.where((c) => (_kind == 'All' || c.kind == _kind) && (_platform == null || c.platforms.contains(_platform))).toList();
    final q = _query.text.trim().toLowerCase();
    if (q.isNotEmpty) list = list.where((c) => '${c.title} ${c.creator} ${c.type}'.toLowerCase().contains(q)).toList();
    switch (_sort) {
      case CampaignSort.featured:
        list = [...list.where((c) => c.pinned), ...list.where((c) => !c.pinned)];
      case CampaignSort.rate:
        list.sort((a, b) => b.ratePer1k.compareTo(a.ratePer1k));
      case CampaignSort.budget:
        list.sort((a, b) => (b.budgetLeftPct ?? 100).compareTo(a.budgetLeftPct ?? 100));
    }
    final pad = compact ? 16.0 : 40.0;

    return CustomScrollView(slivers: [
      SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(pad, (compact ? 56 : 74) + MediaQuery.paddingOf(context).top, pad, compact ? 28 : 44),
          child: Column(children: [
            Text('Your views\nhave value.', textAlign: TextAlign.center, style: display(compact ? 46 : 84, height: 0.98)),
            SizedBox(height: compact ? 16 : 22),
            Text(compact ? 'Join a campaign, post your content, and earn for every 1,000 verified views.' : 'Join a campaign, post your content, and earn for\nevery 1,000 verified views.', textAlign: TextAlign.center, style: body(compact ? 15 : 16, color: C.mute, height: 1.5)),
          ]),
        ),
      ),
      SliverPersistentHeader(pinned: true, delegate: _SearchHeader(child: _searchBar(app, compact), height: compact ? 66 : 74)),
      SliverToBoxAdapter(child: Padding(padding: EdgeInsets.fromLTRB(pad, 18, pad, 40), child: _filters(kinds, compact))),
      if (app.failures['campaigns'] != null)
        SliverToBoxAdapter(child: Padding(padding: EdgeInsets.symmetric(horizontal: pad), child: ErrorLine(app.failures['campaigns'], retry: app.loadCampaigns)))
      else if (!app.loadedCampaigns)
        const SliverToBoxAdapter(child: Spinner())
      else if (list.isEmpty)
        SliverToBoxAdapter(child: EmptyNote(Icons.search, q.isEmpty ? 'Nothing open here yet' : 'Nothing matches that', message: q.isEmpty ? 'New campaigns appear as soon as they go live.' : 'Try another word, or clear the search.'))
      else
        SliverPadding(
          padding: EdgeInsets.fromLTRB(pad, 0, pad, 90),
          sliver: SliverLayoutBuilder(builder: (context, c) {
            final cols = compact ? 2 : (c.crossAxisExtent > 1100 ? 4 : c.crossAxisExtent > 760 ? 3 : 2);
            final gap = compact ? 16.0 : 34.0;
            return SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisSpacing: gap, crossAxisSpacing: gap),
              delegate: SliverChildBuilderDelegate((context, i) => CampaignCard(campaign: list[i], onTap: () => app.open(list[i])), childCount: list.length),
            );
          }),
        ),
    ]);
  }

  Widget _searchBar(AppState app, bool compact) => Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: compact ? double.infinity : 700),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: compact ? 16 : 40, vertical: 8),
            child: Glass(
              padding: EdgeInsets.symmetric(horizontal: compact ? 18 : 22),
              child: SizedBox(
                height: compact ? 50 : 56,
                child: Row(children: [
                  const Icon(Icons.search, size: 20, color: C.mute),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _query,
                      onChanged: (_) => setState(() {}),
                      style: body(15),
                      cursorColor: C.paper,
                      decoration: InputDecoration(border: InputBorder.none, isDense: true, hintText: 'Search artists, streamers, songs…', hintStyle: body(15, color: C.faint)),
                    ),
                  ),
                  Text('${app.campaigns.length} live', style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: C.faint, fontFeatures: const [FontFeature.tabularFigures()])),
                ]),
              ),
            ),
          ),
        ),
      );

  Widget _filters(List<String> kinds, bool compact) {
    final row = Row(mainAxisSize: MainAxisSize.min, children: [
      GlassTabs<String>(items: [for (final k in kinds) (k, k)], value: kinds.contains(_kind) ? _kind : 'All', onChanged: (v) => setState(() => _kind = v), compact: true),
      const SizedBox(width: 14),
      Glass(
        padding: const EdgeInsets.all(4),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          for (final p in const ['tiktok', 'youtube', 'instagram'])
            Press(
              onTap: () => setState(() => _platform = _platform == p ? null : p),
              child: AnimatedContainer(duration: const Duration(milliseconds: 250), width: 32, height: 28, alignment: Alignment.center, decoration: BoxDecoration(color: _platform == p ? C.paper : Colors.transparent, borderRadius: BorderRadius.circular(999)), child: PlatformMark(p, size: 14, color: _platform == p ? Colors.black : C.paper.withValues(alpha: 0.7))),
            ),
        ]),
      ),
      const SizedBox(width: 14),
      PopupMenuButton<CampaignSort>(
        color: const Color(0xFF151515),
        onSelected: (s) => setState(() => _sort = s),
        itemBuilder: (_) => [for (final s in CampaignSort.values) PopupMenuItem(value: s, child: Text(s.label, style: body(14)))],
        child: Glass(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: SizedBox(height: 36, child: Center(child: Text(_sort.label, style: body(12.5, color: C.paper.withValues(alpha: 0.8))))))),
      ),
    ]);
    return compact ? SingleChildScrollView(scrollDirection: Axis.horizontal, child: row) : Center(child: row);
  }
}

class _SearchHeader extends SliverPersistentHeaderDelegate {
  _SearchHeader({required this.child, required this.height});
  final Widget child;
  final double height;
  @override
  double get minExtent => height;
  @override
  double get maxExtent => height;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => child;
  @override
  bool shouldRebuild(covariant _SearchHeader old) => true;
}
