import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'ob_controls.dart';

// The walk through the dashboard after sign up, the same as the site's (components/onboarding/tour.tsx): a small window with the dashboard's
// own menu and, for each stop, a picture of that page with the one thing to notice pulsing. Sample numbers only.

enum TourMock { overview, submissions, earnings, profile, settings, brandOverview, campaigns, brandSubmissions, balance }

class TourStop {
  const TourStop(this.icon, this.label, this.title, this.text, this.tip, this.mock);
  final IconData icon;
  final String label, title, text, tip;
  final TourMock mock;
}

List<TourStop> tourStops(bool brand) => brand
    ? const [
        TourStop(Icons.grid_view_rounded, 'Overview', 'The whole picture.', 'How your campaigns are doing, and the next thing to do to get set up.', 'The setup guide shows what is left before you launch.', TourMock.brandOverview),
        TourStop(Icons.campaign_outlined, 'Campaigns', 'Launch in minutes.', 'Launch a campaign with a brief, a rate and a budget cap. Pause it or change its budget any time.', 'A clear brief gets better clips.', TourMock.campaigns),
        TourStop(Icons.movie_outlined, 'Submissions', 'Everything made for you.', 'Everything made for your campaigns, with its views and its status.', 'Open any clip to see where it was posted.', TourMock.brandSubmissions),
        TourStop(Icons.payments_outlined, 'Balance', 'One balance for all of it.', 'Add funds once. Every campaign draws from the same balance as creators earn.', 'Each campaign has its own cap, so none can overspend.', TourMock.balance),
        TourStop(Icons.settings_outlined, 'Settings', 'Make it quiet, or loud.', 'Notifications, Discord, your password and your account.', 'Turn on email for the moments that matter.', TourMock.settings),
      ]
    : const [
        TourStop(Icons.grid_view_rounded, 'Overview', 'Your home base.', 'Your balance, how your submissions are going, and the next thing to do to get set up.', 'Start with the setup guide: it takes about five minutes.', TourMock.overview),
        TourStop(Icons.movie_outlined, 'Submissions', 'Paste a link, we do the rest.', 'Paste the link to something you posted. We take a first look right away, and a person checks anything unclear.', 'Most clips are checked within seconds.', TourMock.submissions),
        TourStop(Icons.monetization_on_outlined, 'Earnings', 'Watch it add up.', 'Approved views are counted here. Withdraw to your PayPal once you reach the minimum.', 'Add your PayPal email first so withdrawing is one tap.', TourMock.earnings),
        TourStop(Icons.account_circle_outlined, 'Profile', 'Your public page.', 'Your look, a bio, and the accounts you post from. Brands see it before they work with you.', 'Verify your accounts with a code in your bio.', TourMock.profile),
        TourStop(Icons.settings_outlined, 'Settings', 'Make it quiet, or loud.', 'Notifications, Discord, your password and your account.', 'Connect Discord to hear about new campaigns first.', TourMock.settings),
      ];

class Tour extends StatefulWidget {
  const Tour({super.key, required this.brand, required this.onFinish});
  final bool brand;
  final VoidCallback onFinish;
  @override
  State<Tour> createState() => _TourState();
}

class _TourState extends State<Tour> {
  int _i = 0;
  bool _forward = true;
  final _seen = <int>{0};

  void _go(int n, int count) {
    if (n < 0 || n >= count || n == _i) return;
    setState(() {
      _forward = n > _i;
      _i = n;
      _seen.add(n);
    });
  }

