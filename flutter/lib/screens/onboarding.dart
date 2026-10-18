import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';

/// The first time the app opens: what logoless is, how it pays, then signing in and setting up a profile and a payout address.
/// Every step can be skipped; nothing here is needed to look around.
class Onboarding extends StatefulWidget {
  const Onboarding({super.key, this.start = 0});
  final int start;
  @override
  State<Onboarding> createState() => _OnboardingState();
}

enum _Step { welcome, how, account, profile, payout, done }

enum _Handle { idle, checking, free, taken, invalid }

class _OnboardingState extends State<Onboarding> {
  late _Step _step = _Step.values[widget.start.clamp(0, _Step.values.length - 1)];
  bool _forward = true, _busy = false, _filled = false;
  String? _error;
  _Handle _handle = _Handle.idle;
  final _name = TextEditingController(), _user = TextEditingController(), _bio = TextEditingController();
  final _tiktok = TextEditingController(), _youtube = TextEditingController(), _instagram = TextEditingController(), _paypal = TextEditingController();

  @override
  void dispose() {
    for (final c in [_name, _user, _bio, _tiktok, _youtube, _instagram, _paypal]) {
      c.dispose();
    }
    super.dispose();
  }

  void _go(_Step s) => setState(() { _error = null; _forward = s.index >= _step.index; _step = s; });

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
    return Material(
      color: Colors.black,
      child: Stack(children: [
        const SiteBackground(),
        SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 14, 28, 0),
              child: Row(children: [
                Image.asset('assets/images/mark.png', width: 46, height: 34, color: C.paper),
                const Spacer(),
                if (_step != _Step.done) Press(onTap: app.finishOnboarding, child: Text('Skip', style: body(14, color: C.mute))),
              ]),
            ),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 380),
                      switchInCurve: Curves.easeOutCubic,
                      transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: SlideTransition(position: Tween(begin: Offset(_forward ? 0.12 : -0.12, 0), end: Offset.zero).animate(anim), child: child)),
                      child: KeyedSubtree(key: ValueKey(_step), child: _content(app)),
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 26),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (final s in _Step.values) AnimatedContainer(duration: const Duration(milliseconds: 300), margin: const EdgeInsets.symmetric(horizontal: 4), width: s == _step ? 22 : 7, height: 7, decoration: BoxDecoration(color: s == _step ? C.paper : C.paper.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(4))),
              ]),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _content(AppState app) => switch (_step) {
        _Step.welcome => _welcome(),
        _Step.how => _how(),
        _Step.account => _account(app),
        _Step.profile => _profile(app),
        _Step.payout => _payout(app),
        _Step.done => _done(app),
      };

  Widget _welcome() => Column(mainAxisSize: MainAxisSize.min, children: [
        Text('Your views\nhave value.', textAlign: TextAlign.center, style: display(isCompact(context) ? 56 : 72, height: 0.98)),
        const SizedBox(height: 26),
        Text('Join a campaign, post your content, and earn for every 1,000 verified views.', textAlign: TextAlign.center, style: body(17, color: C.mute, height: 1.5)),
        const SizedBox(height: 32),
        PaperPill('Get started', height: 54, onTap: () => _go(_Step.how)),
      ]);

  Widget _how() => Column(mainAxisSize: MainAxisSize.min, children: [
        _heading('How it works', 'Three steps, no pitching, no waiting on anyone.'),
        const SizedBox(height: 26),
        _row('1', 'Join a campaign', 'Pick an artist, streamer or brand you like and read the brief.'),
        const SizedBox(height: 12),
        _row('2', 'Post your content', 'Make your own edit, post it on TikTok, YouTube or Instagram, then submit the link.'),
        const SizedBox(height: 12),
        _row('3', 'Get paid for the views', 'You earn for every 1,000 verified views. Withdraw to PayPal from \$10, and we cover the fees.'),
        const SizedBox(height: 26),
        _nav('Continue', () => _go(_Step.account), () => _go(_Step.welcome)),
      ]);

  Widget _account(AppState app) => Column(mainAxisSize: MainAxisSize.min, children: [
        _heading('Sign in or create your account', 'It opens in a secure window on logoless.io. Google, Discord or email all work, and the app never sees your password.'),
        const SizedBox(height: 26),
        if (app.isSignedIn) ...[
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(Icons.check_circle, color: C.good, size: 20), const SizedBox(width: 8), Text('Signed in as ${app.me?.profile?.displayName ?? 'you'}', style: body(16, color: C.good))]),
          const SizedBox(height: 26),
          _nav('Continue', () => _go(_Step.profile), () => _go(_Step.how)),
        ] else ...[
          PaperPill('Continue', busy: app.signingIn, height: 54, full: true, onTap: () async { await app.signIn(); if (app.isSignedIn && mounted) _go(_Step.profile); }),
          const SizedBox(height: 16),
          Press(onTap: app.finishOnboarding, child: Text('Look around first', style: body(15, color: C.mute).copyWith(decoration: TextDecoration.underline))),
          const SizedBox(height: 14),
          Press(onTap: () => _go(_Step.how), child: Text('Back', style: body(14, color: C.faint))),
        ],
      ]);

  Widget _profile(AppState app) {
    final ok = _handle != _Handle.taken && _handle != _Handle.invalid && _name.text.trim().isNotEmpty;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      _heading('Make it yours', 'How brands and other creators see you. You can change all of this later.'),
      const SizedBox(height: 22),
      _field('Name', SiteField(controller: _name, hint: 'Your name', onChanged: (_) => setState(() {}))),
      const SizedBox(height: 14),
      _field('Username', Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SiteField(controller: _user, hint: 'yourname', onChanged: (v) => unawaited(_check(app, v))),
        const SizedBox(height: 6),
        switch (_handle) {
          _Handle.checking => Text('Checking…', style: body(12.5, color: C.faint)),
          _Handle.free => Text('@${_clean(_user.text)} is yours.', style: body(12.5, color: C.good)),
          _Handle.taken => Text('That one is taken.', style: body(12.5, color: C.bad)),
          _Handle.invalid => Text('Use 3 to 20 letters, numbers or underscores.', style: body(12.5, color: C.bad)),
          _Handle.idle => const SizedBox.shrink(),
        },
      ])),
      const SizedBox(height: 14),
      _field('Bio', SiteField(controller: _bio, hint: 'A line about you')),
      const SizedBox(height: 14),
      _field('Where you post (optional)', Column(children: [
        SiteField(controller: _tiktok, hint: 'TikTok @'),
        const SizedBox(height: 10),
        SiteField(controller: _youtube, hint: 'YouTube @'),
        const SizedBox(height: 10),
        SiteField(controller: _instagram, hint: 'Instagram @'),
      ])),
      const SizedBox(height: 16),
      if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, textAlign: TextAlign.center, style: body(13.5, color: C.bad))),
      _nav('Save and continue', ok && !_busy ? () => _saveProfile(app) : null, () => _go(_Step.account), busy: _busy),
    ]);
  }

  Widget _payout(AppState app) => Column(mainAxisSize: MainAxisSize.min, children: [
        _heading('Where should we pay you?', 'Add the PayPal email your earnings go to. You can add it later from Earnings.'),
        const SizedBox(height: 24),
        _field('PayPal email', SiteField(controller: _paypal, hint: 'you@example.com', onChanged: (_) => setState(() {}), keyboard: TextInputType.emailAddress)),
        const SizedBox(height: 16),
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, textAlign: TextAlign.center, style: body(13.5, color: C.bad))),
        _nav(_paypal.text.isEmpty ? 'Skip for now' : 'Save and continue', (_paypal.text.isEmpty || (_paypal.text.contains('@') && _paypal.text.contains('.'))) && !_busy ? () => _savePaypal(app) : null, () => _go(_Step.profile), busy: _busy),
      ]);

  Widget _done(AppState app) => Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.check_circle, size: 52, color: C.good),
        const SizedBox(height: 24),
        Text('You are all set', textAlign: TextAlign.center, style: display(56)),
        const SizedBox(height: 18),
        Text(app.isSignedIn ? 'Find a campaign you like, make something, and submit the link.' : 'Look around. When you are ready to submit content or get paid, sign in from the top right.', textAlign: TextAlign.center, style: body(17, color: C.mute, height: 1.5)),
        const SizedBox(height: 30),
        PaperPill('Browse campaigns', height: 54, onTap: app.finishOnboarding),
      ]);

  Widget _heading(String t, String sub) => Column(children: [
        Text(t, textAlign: TextAlign.center, style: display(isCompact(context) ? 38 : 46)),
        const SizedBox(height: 12),
        Text(sub, textAlign: TextAlign.center, style: body(16, color: C.mute, height: 1.45)),
      ]);

  Widget _row(String n, String t, String text) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.03), borderRadius: BorderRadius.circular(R.card), border: Border.all(color: C.line)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 38, height: 38, alignment: Alignment.center, decoration: const BoxDecoration(color: C.paper, shape: BoxShape.circle), child: Text(n, style: display(22, color: Colors.black))),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: display(24)), const SizedBox(height: 4), Text(text, style: body(14.5, color: C.mute, height: 1.4))])),
        ]),
      );

  Widget _field(String label, Widget child) => Align(alignment: Alignment.centerLeft, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Eyebrow(label), const SizedBox(height: 8), child]));

  Widget _nav(String next, VoidCallback? onNext, VoidCallback back, {bool busy = false}) => Column(children: [
        PaperPill(next, busy: busy, height: 54, full: true, onTap: onNext),
        const SizedBox(height: 14),
        Press(onTap: back, child: Text('Back', style: body(14, color: C.faint))),
      ]);
}
