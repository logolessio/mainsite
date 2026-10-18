import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/background.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'onboarding_parts.dart';

/// The first time the app opens. Everything is centred on the site's own moving background, with the live campaigns drifting behind:
/// a welcome, a dial that shows what views are worth, how it works, signing in, a profile with a live preview, a payout address, and a burst.
/// Every step can be skipped; nothing here is needed to look around.
class Onboarding extends StatefulWidget {
  const Onboarding({super.key, this.start = 0});
  final int start;
  @override
  State<Onboarding> createState() => _OnboardingState();
}

enum _Step { welcome, worth, how, account, profile, payout, done }

enum _Handle { idle, checking, free, taken, invalid }

class _OnboardingState extends State<Onboarding> {
  late _Step _step = _Step.values[widget.start.clamp(0, _Step.values.length - 1)];
  bool _forward = true, _busy = false, _filled = false;
  String? _error;
  _Handle _handle = _Handle.idle;
  double _dial = 0.5;
  int _active = 0;
  Timer? _loop;
  final _name = TextEditingController(), _user = TextEditingController(), _bio = TextEditingController();
  final _tiktok = TextEditingController(), _youtube = TextEditingController(), _instagram = TextEditingController(), _paypal = TextEditingController();

  @override
  void dispose() {
    _loop?.cancel();
    for (final c in [_name, _user, _bio, _tiktok, _youtube, _instagram, _paypal]) {
      c.dispose();
    }
    super.dispose();
  }

  void _go(_Step s) {
    HapticFeedback.lightImpact();
    _loop?.cancel();
    if (s == _Step.how) {
      _active = 0;
      _loop = Timer.periodic(const Duration(milliseconds: 2100), (_) => mounted ? setState(() => _active = (_active + 1) % 3) : null);
    }
    if (s == _Step.done) HapticFeedback.mediumImpact();
    setState(() { _error = null; _forward = s.index >= _step.index; _step = s; });
  }

  void _back() {
    if (_step.index > 0) _go(_Step.values[_step.index - 1]);
  }

  void _fill(AppState app) {
    final p = app.me?.profile;
    if (_filled || p == null) return;
    _filled = true;
    _name.text = p.displayName; _user.text = p.handle; _bio.text = p.bio; _handle = _Handle.free;
  }

  String _clean(String h) => h.trim().toLowerCase().replaceAll('@', '');