  @override
  Widget build(BuildContext context) {
    final compact = isCompact(context);
    final stops = tourStops(widget.brand);
    final stop = stops[_i];
    final last = _i == stops.length - 1;

    Widget rail() {
      final items = [
        for (var n = 0; n < stops.length; n++)
          Padding(
            padding: EdgeInsets.only(bottom: compact ? 0 : 4, right: compact ? 4 : 0),
            child: Press(
              onTap: () => _go(n, stops.length),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 350),
                curve: Curves.easeOutCubic,
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(color: n == _i ? C.paper : Colors.transparent, borderRadius: BorderRadius.circular(12)),
                child: Row(mainAxisSize: compact ? MainAxisSize.min : MainAxisSize.max, children: [
                  Icon(stops[n].icon, size: 16, color: n == _i ? Colors.black : C.mute),
                  const SizedBox(width: 10),
                  Text(stops[n].label, style: body(15, color: n == _i ? Colors.black : C.mute)),
                  if (!compact) const Spacer(),
                  if (!compact && n != _i && _seen.contains(n)) Icon(Icons.check, size: 13, color: C.paper.withValues(alpha: 0.35)),
                ]),
              ),
            ),
          ),
      ];
      return compact
          ? SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.all(10), child: Row(children: items))
          : Padding(padding: const EdgeInsets.all(12), child: Column(children: items));
    }

    final mock = Padding(
      padding: EdgeInsets.all(compact ? 16 : 20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 304),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 280),
          switchInCurve: Curves.easeOutCubic,
          transitionBuilder: (child, anim) => FadeTransition(
            opacity: anim,
            child: SlideTransition(position: Tween(begin: Offset(_forward ? 0.05 : -0.05, 0), end: Offset.zero).animate(anim), child: child),
          ),
          layoutBuilder: (cur, prev) => Stack(alignment: Alignment.topLeft, children: [...prev, if (cur != null) cur]),
          child: _MockView(key: ValueKey(_i), kind: stop.mock),
        ),
      ),
    );

    return Focus(
      autofocus: true,
      onKeyEvent: (_, e) {
        if (e is! KeyDownEvent) return KeyEventResult.ignored;
        if (e.logicalKey == LogicalKeyboardKey.arrowRight) {
          _go(_i + 1, stops.length);
          return KeyEventResult.handled;
        }
        if (e.logicalKey == LogicalKeyboardKey.arrowLeft) {
          _go(_i - 1, stops.length);
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            for (var n = 0; n < stops.length; n++)
              Expanded(
                child: Press(
                  onTap: () => _go(n, stops.length),
                  child: SizedBox(
                    height: 20,
                    child: Center(
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        height: 4,
                        margin: EdgeInsets.only(right: n == stops.length - 1 ? 0 : 6),
                        decoration: BoxDecoration(color: C.paper.withValues(alpha: n == _i ? 1 : (_seen.contains(n) ? 0.45 : 0.15)), borderRadius: BorderRadius.circular(99)),
                      ),
                    ),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(32), border: Border.all(color: Colors.white.withValues(alpha: 0.22))),
            clipBehavior: Clip.antiAlias,
            child: compact
                ? Column(children: [rail(), Container(height: 1, color: Colors.white.withValues(alpha: 0.22)), SizedBox(width: double.infinity, child: mock)])
                : IntrinsicHeight(
                    child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      SizedBox(width: 192, child: rail()),
                      Container(width: 1, color: Colors.white.withValues(alpha: 0.22)),
                      Expanded(child: mock),
                    ]),
                  ),
          ),
          const SizedBox(height: 24),
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 150),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: Column(key: ValueKey('cap$_i'), children: [
                Text('${_i + 1} of ${stops.length}', style: body(13, color: C.paper.withValues(alpha: 0.45))),
                const SizedBox(height: 6),
                Text(stop.title, textAlign: TextAlign.center, style: display(30)),
                const SizedBox(height: 12),
                ConstrainedBox(constraints: const BoxConstraints(maxWidth: 440), child: Text(stop.text, textAlign: TextAlign.center, style: body(16, color: C.mute, height: 1.5))),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), border: Border.all(color: Colors.white.withValues(alpha: 0.12))),
                  child: Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(padding: const EdgeInsets.only(top: 2), child: Icon(Icons.lightbulb_outline, size: 14, color: C.paper.withValues(alpha: 0.6))),
                    const SizedBox(width: 8),
                    Flexible(child: Text(stop.tip, style: body(13, color: C.paper.withValues(alpha: 0.6)))),
                  ]),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 24),
          Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, spacing: 24, runSpacing: 12, children: [
            Opacity(opacity: _i == 0 ? 0 : 1, child: IgnorePointer(ignoring: _i == 0, child: ObQuiet('Back', onTap: () => _go(_i - 1, stops.length)))),
            ObPrimary(last ? 'Got it' : 'Next', onTap: () => last ? widget.onFinish() : _go(_i + 1, stops.length)),
            if (!last) ObQuiet('Skip', onTap: widget.onFinish),
          ]),
        ]),
      ),
    );
  }
}

