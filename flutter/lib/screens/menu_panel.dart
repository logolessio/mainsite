import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';

/// The menu slides in from the right edge: the pages in large type, you at the bottom, on a pane of glass.
class MenuPanel extends StatelessWidget {
  const MenuPanel({super.key});

  static const _main = [('Campaigns', null), ('For creators', '/for-clippers'), ('For brands', '/for-brands'), ('Pricing', '/pricing'), ('About', '/about'), ("That's why its called a Q&A :)", '/faq')];
  static const _more = [('Case studies', '/case-studies'), ('Contact', '/contact'), ('Leaderboard', '/leaderboard'), ('Reels', '/reels'), ('Status', '/status')];

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final width = MediaQuery.sizeOf(context).width;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1, end: 0),
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Transform.translate(offset: Offset(t * 440, 0), child: Opacity(opacity: 1 - t, child: child)),
      child: SizedBox(
        width: width < 440 ? width : 440,
        child: Glass(
          shape: const BorderRadius.horizontal(left: Radius.circular(34)),
          tint: Colors.black.withValues(alpha: 0.72),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(34, 86, 34, 26),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final (label, path) in _main)
                  Press(
                    onTap: () => path == null ? app.go(const AppRoute.home()) : app.openPath(path),
                    child: Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Text(path == null && app.route.isHome ? '$label •' : label, style: display(36))),
                  ),
                const SizedBox(height: 30),
                Text('More', style: body(11, color: C.mute)),
                const SizedBox(height: 10),
                Wrap(runSpacing: 12, children: [for (final (label, path) in _more) SizedBox(width: 170, child: Press(onTap: () => app.openPath(path), child: Text(label, style: body(15, color: C.paper.withValues(alpha: 0.8)))))]),
                const SizedBox(height: 36),
                _account(app),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _account(AppState app) {
    final p = app.me?.profile;
    if (!app.isSignedIn || p == null) {
      return Column(children: [
        PaperPill('Get started', height: 54, full: true, onTap: app.signIn),
        const SizedBox(height: 12),
        Center(child: Press(onTap: app.signIn, child: Text('Log in', style: body(15, color: C.mute)))),
      ]);
    }
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.35), borderRadius: BorderRadius.circular(24), border: Border.all(color: C.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Avatar(url: app.me?.avatarUrl, name: p.displayName, size: 52),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(p.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: display(22)), Text('@${p.handle}', style: body(13, color: C.mute))])),
          PaperPill('Dashboard', height: 36, onTap: () => app.go(const AppRoute.dash(DashPage.overview))),
        ]),
        const SizedBox(height: 16),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _chip('Profile', () => app.go(const AppRoute.dash(DashPage.profile))),
          if (app.isAdmin) _chip('Owner dashboard', () => app.go(const AppRoute.dash(DashPage.queue))),
          _chip('Sign out', () { app.setOverlay(menu: false); app.signOut(); }),
        ]),
      ]),
    );
  }

  Widget _chip(String t, VoidCallback onTap) => Press(onTap: onTap, child: Container(height: 30, padding: const EdgeInsets.symmetric(horizontal: 12), alignment: Alignment.center, decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: C.line)), child: Text(t, style: body(12.5, color: C.paper.withValues(alpha: 0.85)))));
}
