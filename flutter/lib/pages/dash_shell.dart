import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/motion.dart';
import '../ui/theme.dart';
import 'earnings_page.dart';
import 'overview_page.dart';
import 'profile_pages.dart';
import 'queue_page.dart';
import 'submissions_page.dart';

/// The dashboard: on a wide window the website's own rail on the left (the only place the app has one); on a phone a bar at the bottom.
class DashShell extends StatelessWidget {
  const DashShell({super.key, required this.page});
  final DashPage page;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    // only the page changes when you move about the dashboard: the rail and the header stay put, and the page rises in as the old one leaves
    final body = AnimatedSwitcher(
      duration: Motion.page,
      reverseDuration: const Duration(milliseconds: 200),
      switchInCurve: Motion.ease,
      transitionBuilder: Motion.pageIn,
      layoutBuilder: (cur, prev) => Motion.stack(cur, prev),
      child: KeyedSubtree(key: ValueKey(page), child: !app.isSignedIn ? const SignInPrompt() : _page(page)),
    );
    if (compact) {
      return Column(children: [
        SafeArea(bottom: false, child: _CompactHeader()),
        Expanded(child: body),
        _TabBar(page: page),
      ]);
    }
    return Row(children: [
      SizedBox(width: 250, child: _Rail(page: page)),
      Container(width: 1, color: C.line),
      Expanded(child: Column(children: [_Header(page: page), Expanded(child: body)])),
    ]);
  }

  Widget _page(DashPage p) => switch (p) {
        DashPage.overview => const OverviewPage(),
        DashPage.submissions => const SubmissionsPage(),
        DashPage.earnings => const EarningsPage(),
        DashPage.profile => const ProfilePage(),
        DashPage.achievements => const AchievementsPage(),
        DashPage.saved => const SavedPage(),
        DashPage.settings => const SettingsPage(),
        DashPage.notifications => const NotificationsPage(),
        DashPage.queue => const QueuePage(),
      };
}

const _icons = {
  DashPage.overview: Icons.grid_view_rounded,
  DashPage.submissions: Icons.video_library_outlined,
  DashPage.earnings: Icons.monetization_on_outlined,
  DashPage.profile: Icons.person_outline_rounded,
  DashPage.settings: Icons.settings_outlined,
  DashPage.queue: Icons.checklist_rounded,
};

class _Rail extends StatelessWidget {
  const _Rail({required this.page});
  final DashPage page;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final items = page == DashPage.queue ? [DashPage.queue] : [DashPage.overview, DashPage.submissions, DashPage.earnings, DashPage.profile, DashPage.settings];
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.fromLTRB(14, 22, 14, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(left: 6, bottom: 26), child: Press(onTap: () => app.go(const AppRoute.home()), child: Image.asset('assets/images/mark.png', width: 50, height: 38, color: C.paper))),
        Padding(padding: const EdgeInsets.only(left: 10, bottom: 10), child: Text(page == DashPage.queue ? 'Owner' : 'Creator', style: body(12, color: C.mute))),
        // the highlight is one shape that glides from item to item
        SizedBox(
          height: items.length * 44.0,
          child: Stack(children: [
            AnimatedPositioned(
              duration: const Duration(milliseconds: 420),
              curve: Motion.ease,
              top: (items.indexOf(page.rail).clamp(0, items.length)) * 44.0,
              left: 0,
              right: 0,
              height: 40,
              child: AnimatedOpacity(
                duration: Motion.quick,
                opacity: items.contains(page.rail) ? 1 : 0,
                child: Container(decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withValues(alpha: 0.12)))),
              ),
            ),
            Column(children: [
              for (final i in items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Press(
                    onTap: () => app.go(AppRoute.dash(i)),
                    child: SizedBox(
                      height: 40,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Row(children: [
                          TweenAnimationBuilder<Color?>(
                            tween: ColorTween(end: i == page.rail ? C.paper : C.paper.withValues(alpha: 0.6)),
                            duration: Motion.quick,
                            builder: (_, c, __) => Icon(_icons[i], size: 17, color: c),
                          ),
                          const SizedBox(width: 12),
                          TweenAnimationBuilder<Color?>(
                            tween: ColorTween(end: i == page.rail ? C.paper : C.paper.withValues(alpha: 0.6)),
                            duration: Motion.quick,
                            builder: (_, c, __) => Text(i.title, style: body(14.5, color: c ?? C.paper)),
                          ),
                        ]),
                      ),
                    ),
                  ),
                ),
            ]),
          ]),
        ),
        const Spacer(),
        if (app.isAdmin && page != DashPage.queue) _foot('Owner dashboard', Icons.shield_outlined, () => app.go(const AppRoute.dash(DashPage.queue))),
        _foot('Back to the site', Icons.north_west_rounded, () => app.go(const AppRoute.home())),
        const SizedBox(height: 14),
        Glass(
          radius: 20,
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            Avatar(url: app.me?.avatarUrl, name: app.me?.profile?.displayName ?? 'L', size: 36),
            const SizedBox(width: 11),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(app.me?.profile?.displayName ?? 'Signed out', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13.5, weight: 500)),
              Text(app.me?.profile == null ? '' : '@${app.me!.profile!.handle}', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(11.5, color: C.mute)),
            ])),
            Press(onTap: app.signOut, child: const Padding(padding: EdgeInsets.all(6), child: Icon(Icons.logout_rounded, size: 17, color: C.mute))),
          ]),
        ),
      ]),
    );
  }

  Widget _foot(String t, IconData icon, VoidCallback onTap) => Press(onTap: onTap, child: Container(height: 34, padding: const EdgeInsets.symmetric(horizontal: 12), child: Row(children: [Icon(icon, size: 15, color: C.paper.withValues(alpha: 0.55)), const SizedBox(width: 12), Text(t, style: body(13.5, color: C.paper.withValues(alpha: 0.55)))])));
}

