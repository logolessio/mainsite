import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/config.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../screens/campaign_card.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';
import 'dash_shell.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _name = TextEditingController(), _bio = TextEditingController();
  bool _filled = false, _busy = false;
  bool? _saved;

  @override
  void dispose() {
    _name.dispose();
    _bio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    final p = app.me?.profile;
    if (p != null && !_filled) { _filled = true; _name.text = p.displayName; _bio.text = p.bio; }
    final changed = p != null && (_name.text != p.displayName || _bio.text != p.bio);
    return DashFrame(
      page: DashPage.profile,
      subtitle: 'How you appear to brands and other creators.',
      children: [
        if (p == null) const Spinner() else ...[
          Glass(
            radius: 30,
            padding: const EdgeInsets.all(28),
            child: Flex(
              direction: compact ? Axis.vertical : Axis.horizontal,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Avatar(url: app.me?.avatarUrl, name: p.displayName, size: compact ? 72 : 96),
                SizedBox(width: 24, height: 16),
                Flexible(fit: FlexFit.loose, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p.displayName, style: display(38)),
                  const SizedBox(height: 6),
                  Text('@${p.handle}', style: body(15, color: C.mute)),
                  const SizedBox(height: 6),
                  Text('${app.me!.clips} ${app.me!.clips == 1 ? 'submission' : 'submissions'} · ${Money.views(app.me!.views)} views · ${Money.cents(app.me!.earnedCents)} earned', style: body(13.5, color: C.faint)),
                ])),
                if (!compact) const Spacer(),
                if (compact) const SizedBox(height: 16),
                GhostPill('View public profile', icon: Icons.north_east_rounded, height: 40, onTap: () => app.openPath('/u/${p.handle}')),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SiteCard(
            padding: 26,
            radius: 26,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Edit', style: display(26)),
              const SizedBox(height: 18),
              const Eyebrow('Display name'),
              const SizedBox(height: 8),
              SiteField(controller: _name, hint: 'Your name', onChanged: (_) => setState(() {})),
              const SizedBox(height: 18),
              const Eyebrow('Bio'),
              const SizedBox(height: 8),
              SiteField(controller: _bio, hint: 'A line about you', maxLines: 4, onChanged: (_) => setState(() {})),
              const SizedBox(height: 6),
              Text('${_bio.text.length} of 400', style: body(12, color: C.faint)),
              const SizedBox(height: 18),
              Row(children: [
                PaperPill('Save changes', busy: _busy, onTap: changed && !_busy && _name.text.trim().isNotEmpty && _bio.text.length <= 400 ? () async {
                  setState(() => _busy = true);
                  final ok = await app.saveProfile(_name.text.trim(), _bio.text);
                  if (mounted) setState(() { _busy = false; _saved = ok; if (ok) _filled = false; });
                } : null),
                const SizedBox(width: 14),
                if (_saved != null) Text(_saved! ? 'Saved.' : (app.failures['profile'] ?? 'Could not save.'), style: body(13.5, color: _saved! ? C.good : C.bad)),
              ]),
            ]),
          ),
          const SizedBox(height: 20),
          Wrap(spacing: 12, runSpacing: 12, children: [
            GhostPill('Handle, picture and look on logoless.io', icon: Icons.open_in_new_rounded, height: 40, onTap: () => app.openPath('/dashboard/profile')),
            GhostPill('Linked accounts', icon: Icons.link_rounded, height: 40, onTap: () => app.openPath('/dashboard/accounts')),
          ]),
        ],
      ],
    );
  }
}

class AchievementsPage extends StatelessWidget {
  const AchievementsPage({super.key});

  Color _tint(String r) => switch (r) { 'rare' => const Color(0xFF73B3FF), 'epic' => const Color(0xFFBF8CFF), 'legendary' => C.warn, _ => C.paper.withValues(alpha: 0.7) };

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final a = app.achievements;
    final sorted = a == null ? <Trophy>[] : ([...a.badges]..sort((x, y) => x.unlocked == y.unlocked ? y.points.compareTo(x.points) : (x.unlocked ? -1 : 1)));
    return DashFrame(
      page: DashPage.achievements,
      subtitle: a == null ? 'Things you have done on logoless.' : '${a.badges.where((b) => b.unlocked).length} of ${a.badges.length} unlocked · ${a.points} points',
      children: [
        ErrorLine(app.failures['achievements'], retry: () => app.load(DashPage.achievements)),
        if (a == null) const Spinner() else Grid(columns: 3, compactColumns: 1, children: [
          for (final b in sorted)
            Container(
              constraints: const BoxConstraints(minHeight: 150),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: b.unlocked ? 0.045 : 0.02), borderRadius: BorderRadius.circular(R.card), border: Border.all(color: C.line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [Icon(b.unlocked ? Icons.verified_rounded : Icons.lock_outline_rounded, size: 18, color: b.unlocked ? _tint(b.rarity) : C.paper.withValues(alpha: 0.3)), const Spacer(), Text(b.rarity, style: body(11, color: _tint(b.rarity).withValues(alpha: b.unlocked ? 1 : 0.5)))]),
                const SizedBox(height: 10),
                Text(b.name, style: display(22, color: C.paper.withValues(alpha: b.unlocked ? 1 : 0.5))),
                const SizedBox(height: 10),
                Text(b.how, style: body(13, color: C.mute, height: 1.4)),
                const SizedBox(height: 14),
                Text('${b.points} points', style: body(12, color: C.faint)),
              ]),
            ),
        ]),
      ],
    );
  }
}

