import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';

/// The bell: the latest news in a pane of glass under it, newest first.
class BellPanel extends StatefulWidget {
  const BellPanel({super.key});
  @override
  State<BellPanel> createState() => _BellPanelState();
}

class _BellPanelState extends State<BellPanel> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AppState>().loadNotifications());
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Align(
      alignment: Alignment.topRight,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Glass(
          radius: 26,
          tint: Colors.black.withValues(alpha: 0.7),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
              child: Row(children: [Text('Notifications', style: display(22)), const Spacer(), if (app.unread > 0) Press(onTap: app.markAllRead, child: Text('Mark all as read', style: body(12.5, color: C.mute)))]),
            ),
            const Hairline(),
            if (app.notifications.isEmpty)
              Padding(padding: const EdgeInsets.symmetric(vertical: 40), child: Center(child: Text('You are all caught up.', style: body(14, color: C.mute))))
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 380),
                child: ListView(shrinkWrap: true, padding: EdgeInsets.zero, children: [
                  for (final n in app.notifications.take(8))
                    Press(
                      onTap: () { app.markRead(n); if (n.url != null) app.openUrl(n.url!); },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Container(margin: const EdgeInsets.only(top: 6), width: 7, height: 7, decoration: BoxDecoration(color: n.isRead ? Colors.transparent : C.paper, shape: BoxShape.circle)),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(n.title, style: body(14, color: C.paper.withValues(alpha: n.isRead ? 0.6 : 1), weight: 500)),
                            if (n.body.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 3), child: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: body(12.5, color: C.mute))),
                          ])),
                          const SizedBox(width: 8),
                          Text(relative(n.date), style: body(11, color: C.faint)),
                        ]),
                      ),
                    ),
                ]),
              ),
            const Hairline(),
            Press(onTap: () => app.go(const AppRoute.dash(DashPage.notifications)), child: Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: Center(child: Text('See all', style: body(13, color: C.paper.withValues(alpha: 0.8)))))),
          ]),
        ),
      ),
    );
  }
}
