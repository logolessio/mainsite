import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'dash_shell.dart';

class SubmissionsPage extends StatefulWidget {
  const SubmissionsPage({super.key});
  @override
  State<SubmissionsPage> createState() => _SubmissionsPageState();
}

class _SubmissionsPageState extends State<SubmissionsPage> {
  String _filter = 'all';
  bool _newest = true;
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    int count(String s) => s == 'all' ? app.submissions.length : app.submissions.where((x) => x.status == s).length;
    var shown = _filter == 'all' ? app.submissions : app.submissions.where((x) => x.status == _filter).toList();
    final q = _query.text.trim().toLowerCase();
    if (q.isNotEmpty) shown = shown.where((x) => x.campaign.toLowerCase().contains(q) || x.platform.toLowerCase().contains(q)).toList();
    if (!_newest) shown = shown.reversed.toList();
    final tabs = GlassTabs<String>(items: [('all', 'All ${count('all')}'), ('approved', 'Approved ${count('approved')}'), ('pending', 'In review ${count('pending')}'), ('rejected', 'Rejected ${count('rejected')}')], value: _filter, onChanged: (v) => setState(() => _filter = v), compact: true);
    final search = Glass(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: SizedBox(height: 36, width: compact ? double.infinity : 230, child: Row(children: [
        const Icon(Icons.search, size: 14, color: C.mute),
        const SizedBox(width: 8),
        Expanded(child: TextField(controller: _query, onChanged: (_) => setState(() {}), style: body(13), cursorColor: C.paper, decoration: InputDecoration(border: InputBorder.none, isDense: true, hintText: 'Search submissions', hintStyle: body(13, color: C.faint)))),
      ])),
    );
    final sort = Press(onTap: () => setState(() => _newest = !_newest), child: Glass(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: SizedBox(height: 36, child: Center(child: Text(_newest ? 'Newest' : 'Oldest', style: body(12.5, color: C.paper.withValues(alpha: 0.8))))))));
    return DashFrame(
      page: DashPage.submissions,
      subtitle: "Every submission you've submitted and where it stands. YouTube and TikTok views are checked about every two hours while a campaign is running.",
      children: [
        ErrorLine(app.failures['submissions'], retry: () => app.load(DashPage.submissions)),
        Grid(columns: 4, compactColumns: 2, children: [
          StatCard('Submissions', '${app.submissions.length}', note: '${count('approved')} approved'),
          StatCard('In review', '${count('pending')}', note: 'Waiting on checks'),
          StatCard('Verified views', Money.grouped(app.submissions.fold(0, (a, s) => a + s.views)), note: 'Across all submissions'),
          StatCard('Earned', Money.cents(app.submissions.fold(0, (a, s) => a + s.earnedCents)), note: 'From these submissions'),
        ]),
        const SizedBox(height: 24),
        if (compact) ...[SingleChildScrollView(scrollDirection: Axis.horizontal, child: tabs), const SizedBox(height: 12), Row(children: [Expanded(child: search), const SizedBox(width: 10), sort])]
        else Row(children: [tabs, const Spacer(), search, const SizedBox(width: 12), sort]),
        const SizedBox(height: 24),
        if (shown.isEmpty && app.failures['submissions'] == null)
          EmptyNote(Icons.video_library_outlined, _filter == 'all' ? 'Nothing submitted' : 'Nothing here', message: _filter == 'all' ? 'Content you submit to campaigns will appear here with its review status.' : null)
        else
          Grid(columns: 3, compactColumns: 1, spacing: 16, children: [for (final s in shown) _Card(s)]),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card(this.s);
  final Submission s;
  @override
  Widget build(BuildContext context) {
    final app = context.read<AppState>();
    return Press(
      onTap: () { final u = Uri.tryParse(s.url); if (u != null) app.openUrl(u); },
      child: SiteCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(999)), child: Row(mainAxisSize: MainAxisSize.min, children: [PlatformMark(s.platform, size: 11, color: C.mute), const SizedBox(width: 6), Text(s.platform.toLowerCase(), style: body(11.5, color: C.mute))])),
            const Spacer(),
            StatusPill(s.stateLabel.toLowerCase(), statusTint(s.status)),
          ]),
          const SizedBox(height: 16),
          Text(s.campaign, maxLines: 1, overflow: TextOverflow.ellipsis, style: display(24)),
          const SizedBox(height: 4),
          Text('Submitted ${shortDate(s.date)}', style: body(12.5, color: C.mute)),
          const SizedBox(height: 16),
          const Hairline(),
          const SizedBox(height: 16),
          Row(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Verified views', style: body(11.5, color: C.mute)), const SizedBox(height: 3), Text(Money.grouped(s.views), style: body(16))]),
            const Spacer(),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text('Earned', style: body(11.5, color: C.mute)), const SizedBox(height: 3), Text(Money.cents(s.earnedCents), style: body(16))]),
          ]),
        ]),
      ),
    );
  }
}