  Future<void> _check(AppState app, String raw) async {
    final h = _clean(raw);
    if (h == app.me?.profile?.handle) { setState(() => _handle = _Handle.free); return; }
    if (!RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(h)) { setState(() => _handle = h.isEmpty ? _Handle.idle : _Handle.invalid); return; }
    setState(() => _handle = _Handle.checking);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted || h != _clean(_user.text)) return;
    final ok = await app.handleAvailable(h);
    if (mounted) setState(() => _handle = ok == null ? _Handle.idle : ok ? _Handle.free : _Handle.taken);
  }

  Future<void> _saveProfile(AppState app) async {
    setState(() { _busy = true; _error = null; });
    final linked = <String, String>{};
    for (final (k, c) in [('tiktok', _tiktok), ('youtube', _youtube), ('instagram', _instagram)]) {
      final t = c.text.trim().replaceAll('@', '');
      if (t.isNotEmpty) linked[k] = t;
    }
    try {
      await app.completeProfile(name: _name.text.trim(), handle: _clean(_user.text), bio: _bio.text, linked: linked);
      if (mounted) _go(_Step.payout);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _savePaypal(AppState app) async {
    if (_paypal.text.trim().isEmpty) { _go(_Step.done); return; }
    setState(() { _busy = true; _error = null; });
    try {
      await app.addPaypal(_paypal.text.trim().toLowerCase());
      if (mounted) _go(_Step.done);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    _fill(app);
    final compact = isCompact(context);
    return Material(
      color: Colors.black,
      child: Stack(children: [
        const SiteBackground(),
        Positioned.fill(child: CoverWall(urls: [for (final c in app.campaigns) c.coverUrl], step: _step.index)),
        if (_step == _Step.done) const Positioned.fill(child: Burst()),
        SafeArea(
          child: Column(children: [
            SizedBox(
              height: 64,
              child: Stack(alignment: Alignment.center, children: [
                StepBars(count: _Step.values.length, step: _step.index),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: Row(children: [
                    if (_step != _Step.welcome && _step != _Step.done) GlassCircle(Icons.chevron_left_rounded, size: 38, tooltip: 'Back', onTap: _back) else const SizedBox(width: 38, height: 38),
                    const Spacer(),
                    if (_step != _Step.done) Press(onTap: app.finishOnboarding, child: Padding(padding: const EdgeInsets.all(10), child: Text('Skip', style: body(14, color: C.mute)))),
                  ]),
                ),
              ]),
            ),
            Expanded(
              child: LayoutBuilder(builder: (context, c) => SingleChildScrollView(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: c.maxHeight),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: compact ? double.infinity : 640),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 600),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeIn,
                              transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: SlideTransition(position: Tween(begin: Offset(_forward ? 0.08 : -0.08, 0), end: Offset.zero).animate(anim), child: ScaleTransition(scale: Tween(begin: 0.96, end: 1.0).animate(anim), child: child))),
                              child: KeyedSubtree(key: ValueKey(_step), child: _content(app, compact)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  )),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _content(AppState app, bool compact) => switch (_step) {
        _Step.welcome => _welcome(compact),
        _Step.worth => _worth(app, compact),
        _Step.how => _how(compact),
        _Step.account => _account(app, compact),
        _Step.profile => _profile(app, compact),
        _Step.payout => _payout(app, compact),
        _Step.done => _done(app, compact),
      };

  Widget _welcome(bool compact) => Column(mainAxisSize: MainAxisSize.min, children: [
        Rise(child: Orb(size: compact ? 92 : 116)),
        SizedBox(height: compact ? 22 : 28),
        WordReveal('Your views\nhave value.', size: compact ? 54 : 96, delay: 0.25),
        SizedBox(height: compact ? 22 : 28),
        Rise(delay: 1.1, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: Text('Join a campaign, post your content, and earn for every 1,000 verified views.', textAlign: TextAlign.center, style: body(compact ? 16 : 18, color: C.mute, height: 1.5)))),
        SizedBox(height: compact ? 22 : 28),
        Rise(delay: 1.4, child: Column(children: [PaperPill('Get started', height: 58, onTap: () => _go(_Step.worth)), const SizedBox(height: 14), Text('About a minute. Skip any step.', style: body(12.5, color: C.faint))])),
      ]);

  double _rate(AppState app) {
    final r = app.campaigns.map((c) => c.ratePer1k).where((x) => x > 0).toList();
    if (r.isEmpty) return 2.5;
    return math.max(1, (r.reduce((a, b) => a + b) / r.length * 2).roundToDouble() / 2);
  }

  double get _views {
    final v = 1000 * math.pow(10, _dial * 3);
    final mag = math.pow(10, (math.log(v) / math.ln10).floor() - 1);
    return (v / mag).roundToDouble() * mag;
  }

  String _caption(double d) => d < 5 ? 'A start. Everyone has one.' : d < 25 ? 'A coffee run, from one post.' : d < 100 ? 'Dinner out, from one post.' : d < 400 ? 'A month of subscriptions, paid.' : d < 1500 ? 'Rent. From one post.' : 'That is a job.';

  Widget _worth(AppState app, bool compact) {
    final rate = _rate(app);
    final dollars = _views / 1000 * rate;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Rise(child: Text('Drag to see what your views are worth', textAlign: TextAlign.center, style: display(compact ? 24 : 32, color: C.paper.withValues(alpha: 0.85)))),
      SizedBox(height: compact ? 16 : 22),
      Rise(delay: 0.15, child: FittedBox(fit: BoxFit.scaleDown, child: Text(Money.cents((dollars * 100).round()), style: display(compact ? 84 : 132).copyWith(shadows: [Shadow(color: Colors.white.withValues(alpha: 0.28), blurRadius: 36)])))),
      const SizedBox(height: 8),
      Text('${Money.views(_views.round())} views', style: TextStyle(fontFamily: 'Inter', fontSize: 15, color: C.mute, fontFeatures: const [FontFeature.tabularFigures()])),
      const SizedBox(height: 22),
      Rise(delay: 0.3, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: Column(children: [
        WorthDial(value: _dial, onChanged: (v) => setState(() => _dial = v), onTick: HapticFeedback.selectionClick),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('1K', style: body(11, color: C.faint)), Text('1M', style: body(11, color: C.faint))]),
      ]))),
      const SizedBox(height: 22),
      AnimatedSwitcher(duration: const Duration(milliseconds: 300), child: Text(_caption(dollars), key: ValueKey(_caption(dollars)), style: body(16, color: C.paper.withValues(alpha: 0.8)))),
      const SizedBox(height: 8),
      Text('at ${Money.cents((rate * 100).round())} per 1,000 verified views', style: body(12.5, color: C.faint)),
      const SizedBox(height: 22),
      Rise(delay: 0.45, child: PaperPill('Continue', height: 56, onTap: () => _go(_Step.how))),
    ]);
  }

  Widget _how(bool compact) {
    const items = [('Join.', 'Pick an artist, streamer or brand you like and read the brief.'), ('Post.', 'Make your own edit, post it on TikTok, YouTube or Instagram, then submit the link.'), ('Get paid.', 'Earn for every 1,000 verified views. Withdraw to PayPal from \$10. We cover the fees.')];
    return Column(mainAxisSize: MainAxisSize.min, children: [
      for (var i = 0; i < items.length; i++)
        Rise(
          delay: i * 0.12,
          child: Press(
            onTap: () { HapticFeedback.selectionClick(); setState(() => _active = i); },
            child: Padding(
              padding: EdgeInsets.only(bottom: compact ? 10 : 14),
              child: AnimatedScale(
                scale: _active == i ? 1 : 0.94,
                duration: const Duration(milliseconds: 500),
                curve: Curves.easeOutCubic,
                child: Column(children: [
                  AnimatedDefaultTextStyle(duration: const Duration(milliseconds: 500), style: display(compact ? 60 : 92, color: C.paper.withValues(alpha: _active == i ? 1 : 0.22)).copyWith(shadows: [Shadow(color: Colors.white.withValues(alpha: _active == i ? 0.35 : 0), blurRadius: 28)]), child: Text(items[i].$1)),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeOutCubic,
                    child: _active == i ? Padding(padding: const EdgeInsets.only(top: 8), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 440), child: Text(items[i].$2, textAlign: TextAlign.center, style: body(compact ? 14.5 : 16, color: C.mute, height: 1.45)))) : const SizedBox(width: double.infinity),
                  ),
                ]),
              ),
            ),
          ),
        ),
      SizedBox(height: compact ? 16 : 22),
      Rise(delay: 0.5, child: PaperPill('Continue', height: 56, onTap: () => _go(_Step.account))),
    ]);
  }

  Widget _account(AppState app, bool compact) => Column(mainAxisSize: MainAxisSize.min, children: [
        Rise(child: Orb(size: compact ? 84 : 104)),
        SizedBox(height: compact ? 20 : 26),
        WordReveal('Make it\nofficial.', size: compact ? 52 : 80, delay: 0.2),
        SizedBox(height: compact ? 20 : 26),
        Rise(delay: 0.9, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: Text('Sign in or create your account. It opens in a secure window on logoless.io, and the app never sees your password.', textAlign: TextAlign.center, style: body(compact ? 15 : 17, color: C.mute, height: 1.5)))),
        const SizedBox(height: 22),
        if (app.isSignedIn) ...[
          Rise(delay: 1.0, child: Row(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.check_circle, color: C.good, size: 20), const SizedBox(width: 8), Text('Signed in as ${app.me?.profile?.displayName ?? 'you'}', style: body(16, color: C.good))])),
          const SizedBox(height: 20),
          Rise(delay: 1.1, child: PaperPill('Continue', height: 56, onTap: () { _fill(app); _go(_Step.profile); })),
        ] else ...[
          Rise(delay: 1.0, child: Row(mainAxisSize: MainAxisSize.min, children: [for (final t in const ['Google', 'Discord', 'Email']) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Glass(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: SizedBox(height: 32, child: Center(child: Text(t, style: body(13, color: C.paper.withValues(alpha: 0.85))))))))])),
          const SizedBox(height: 22),
          Rise(delay: 1.15, child: Column(children: [
            PaperPill('Continue', busy: app.signingIn, height: 58, onTap: () async { await app.signIn(); if (app.isSignedIn && mounted) { _fill(app); _go(_Step.profile); } }),
            const SizedBox(height: 14),
            Press(onTap: app.finishOnboarding, child: Text('Look around first', style: body(15, color: C.mute).copyWith(decoration: TextDecoration.underline))),
          ])),
        ],
      ]);

  Widget _profile(AppState app, bool compact) {
    final ok = _handle != _Handle.taken && _handle != _Handle.invalid && _name.text.trim().isNotEmpty;
    final platforms = [if (_tiktok.text.trim().isNotEmpty) 'tiktok', if (_youtube.text.trim().isNotEmpty) 'youtube', if (_instagram.text.trim().isNotEmpty) 'instagram'];
    return Column(mainAxisSize: MainAxisSize.min, children: [
      WordReveal('Make it yours.', size: compact ? 46 : 64),
      const SizedBox(height: 20),
      Rise(delay: 0.35, child: ProfilePreview(name: _name.text.trim(), handle: _clean(_user.text), bio: _bio.text.trim(), platforms: platforms)),
      const SizedBox(height: 20),
      Rise(
        delay: 0.5,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(children: [
            SiteField(controller: _name, hint: 'Your name', onChanged: (_) => setState(() {})),
            const SizedBox(height: 12),
            Align(alignment: Alignment.centerLeft, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              SiteField(controller: _user, hint: 'username', onChanged: (v) { setState(() {}); unawaited(_check(app, v)); }),
              const SizedBox(height: 6),
              Padding(padding: const EdgeInsets.only(left: 4), child: switch (_handle) {
                _Handle.checking => Text('Checking…', style: body(12.5, color: C.faint)),
                _Handle.free => Text('@${_clean(_user.text)} is yours.', style: body(12.5, color: C.good)),
                _Handle.taken => Text('That one is taken.', style: body(12.5, color: C.bad)),
                _Handle.invalid => Text('Use 3 to 20 letters, numbers or underscores.', style: body(12.5, color: C.bad)),
                _Handle.idle => const SizedBox.shrink(),
              }),
            ])),
            const SizedBox(height: 12),
            SiteField(controller: _bio, hint: 'A line about you', onChanged: (_) => setState(() {})),
            const SizedBox(height: 12),
            if (compact) ...[
              SiteField(controller: _tiktok, hint: 'TikTok @ (optional)', onChanged: (_) => setState(() {})),
              const SizedBox(height: 10),
              SiteField(controller: _youtube, hint: 'YouTube @ (optional)', onChanged: (_) => setState(() {})),
              const SizedBox(height: 10),
              SiteField(controller: _instagram, hint: 'Instagram @ (optional)', onChanged: (_) => setState(() {})),
            ] else
              Row(children: [
                Expanded(child: SiteField(controller: _tiktok, hint: 'TikTok @', onChanged: (_) => setState(() {}))),
                const SizedBox(width: 10),
                Expanded(child: SiteField(controller: _youtube, hint: 'YouTube @', onChanged: (_) => setState(() {}))),
                const SizedBox(width: 10),
                Expanded(child: SiteField(controller: _instagram, hint: 'Instagram @', onChanged: (_) => setState(() {}))),
              ]),
          ]),
        ),
      ),
      const SizedBox(height: 16),
      if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, textAlign: TextAlign.center, style: body(13.5, color: C.bad))),
      Rise(delay: 0.6, child: PaperPill('Save and continue', busy: _busy, height: 56, onTap: ok && !_busy ? () => _saveProfile(app) : null)),
    ]);
  }

  Widget _payout(AppState app, bool compact) => Column(mainAxisSize: MainAxisSize.min, children: [
        WordReveal('Where should\nwe send it?', size: compact ? 46 : 68),
        const SizedBox(height: 22),
        Rise(
          delay: 0.35,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.35), borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.white.withValues(alpha: 0.16)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 30, offset: const Offset(0, 16))]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Row(children: [Text('PayPal', style: body(13, color: C.mute, weight: 500)), const Spacer(), const Icon(Icons.north_east_rounded, size: 14, color: C.mute)]),
              const SizedBox(height: 18),
              Text('\$0.00', style: display(compact ? 56 : 70)),
              const SizedBox(height: 18),
              SiteField(controller: _paypal, hint: 'you@example.com', onChanged: (_) => setState(() {}), keyboard: TextInputType.emailAddress),
              const SizedBox(height: 18),
              Text("We pay PayPal's fees. Whatever you withdraw is what arrives. From \$10.", style: body(12.5, color: C.mute)),
            ]),
          ),
        ),
        const SizedBox(height: 22),
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, textAlign: TextAlign.center, style: body(13.5, color: C.bad))),
        Rise(delay: 0.5, child: Column(children: [
          PaperPill(_paypal.text.isEmpty ? 'Skip for now' : 'Save and continue', busy: _busy, height: 56, onTap: (_paypal.text.isEmpty || (_paypal.text.contains('@') && _paypal.text.contains('.'))) && !_busy ? () => _savePaypal(app) : null),
          const SizedBox(height: 10),
          Text('You can add it later from Earnings.', style: body(12.5, color: C.faint)),
        ])),
      ]);

  Widget _done(AppState app, bool compact) => Column(mainAxisSize: MainAxisSize.min, children: [
        DrawnCheck(size: compact ? 84 : 104),
        const SizedBox(height: 24),
        WordReveal('You are in.', size: compact ? 60 : 104, delay: 0.5),
        const SizedBox(height: 24),
        Rise(delay: 1.3, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: Text(app.isSignedIn ? 'Find a campaign you like, make something, and submit the link.' : 'Look around. When you are ready to submit content or get paid, sign in from the top right.', textAlign: TextAlign.center, style: body(compact ? 16 : 18, color: C.mute, height: 1.5)))),
        const SizedBox(height: 24),
        Rise(delay: 1.5, child: PaperPill('Browse campaigns', height: 58, onTap: () { HapticFeedback.mediumImpact(); app.finishOnboarding(); })),
      ]);
}
