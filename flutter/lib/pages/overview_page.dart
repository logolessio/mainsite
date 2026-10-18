import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';
import 'dash_shell.dart';

class OverviewPage extends StatelessWidget {
  const OverviewPage({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    final h = app.home;
    final first = h == null ? null : (h.name.split(' ').first);
    return DashFrame(
      page: DashPage.overview,
      title: first == null ? 'Overview' : 'Welcome back, $first',
      subtitle: 'Your balance, your submissions and anything that needs doing.',
      children: [
        ErrorLine(app.failures['home'], retry: () => app.load(DashPage.overview)),
        if (h != null) ...[
          _figures(context, app, h, compact),
          const SizedBox(height: 36),
          Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
            Text('Recent submissions', style: display(30)),
            const Spacer(),
            Press(onTap: () => app.go(const AppRoute.dash(DashPage.submissions)), child: Text('View all', style: body(14, color: C.mute).copyWith(decoration: TextDecoration.underline))),
          ]),
          const SizedBox(height: 14),
          const Hairline(),
          if (h.recent.isEmpty) ...[
            const EmptyNote(Icons.video_library_outlined, 'No submissions yet', message: 'Join a campaign, post your content and submit the link. It will show up here.'),
            Center(child: PaperPill('Browse campaigns', onTap: () => app.go(const AppRoute.home()))),
          ] else
            for (final s in h.recent) SubmissionRow(s),
        ] else if (app.failures['home'] == null)
          const Spinner(),
      ],
    );
  }

  Widget _figures(BuildContext context, AppState app, Home h, bool compact) {
    final main = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Hairline(strong: true),
      const SizedBox(height: 18),
      Text('Available to withdraw', style: body(14, color: C.mute)),
      const SizedBox(height: 22),
      FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(Money.cents(h.balances.available), style: display(compact ? 60 : 76))),
      const SizedBox(height: 16),
      Text(h.balances.available > 0 ? 'Ready when you are.' : 'Earnings land here once your submissions are approved.', style: body(14, color: C.mute)),
      if (h.balances.pending > 0) Padding(padding: const EdgeInsets.only(top: 3), child: Text('${Money.cents(h.balances.pending)} more is still being confirmed.', style: body(14, color: C.mute))),
      const SizedBox(height: 20),
      Row(children: [
        PaperPill('Withdraw', height: 40, onTap: () => app.go(const AppRoute.dash(DashPage.earnings))),
        const SizedBox(width: 10),
        GhostPill('See earnings', height: 40, onTap: () => app.go(const AppRoute.dash(DashPage.earnings))),
      ]),
    ]);
    Widget fig(String label, String value, String note) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Hairline(),
          const SizedBox(height: 18),
          Text(label, style: body(14, color: C.mute)),
          const SizedBox(height: 22),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: display(compact ? 48 : 60))),
          const SizedBox(height: 16),
          Text(note, style: body(14, color: C.mute)),
        ]);
    final a = fig('Total earned', Money.cents(h.balances.earned), 'Everything you have earned so far');
    final b = fig('Verified views', Money.grouped(h.views), '${h.submissions} ${h.submissions == 1 ? 'submission' : 'submissions'}');
    if (compact) return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [main, const SizedBox(height: 30), a, const SizedBox(height: 30), b]);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: main), const SizedBox(width: 40), Expanded(child: a), const SizedBox(width: 40), Expanded(child: b)]);
  }
}

class SubmissionRow extends StatelessWidget {
  const SubmissionRow(this.s, {super.key});
  final Submission s;
  @override
  Widget build(BuildContext context) {
    final app = context.read<AppState>();
    return Press(
      onTap: () => app.openCampaignId(s.campaignId),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(children: [
            ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 46, height: 46, child: RemoteImage(s.coverUrl, seed: s.campaignId))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.campaign, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(17)),
              const SizedBox(height: 4),
              Row(children: [PlatformMark(s.platform, size: 11, color: C.mute), const SizedBox(width: 6), Text(platformName(s.platform), style: body(12, color: C.mute))]),
            ])),
            const SizedBox(width: 12),
            StatusPill(s.stateLabel, statusTint(s.status)),
            const SizedBox(width: 12),
            SizedBox(width: 100, child: Text('${Money.grouped(s.views)} views', textAlign: TextAlign.right, style: body(14, color: C.mute))),
          ]),
        ),
        const Hairline(),
      ]),
    );
  }
}
