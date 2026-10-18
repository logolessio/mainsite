import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';

/// Ctrl+K: type to jump to a place or a campaign.
class QuickJump extends StatefulWidget {
  const QuickJump({super.key});
  @override
  State<QuickJump> createState() => _QuickJumpState();
}

class _QuickJumpState extends State<QuickJump> {
  final _q = TextEditingController();

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  List<(String, String, IconData, VoidCallback)> _hits(AppState app) {
    final q = _q.text.trim().toLowerCase();
    final out = <(String, String, IconData, VoidCallback)>[];
    final pages = <(String, IconData, AppRoute)>[('Campaigns', Icons.grid_view_rounded, const AppRoute.home()), for (final p in DashPage.values) if (p != DashPage.queue || app.isAdmin) (p.title, Icons.circle_outlined, AppRoute.dash(p))];
    for (final (title, icon, route) in pages) {
      if (q.isEmpty || title.toLowerCase().contains(q)) out.add((title, 'Go to', icon, () => app.go(route)));
    }
    if (q.isNotEmpty) {
      for (final c in app.campaigns) {
        if ('${c.title} ${c.creator}'.toLowerCase().contains(q)) out.add((c.title, c.creator, Icons.grid_view_rounded, () => app.open(c)));
      }
    }
    return out.take(9).toList();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final hits = _hits(app);
    void choose(int i) { app.setOverlay(jump: false); hits[i].$4(); }
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => app.setOverlay(jump: false),
      child: Container(
        color: Colors.black.withValues(alpha: 0.35),
        alignment: Alignment.topCenter,
        padding: const EdgeInsets.fromLTRB(16, 90, 16, 0),
        child: GestureDetector(
          onTap: () {},
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Glass(
              radius: 26,
              tint: Colors.black.withValues(alpha: 0.7),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: SizedBox(
                    height: 58,
                    child: Row(children: [
                      const Icon(Icons.search, size: 20, color: C.mute),
                      const SizedBox(width: 12),
                      Expanded(child: TextField(controller: _q, autofocus: true, onChanged: (_) => setState(() {}), onSubmitted: (_) { if (hits.isNotEmpty) choose(0); }, style: body(17), cursorColor: C.paper, decoration: InputDecoration(border: InputBorder.none, hintText: 'Jump to a campaign or a page', hintStyle: body(17, color: C.faint)))),
                    ]),
                  ),
                ),
                const Hairline(),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(children: [
                    for (var i = 0; i < hits.length; i++)
                      Press(
                        onTap: () => choose(i),
                        child: Container(
                          height: 40,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(color: i == 0 ? Colors.white.withValues(alpha: 0.08) : Colors.transparent, borderRadius: BorderRadius.circular(10)),
                          child: Row(children: [Icon(hits[i].$3, size: 16, color: C.mute), const SizedBox(width: 12), Text(hits[i].$1, style: body(15)), const SizedBox(width: 10), Expanded(child: Text(hits[i].$2, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(14, color: C.faint)))]),
                        ),
                      ),
                    if (hits.isEmpty) SizedBox(height: 48, child: Center(child: Text('Nothing matches', style: body(14, color: C.faint)))),
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