class SavedPage extends StatelessWidget {
  const SavedPage({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final saved = app.campaigns.where((c) => app.favorites.contains(c.id)).toList();
    return DashFrame(
      page: DashPage.saved,
      subtitle: 'Campaigns you saved. You hear when one of them changes.',
      children: [
        if (saved.isEmpty) ...[
          const EmptyNote(Icons.favorite_border, 'Nothing saved yet', message: 'Press the heart on a campaign to keep it here.'),
          Center(child: PaperPill('Browse campaigns', onTap: () => app.go(const AppRoute.home()))),
        ] else
          Grid(columns: 3, compactColumns: 2, spacing: isCompact(context) ? 16 : 28, children: [for (final c in saved) CampaignCard(campaign: c, onTap: () => app.open(c))]),
      ],
    );
  }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    Widget row(String k, String v) => Padding(padding: const EdgeInsets.only(bottom: 14), child: Row(children: [Text(k, style: body(14, color: C.mute)), const Spacer(), Flexible(child: Text(v, textAlign: TextAlign.right, style: body(14)))]));
    return DashFrame(
      page: DashPage.settings,
      subtitle: 'Your account, and how logoless reaches you.',
      children: [
        SiteCard(
          padding: 26,
          radius: 26,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Account', style: display(26)),
            const SizedBox(height: 18),
            if (app.me?.profile != null) row('Signed in as', '${app.me!.profile!.displayName} (@${app.me!.profile!.handle})'),
            row('This app talks to', Config.base.host),
            row('Version', '1.0.0'),
            const SizedBox(height: 4),
            Wrap(spacing: 12, runSpacing: 12, children: [
              GhostPill('Password, email and delete account', icon: Icons.open_in_new_rounded, height: 40, onTap: () => app.openPath('/dashboard/settings')),
              GhostPill('Sign out', icon: Icons.logout_rounded, height: 40, onTap: app.signOut),
              GhostPill('Show the welcome tour', icon: Icons.auto_awesome_outlined, height: 40, onTap: app.replayOnboarding),
            ]),
          ]),
        ),
      ],
    );
  }
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return DashFrame(
      page: DashPage.notifications,
      subtitle: app.unread > 0 ? '${app.unread} new' : 'You are all caught up.',
      children: [
        ErrorLine(app.failures['notifications'], retry: app.loadNotifications),
        Wrap(spacing: 10, runSpacing: 10, children: [
          GhostPill('Mark all as read', icon: Icons.done_all_rounded, height: 36, onTap: app.unread == 0 ? null : app.markAllRead),
          GhostPill('Clear all', icon: Icons.delete_outline_rounded, height: 36, onTap: app.notifications.isEmpty ? null : app.clearNotifications),
        ]),
        const SizedBox(height: 20),
        if (app.notifications.isEmpty && app.failures['notifications'] == null)
          const EmptyNote(Icons.notifications_none_rounded, 'Nothing yet', message: 'You hear here when a submission is reviewed, a payout moves or a campaign you saved changes.')
        else
          for (final n in app.notifications)
            Press(
              onTap: () { app.markRead(n); if (n.url != null) app.openUrl(n.url!); },
              child: Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(margin: const EdgeInsets.only(top: 7), width: 8, height: 8, decoration: BoxDecoration(color: n.isRead ? Colors.transparent : C.paper, shape: BoxShape.circle)),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(n.title, style: body(16, color: C.paper.withValues(alpha: n.isRead ? 0.6 : 1))),
                      if (n.body.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(n.body, style: body(13.5, color: C.mute, height: 1.4))),
                    ])),
                    const SizedBox(width: 12),
                    Text(relative(n.date), style: body(12, color: C.faint)),
                  ]),
                ),
                const Hairline(),
              ]),
            ),
      ],
    );
  }
}
