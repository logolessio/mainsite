import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';
import 'dash_shell.dart';

/// The owner's queue: what needs a decision, and the numbers that matter.
class QueuePage extends StatelessWidget {
  const QueuePage({super.key});

  Future<String?> _reason(BuildContext context, String title, String prompt) {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => AlertDialog(
          backgroundColor: const Color(0xFF111111),
          title: Text(title, style: display(26)),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(prompt, style: body(14, color: C.mute)), const SizedBox(height: 14), SiteField(controller: c, hint: 'At least a few words', maxLines: 3, onChanged: (_) => set(() {}))]),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')), TextButton(onPressed: c.text.trim().length >= 3 ? () => Navigator.pop(ctx, c.text.trim()) : null, child: const Text('Decline'))],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final s = app.staff;
    final compact = isCompact(context);
    return DashFrame(
      page: DashPage.queue,
      subtitle: 'Submissions and withdrawals that are waiting for you.',
      children: [
        ErrorLine(app.failures['staff'] ?? app.failures['decide'], retry: app.loadStaff),
        if (s != null) ...[
          Grid(columns: 4, compactColumns: 2, children: [
            StatCard('To review', '${s.pendingSubmissions}', note: 'submissions'),
            StatCard('Withdrawals held', '${s.payoutsInReview}'),
            StatCard('Live campaigns', '${s.liveCampaigns}'),
            StatCard('People', Money.grouped(s.people), note: '${s.joinedToday} joined today'),
          ]),
          if (s.pending.isEmpty && s.review.isEmpty) const EmptyNote(Icons.check_circle_outline, 'All clear', message: 'Nothing is waiting for a decision.'),
          if (s.review.isNotEmpty) _block('Withdrawals held for a look', [
            for (final p in s.review)
              _row(compact, [
                Row(children: [Text(Money.cents(p.amountCents), style: body(17)), if (p.risk != 'low') ...[const SizedBox(width: 8), const StatusPill('extra checks', C.warn)]]),
                const SizedBox(height: 4),
                Text('${p.email} · to ${p.paypalEmail ?? 'no address'} · ${relative(p.date)}', style: body(13, color: C.mute)),
                if (p.reason != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(p.reason!, style: body(12, color: C.faint))),
              ], [
                GhostPill('Decline', height: 38, onTap: () async { final r = await _reason(context, 'Decline this withdrawal', "Tell the creator why (their balance is unchanged)"); if (r != null) await app.decidePayout(p, approve: false, note: r); }),
                PaperPill('Send', height: 38, onTap: () async {
                  final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(backgroundColor: const Color(0xFF111111), title: Text('Send ${Money.cents(p.amountCents)} to ${p.paypalEmail ?? 'this address'}?', style: display(22)), content: Text('This pays out through PayPal and cannot be undone.', style: body(14, color: C.mute)), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send the money'))]));
                  if (ok == true) await app.decidePayout(p, approve: true);
                }),
              ]),
          ]),
          if (s.pending.isNotEmpty) _block('Submissions to review', [
            for (final sub in s.pending)
              _row(compact, [
                Row(children: [
                  ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 50, height: 50, child: RemoteImage(sub.coverUrl, seed: sub.campaign))),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [Flexible(child: Text(sub.campaign, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(17))), if (sub.risk != 'low') ...[const SizedBox(width: 8), const StatusPill('extra checks', C.warn)]]),
                    const SizedBox(height: 4),
                    Text('${sub.who} · ${platformName(sub.platform)} · ${relative(sub.date)}', style: body(13, color: C.mute)),
                  ])),
                ]),
              ], [
                GhostPill('Open post', icon: Icons.north_east_rounded, height: 38, onTap: () { final u = Uri.tryParse(sub.url); if (u != null) app.openUrl(u); }),
                GhostPill('Decline', height: 38, onTap: () async { final r = await _reason(context, 'Decline this submission', 'Tell the creator why'); if (r != null) await app.decideSubmission(sub, approve: false, reason: r); }),
                PaperPill('Approve', height: 38, onTap: () => app.decideSubmission(sub, approve: true)),
              ]),
          ]),
        ] else if (app.failures['staff'] == null)
          const Spinner(),
      ],
    );
  }

  Widget _block(String title, List<Widget> rows) => Padding(padding: const EdgeInsets.only(top: 36), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: display(30)), const SizedBox(height: 14), const Hairline(), ...rows]));

  Widget _row(bool compact, List<Widget> info, List<Widget> actions) => Column(children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: compact
              ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [...info, const SizedBox(height: 12), Wrap(spacing: 10, runSpacing: 10, children: actions)])
              : Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: info)), const SizedBox(width: 14), ...[for (final a in actions) Padding(padding: const EdgeInsets.only(left: 10), child: a)]]),
        ),
        const Hairline(),
      ]);
}
