import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../pages/dash_shell.dart';
import '../ui/theme.dart';
import 'bell_panel.dart';
import 'campaign_page.dart';
import 'home_page.dart';
import 'menu_panel.dart';
import 'onboarding.dart';
import 'quick_jump.dart';
import 'site_bar.dart';

/// The whole window: the site's black, the page for the current route, and what floats over it (the bar, the menu, the bell, the jump box).
class Shell extends StatelessWidget {
  const Shell({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyK, control: true): () => app.setOverlay(jump: true),
        const SingleActivator(LogicalKeyboardKey.keyK, meta: true): () => app.setOverlay(jump: true),
        const SingleActivator(LogicalKeyboardKey.escape): () {
          if (app.showJump) { app.setOverlay(jump: false); }
          else if (app.showMenu || app.showBell) { app.setOverlay(menu: false, bell: false); }
          else { app.back(); }
        },
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: Colors.black,
          body: PopScope(
            canPop: !app.canGoBack && !app.showMenu && !app.showBell && !app.showJump,
            onPopInvokedWithResult: (didPop, _) {
              if (didPop) return;
              if (app.showJump) { app.setOverlay(jump: false); }
              else if (app.showMenu || app.showBell) { app.setOverlay(menu: false, bell: false); }
              else { app.back(); }
            },
            child: Stack(children: [
              const SiteBackground(),
              Positioned.fill(
                child: AnimatedSwitcher(
                  duration: app.route.isDash && app.route.isDash ? const Duration(milliseconds: 200) : Duration.zero,
                  child: KeyedSubtree(key: ValueKey(app.route.key), child: _page(app)),
                ),
              ),
              if (!app.route.isDash) const Positioned(top: 0, left: 0, right: 0, child: SafeArea(bottom: false, child: SiteBar())),
              if (app.showMenu || app.showBell)
                Positioned.fill(child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => app.setOverlay(menu: false, bell: false), child: AnimatedContainer(duration: const Duration(milliseconds: 250), color: Colors.black.withValues(alpha: app.showMenu ? 0.45 : 0.001)))),
              if (app.showMenu) const Positioned(top: 0, bottom: 0, right: 0, child: MenuPanel()),
              if (app.showBell) const Positioned(top: 0, right: 0, child: SafeArea(child: Padding(padding: EdgeInsets.only(top: 56, right: 14, left: 14), child: BellPanel()))),
              if (app.showJump) const Positioned.fill(child: QuickJump()),
              if (app.banner != null) Positioned(left: 16, right: 16, bottom: 20, child: SafeArea(child: _Banner(app.banner!, () { app.banner = null; app.setOverlay(); }))),
              if (app.showOnboarding) const Positioned.fill(child: Onboarding()),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _page(AppState app) {
    final r = app.route;
    if (r.campaignId != null) {
      final c = app.campaign(r.campaignId!);
      if (c != null) return CampaignPage(campaign: c);
      return app.loadedCampaigns ? const _Missing() : const Center(child: SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2, color: C.paper)));
    }
    if (r.page != null) return DashShell(page: r.page!);
    return const HomePage();
  }
}

class _Missing extends StatelessWidget {
  const _Missing();
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('That campaign is not open any more', textAlign: TextAlign.center, style: display(36)),
          const SizedBox(height: 18),
        ]),
      );
}

class _Banner extends StatelessWidget {
  const _Banner(this.text, this.onClose);
  final String text;
  final VoidCallback onClose;
  @override
  Widget build(BuildContext context) => Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Material(
            color: const Color(0xFF1B1B1B),
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: onClose,
              borderRadius: BorderRadius.circular(18),
              child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [Expanded(child: Text(text, style: body(14))), const SizedBox(width: 12), const Icon(Icons.close, size: 18, color: C.mute)])),
            ),
          ),
        ),
      );
}