// ---------- the pictures of each page ----------

class _Box extends StatelessWidget {
  const _Box({required this.child, this.pad = 12});
  final Widget child;
  final double pad;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: EdgeInsets.all(pad),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.04), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withValues(alpha: 0.10))),
        child: child,
      );
}

/// A soft pulse around the part of a picture the words are about.
class _Hot extends StatefulWidget {
  const _Hot({required this.child});
  final Widget child;
  @override
  State<_Hot> createState() => _HotState();
}

class _HotState extends State<_Hot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _c,
        builder: (_, child) => Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: C.paper.withValues(alpha: 0.8 - 0.45 * _c.value), width: 2)),
          child: child,
        ),
        child: widget.child,
      );
}

enum _Tone { green, amber, blue }

class _Chip extends StatelessWidget {
  const _Chip(this.text, this.tone);
  final String text;
  final _Tone tone;
  @override
  Widget build(BuildContext context) {
    final c = switch (tone) { _Tone.green => const Color(0xFF6EE6A3), _Tone.amber => const Color(0xFFFCD973), _Tone.blue => const Color(0xFF80CCFF) };
    return Container(height: 20, padding: const EdgeInsets.symmetric(horizontal: 8), alignment: Alignment.center, decoration: BoxDecoration(color: c.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(99)), child: Text(text, style: body(10.5, color: c)));
  }
}

class _Head extends StatelessWidget {
  const _Head(this.title, {this.note});
  final String title;
  final String? note;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(title, style: display(20)),
          if (note != null) Text(note!, style: body(11, color: C.paper.withValues(alpha: 0.4))),
        ]),
      );
}

class _Stat extends StatelessWidget {
  const _Stat(this.v, this.k);
  final String v, k;
  @override
  Widget build(BuildContext context) => _Box(pad: 10, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(v, style: body(17, height: 1.1).copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
        const SizedBox(height: 6),
        Text(k, style: body(11, color: C.paper.withValues(alpha: 0.45))),
      ]));
}

class _Thumb extends StatelessWidget {
  const _Thumb(this.n);
  final int n;
  @override
  Widget build(BuildContext context) {
    const hues = [8.0, 216.0, 29.0, 270.0, 47.0, 180.0, 342.0, 119.0];
    final h = hues[n % hues.length];
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [HSVColor.fromAHSV(1, h, 0.55, 0.8).toColor(), HSVColor.fromAHSV(1, h, 0.7, 0.25).toColor()]),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({this.n, required this.title, this.sub, this.chip, this.tone = _Tone.green, this.trailing});
  final int? n;
  final String title;
  final String? sub, chip, trailing;
  final _Tone tone;
  @override
  Widget build(BuildContext context) => _Box(
        pad: 10,
        child: Row(children: [
          if (n != null) ...[_Thumb(n!), const SizedBox(width: 12)],
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13)),
            if (sub != null) ...[const SizedBox(height: 3), Text(sub!, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(11, color: C.paper.withValues(alpha: 0.45)))],
          ])),
          if (trailing != null) Text(trailing!, style: body(11, color: C.paper.withValues(alpha: 0.5))),
          if (chip != null) _Chip(chip!, tone),
        ]),
      );
}

Widget _pill(String label, {IconData? icon}) => Container(
      height: 30,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: Colors.black), const SizedBox(width: 6)],
        Text(label, style: body(12, color: Colors.black)),
      ]),
    );

class _MockView extends StatelessWidget {
  const _MockView({super.key, required this.kind});
  final TourMock kind;

  static const _gap = SizedBox(height: 10);