class _Header extends StatelessWidget {
  const _Header({required this.page});
  final DashPage page;
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 28),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: C.line))),
      child: Row(children: [
        SizedBox(width: 190, child: Row(children: [Text(page == DashPage.queue ? 'Owner' : 'Creator', style: body(13.5, color: C.mute)), Text('  /  ', style: body(13.5, color: C.faint)), Text(page.rail.title, style: body(13.5))])),
        Expanded(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Press(
                onTap: () => app.setOverlay(jump: true),
                child: Glass(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(height: 42, child: Row(children: [
                    const Icon(Icons.search, size: 16, color: C.mute),
                    const SizedBox(width: 10),
                    Expanded(child: Text('Search, or do something', style: body(14, color: C.mute))),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2), decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), border: Border.all(color: C.line)), child: Text('Ctrl K', style: TextStyle(fontFamily: 'Inter', fontSize: 10.5, color: C.faint))),
                  ])),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        PaperPill('Find a campaign', icon: Icons.add, height: 40, onTap: () => app.go(const AppRoute.home())),
        const SizedBox(width: 10),
        GlassCircle(Icons.notifications_none_rounded, size: 40, dot: app.unread > 0, tooltip: 'Notifications', onTap: () => app.go(const AppRoute.dash(DashPage.notifications))),
      ]),
    );
  }
}

class _CompactHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: C.line))),
      child: Row(children: [
        Press(onTap: () => app.go(const AppRoute.home()), child: Image.asset('assets/images/mark.png', width: 46, height: 34, color: C.paper)),
        const Spacer(),
        GlassCircle(Icons.search, size: 40, tooltip: 'Search', onTap: () => app.setOverlay(jump: true)),
        const SizedBox(width: 10),
        GlassCircle(Icons.add, size: 40, paper: true, tooltip: 'Find a campaign', onTap: () => app.go(const AppRoute.home())),
        const SizedBox(width: 10),
        GlassCircle(Icons.notifications_none_rounded, size: 40, dot: app.unread > 0, tooltip: 'Notifications', onTap: () => app.go(const AppRoute.dash(DashPage.notifications))),
      ]),
    );
  }
}

/// On a phone: the site's bottom bar, on glass.
class _TabBar extends StatelessWidget {
  const _TabBar({required this.page});
  final DashPage page;
  static const _items = [DashPage.overview, DashPage.submissions, DashPage.earnings, DashPage.profile];

