import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';

/// The bar that floats over every page of the site: the mark on the left; the bell, Dashboard, you and the menu on the right.
class SiteBar extends StatelessWidget {
  const SiteBar({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(compact ? 14 : 28, compact ? 8 : 14, compact ? 14 : 24, 0),
      child: Row(children: [
        Press(onTap: () => app.go(const AppRoute.home()), child: Image.asset('assets/images/mark.png', width: 50, height: 38, color: C.paper)),
        const Spacer(),
        if (app.isSignedIn) ...[
          GlassCircle(Icons.notifications_none_rounded, dot: app.unread > 0, tooltip: 'Notifications', onTap: () => app.setOverlay(bell: !app.showBell, menu: false)),
          const SizedBox(width: 10),
          PaperPill('Dashboard', height: compact ? 38 : 40, onTap: () => app.go(const AppRoute.dash(DashPage.overview))),
          const SizedBox(width: 10),
          Press(onTap: () => app.go(const AppRoute.dash(DashPage.profile)), child: Avatar(url: app.me?.avatarUrl, name: app.me?.profile?.displayName ?? 'L', size: 40)),
        ] else if (app.phase != Phase.starting) ...[
          GhostPill('Log in', height: 40, onTap: app.signIn),
          const SizedBox(width: 10),
          PaperPill('Get started', busy: app.signingIn, height: 40, onTap: app.beginOnboarding),
        ],
        const SizedBox(width: 10),
        GlassCircle(app.showMenu ? Icons.close_rounded : Icons.menu_rounded, tooltip: app.showMenu ? 'Close the menu' : 'Menu', onTap: () => app.setOverlay(menu: !app.showMenu, bell: false)),
      ]),
    );
  }
}