  @override
  Widget build(BuildContext context) {
    final List<Widget> rows = switch (kind) {
      TourMock.overview => [
          const _Head('Overview', note: 'Example numbers'),
          _Box(pad: 14, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Available to withdraw', style: body(11, color: C.paper.withValues(alpha: 0.45))),
              const SizedBox(height: 4),
              Text(r'$128.40', style: display(36)),
            ])),
            const _Chip(r'+ $12.10 today', _Tone.green),
          ])),
          const Row(children: [
            Expanded(child: _Stat('48.2K', 'Verified views')), SizedBox(width: 10),
            Expanded(child: _Stat('12', 'Clips')), SizedBox(width: 10),
            Expanded(child: _Stat('9', 'Approved')),
          ]),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(99)),
            child: Row(children: [
              Expanded(child: Text('Next step: link your TikTok', style: body(13, color: Colors.black))),
              const _Hot(child: Padding(padding: EdgeInsets.all(4), child: Icon(Icons.arrow_forward, size: 14, color: Colors.black))),
            ]),
          ),
        ],
      TourMock.submissions => [
          const _Head('Submissions', note: 'Example clips'),
          _Box(pad: 10, child: Row(children: [
            Expanded(child: Text('Paste the link to your post', style: body(13, color: C.paper.withValues(alpha: 0.45)))),
            _Hot(child: Container(height: 28, padding: const EdgeInsets.symmetric(horizontal: 12), alignment: Alignment.center, decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(99)), child: Text('Submit', style: body(12, color: Colors.black)))),
          ])),
          const _Row(n: 0, title: 'Red Room', sub: 'TikTok · 18.4K views', chip: 'Approved'),
          const _Row(n: 1, title: 'Night Drive', sub: 'Instagram · 6.1K views', chip: 'Checking', tone: _Tone.amber),
          const _Row(n: 2, title: 'Static Bloom', sub: 'YouTube · 23.7K views', chip: 'Paid', tone: _Tone.blue),
        ],
      TourMock.earnings => [
          const _Head('Earnings', note: 'Last 7 days, example'),
          _Box(pad: 14, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: Text(r'$128.40', style: display(36))),
              _Hot(child: _pill('Withdraw', icon: Icons.payments_outlined)),
            ]),
            const SizedBox(height: 14),
            SizedBox(height: 80, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              for (final (n, h) in const [28, 46, 36, 62, 54, 80, 96].indexed)
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: n == 6 ? 0 : 8),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: h * 0.8),
                      duration: Duration(milliseconds: 600 + n * 60),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, __) => Container(height: v, decoration: BoxDecoration(color: C.paper.withValues(alpha: n == 6 ? 1 : 0.25), borderRadius: const BorderRadius.vertical(top: Radius.circular(5)))),
                    ),
                  ),
                ),
            ])),
          ])),
          Row(children: [
            const Icon(Icons.check, size: 13, color: C.good),
            const SizedBox(width: 8),
            Expanded(child: Text(r'Minimum to withdraw is $10. PayPal fees are on us.', style: body(12, color: C.paper.withValues(alpha: 0.5)))),
          ]),
        ],
      TourMock.profile => [
          const _Head('Profile', note: 'This is public'),
          Container(
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withValues(alpha: 0.10))),
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              Container(height: 64, decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF6D5BD0), Color(0xFF2A2A5E), Color(0xFF101018)]))),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Transform.translate(
                    offset: const Offset(0, -22),
                    child: Container(width: 56, height: 56, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.black, width: 2), gradient: const RadialGradient(center: Alignment(-0.4, -0.5), colors: [Color(0xFFFFD9A8), Color(0xFFE0707A), Color(0xFF4A2A6A)]))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Padding(padding: const EdgeInsets.only(top: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Your name', style: display(20)),
                    const SizedBox(height: 4),
                    Text('logoless.io/@you', style: body(11, color: C.paper.withValues(alpha: 0.45))),
                  ]))),
                  Row(children: [
                    _Hot(child: _dot(Icons.play_arrow_rounded)),
                    const SizedBox(width: 6),
                    _dot(Icons.camera_alt_outlined),
                    const SizedBox(width: 6),
                    _dot(Icons.smart_display_outlined),
                  ]),
                ]),
              ),
            ]),
          ),
          Text('Verified accounts get a tick, and brands notice.', style: body(12, color: C.paper.withValues(alpha: 0.5))),
        ],
      TourMock.settings => [
          const _Head('Settings'),
          for (final (icon, title, on) in const [(Icons.notifications_none, 'Email me about payouts', true), (Icons.link, 'Discord', true), (Icons.settings_outlined, 'Password and account', false)])
            _Box(child: Row(children: [
              Icon(icon, size: 15, color: C.paper.withValues(alpha: 0.6)),
              const SizedBox(width: 12),
              Expanded(child: Text(title, style: body(13))),
              if (on)
                _Hot(child: Container(width: 36, height: 20, padding: const EdgeInsets.all(2), alignment: Alignment.centerRight, decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(99)), child: const CircleAvatar(radius: 8, backgroundColor: Colors.black)))
              else
                Icon(Icons.arrow_forward, size: 14, color: C.paper.withValues(alpha: 0.4)),
            ])),
        ],
      TourMock.brandOverview => [
          const _Head('Overview', note: 'Example numbers'),
          const Row(children: [
            Expanded(child: _Stat('3', 'Live campaigns')), SizedBox(width: 10),
            Expanded(child: _Stat('214K', 'Views bought')), SizedBox(width: 10),
            Expanded(child: _Stat(r'$640', 'Spent')),
          ]),
          _Box(pad: 14, child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Balance', style: body(11, color: C.paper.withValues(alpha: 0.45))),
              const SizedBox(height: 4),
              Text(r'$1,360.00', style: display(30)),
            ])),
            _Hot(child: _pill('New campaign', icon: Icons.campaign_outlined)),
          ])),
        ],
      TourMock.campaigns => [
          const _Head('Campaigns', note: 'Example campaigns'),
          for (final (n, (t, r, p)) in const [('Red Room', r'$3 per 1K', 0.62), ('Static Bloom', r'$2.50 per 1K', 0.28), ('Night Drive', r'$4 per 1K', 0.91)].indexed)
            _Box(pad: 10, child: Row(children: [
              _Thumb(n),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [Expanded(child: Text(t, style: body(13))), Text(r, style: body(11, color: C.paper.withValues(alpha: 0.5)))]),
                const SizedBox(height: 6),
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: p),
                  duration: Duration(milliseconds: 800 + n * 100),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, __) => ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: v, minHeight: 6, backgroundColor: Colors.white.withValues(alpha: 0.10), color: C.paper)),
                ),
              ])),
            ])),
          Align(alignment: Alignment.centerLeft, child: _Hot(child: Container(height: 32, padding: const EdgeInsets.symmetric(horizontal: 16), alignment: Alignment.center, child: Text('Pause or change budget', style: body(12))))),
        ],
      TourMock.brandSubmissions => [
          const _Head('Submissions', note: 'Example clips'),
          const _Row(n: 0, title: '@maya.cuts', sub: 'TikTok · 41.2K views', chip: 'Approved'),
          const _Row(n: 1, title: '@clipwolf', sub: 'YouTube · 18.9K views', chip: 'Approved'),
          const _Row(n: 2, title: '@nova', sub: 'Instagram · 3.3K views', chip: 'Checking', tone: _Tone.amber),
        ],
      TourMock.balance => [
          const _Head('Balance', note: 'Example'),
          _Box(pad: 14, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Available', style: body(11, color: C.paper.withValues(alpha: 0.45))),
            const SizedBox(height: 4),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: Text(r'$1,360.00', style: display(36))),
              _Hot(child: _pill('Add funds', icon: Icons.monetization_on_outlined)),
            ]),
          ])),
          const _Row(title: 'Red Room', trailing: r'$310 drawn'),
          const _Row(title: 'Static Bloom', trailing: r'$180 drawn'),
        ],
    };
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (var n = 0; n < rows.length; n++) ...[if (n > 0) _gap, rows[n]],
    ]);
  }

  static Widget _dot(IconData icon) => Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06)), child: Icon(icon, size: 13, color: C.paper));
}