  @override
  Widget build(BuildContext context) {
    final app = context.read<AppState>();
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 6),
        child: Glass(
          padding: const EdgeInsets.all(6),
          child: LayoutBuilder(builder: (context, c) {
            final w = c.maxWidth / (_items.length + 1);
            final moreOn = page.rail == DashPage.settings || page == DashPage.queue;
            final at = _items.contains(page.rail) ? _items.indexOf(page.rail) : _items.length;
            return Stack(children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 420),
                curve: Motion.ease,
                left: at * w,
                width: w,
                height: 50,
                child: AnimatedOpacity(duration: Motion.quick, opacity: _items.contains(page.rail) || moreOn ? 1 : 0, child: Container(decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(999)))),
              ),
              Row(children: [
                for (final i in _items) Expanded(child: _tab(i.title, _icons[i]!, i == page.rail, () => app.go(AppRoute.dash(i)))),
                Expanded(child: _tab('More', Icons.more_horiz_rounded, moreOn, () => _more(context, app))),
              ]),
            ]);
          }),
        ),
      ),
    );
  }

  Widget _tab(String t, IconData icon, bool on, VoidCallback onTap) => Press(
        onTap: onTap,
        child: SizedBox(
          height: 50,
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            TweenAnimationBuilder<Color?>(tween: ColorTween(end: on ? Colors.black : C.paper.withValues(alpha: 0.65)), duration: Motion.quick, builder: (_, c, __) => Icon(icon, size: 18, color: c)),
            const SizedBox(height: 3),
            FittedBox(fit: BoxFit.scaleDown, child: TweenAnimationBuilder<Color?>(tween: ColorTween(end: on ? Colors.black : C.paper.withValues(alpha: 0.65)), duration: Motion.quick, builder: (_, c, __) => Text(t, style: body(10, color: c ?? C.paper, weight: 500)))),
          ]),
        ),
      );

  void _more(BuildContext context, AppState app) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.black,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) {
        Widget row(String t, IconData icon, VoidCallback f) => Press(onTap: () { Navigator.of(ctx).pop(); f(); }, child: SizedBox(height: 48, child: Row(children: [Icon(icon, size: 20, color: C.paper), const SizedBox(width: 14), Text(t, style: body(17))])));
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('More', style: display(32)),
              const SizedBox(height: 10),
              row('Settings', Icons.settings_outlined, () => app.go(const AppRoute.dash(DashPage.settings))),
              row('Notifications', Icons.notifications_none_rounded, () => app.go(const AppRoute.dash(DashPage.notifications))),
              row('Saved', Icons.favorite_border, () => app.go(const AppRoute.dash(DashPage.saved))),
              row('Achievements', Icons.workspace_premium_outlined, () => app.go(const AppRoute.dash(DashPage.achievements))),
              if (app.isAdmin) row('Owner queue', Icons.checklist_rounded, () => app.go(const AppRoute.dash(DashPage.queue))),
              const Hairline(),
              row('Back to the site', Icons.north_west_rounded, () => app.go(const AppRoute.home())),
              row('Sign out', Icons.logout_rounded, app.signOut),
            ]),
          ),
        );
      },
    );
  }
}

/// The scrolling frame every dashboard page sits in.
class DashFrame extends StatelessWidget {
  const DashFrame({super.key, required this.page, required this.children, this.title, this.subtitle});
  final DashPage page;
  final List<Widget> children;
  final String? title, subtitle;

  @override
  Widget build(BuildContext context) {
    final app = context.read<AppState>();
    final compact = isCompact(context);
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(compact ? 18 : 48, compact ? 22 : 34, compact ? 18 : 48, compact ? 40 : 60),
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1040),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title ?? page.title, maxLines: compact ? 2 : 1, overflow: TextOverflow.ellipsis, style: display(compact ? 40 : 64)),
            if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 14), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 560), child: Text(subtitle!, style: body(compact ? 15 : 16, color: C.mute, height: 1.45)))),
            const SizedBox(height: 28),
            const Hairline(),
            const SizedBox(height: 28),
            if (page.tabs.length > 1) ...[
              GlassTabs<DashPage>(items: [for (final t in page.tabs) (t, t.title)], value: page, onChanged: (t) => app.go(AppRoute.dash(t))),
              const SizedBox(height: 28),
            ],
            ...children,
          ]),
        ),
      ),
    );
  }
}

class SignInPrompt extends StatelessWidget {
  const SignInPrompt({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Image.asset('assets/images/mark.png', width: 60, height: 46, color: C.paper),
          const SizedBox(height: 22),
          Text('Sign in to logoless', style: display(44), textAlign: TextAlign.center),
          const SizedBox(height: 14),
          ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: Text('See your balance, your submissions and what is waiting for you.', textAlign: TextAlign.center, style: body(17, color: C.mute, height: 1.45))),
          const SizedBox(height: 22),
          PaperPill('Sign in', busy: app.signingIn, onTap: app.signIn),
          const SizedBox(height: 14),
          Text('New here? You can create an account in the same window.', style: body(13, color: C.faint), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

/// Lays children out in equal columns that drop to fewer on a narrow screen.
class Grid extends StatelessWidget {
  const Grid({super.key, required this.columns, required this.children, this.spacing = 14, this.compactColumns});
  final int columns;
  final int? compactColumns;
  final double spacing;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    final cols = isCompact(context) ? (compactColumns ?? (columns > 2 ? 2 : columns)) : columns;
    return LayoutBuilder(builder: (context, c) {
      final w = (c.maxWidth - spacing * (cols - 1)) / cols;
      return Wrap(spacing: spacing, runSpacing: spacing, children: [for (final ch in children) SizedBox(width: w, child: ch)]);
    });
  }
}
