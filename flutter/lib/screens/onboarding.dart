import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/background.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'ob_controls.dart';
import 'ob_verify.dart';

/// The site's onboarding (components/onboarding/onboarding-flow.tsx), step for step, drawn natively: a line typed out in large type, then the
/// answer under it. The app opens straight into it the first time. Signing in is one card that opens the website's own sign-in window (Google,
/// Discord or email), where the site's email and password steps happen.
class Onboarding extends StatefulWidget {
  const Onboarding({super.key, this.start = 0});
  final int start;
  @override
  State<Onboarding> createState() => _OnboardingState();
}

enum Id { welcome, role, method, code, paypal, name, handle, pictures, accounts, happy, saving, verify, hello, tour, done }

class _OnboardingState extends State<Onboarding> {
  static const _settle = 5.2;
  static final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
  static final _handleRe = RegExp(r'^[a-z0-9_]{3,20}$');

  late Id _id = Id.values[widget.start.clamp(0, Id.values.length - 1)];
  final List<Id> _trail = [];
  bool _ready = false, _busy = false, _signedIn = false, _copied = false;
  String _error = '', _sentTo = '', _role = '', _name = '', _handle = '', _lookId = '';
  String? _uploading, _avatarKey, _bannerKey;
  ({ObState st, String msg}) _verdict = (st: ObState.idle, msg: '');
  ({ObState st, String msg})? _forced;
  Timer? _judging, _notes;
  int _tick = 0;
  Uint8List? _avatarBytes, _bannerBytes;
  final Map<String, String> _linked = {};
  final _text = TextEditingController();
  final Map<String, TextEditingController> _acct = {'tiktok': TextEditingController(), 'youtube': TextEditingController(), 'instagram': TextEditingController()};
  bool _didSetup = false;

  bool get _brand => _role == 'brand';
  String get _first => _name.trim().split(RegExp(r'\s+')).first.isEmpty ? 'there' : _name.trim().split(RegExp(r'\s+')).first;
  bool get _canBack => _trail.isNotEmpty && !(_signedIn && const [Id.role, Id.method, Id.code].contains(_trail.last));
  bool get _isTextStep => const [Id.code, Id.paypal, Id.name, Id.handle].contains(_id);
  Look get _look => Looks.byId(_lookId) ?? Looks.forSeed(_handle.isEmpty ? (_name.isEmpty ? 'x' : _name) : _handle);

  @override
  void dispose() {
    _judging?.cancel();
    _notes?.cancel();
    _text.dispose();
    for (final c in _acct.values) {
      c.dispose();
    }
    super.dispose();
  }

  String get _line => switch (_id) {
        Id.welcome => 'Welcome to Logoless.',
        Id.role => 'Are you a creator or a brand?',
        Id.method => 'How would you like to sign in?',
        Id.code => 'Check your email.',
        Id.paypal => 'What is your PayPal email?',
        Id.name => _brand ? 'What is your name or brand called?' : 'What should we call you?',
        Id.handle => 'Pick a username.',
        Id.pictures => 'Make it yours.',
        Id.accounts => 'Where do you post?',
        Id.happy => 'Are you happy with how it looks?',
        Id.saving => 'Setting things up.',
        Id.verify => 'Prove they are yours.',
        Id.hello => 'Welcome, $_first.',
        Id.tour => 'Let us show you around.',
        Id.done => 'You are all set.',
      };

  String get _hint => switch (_id) {
        Id.code => 'We sent a 6 digit code to ${_sentTo.isEmpty ? 'your email' : _sentTo}.',
        Id.paypal => 'That is where your earnings go. You can change it later.',
        Id.handle => 'This is your address on logoless. Letters, numbers and underscores.',
        Id.pictures => 'Pick a ready-made look, or tap the circle and the wide part to upload your own. You can change it any time.',
        Id.accounts => 'Add the accounts you post from, so we can match your submissions to you. Skip it if you like: it is in your dashboard when you are ready.',
        Id.verify => 'Put a short code in each bio and we confirm the account is yours. Submissions from verified accounts are checked automatically.',
        Id.saving => 'This only takes a moment.',
        Id.hello => 'Your profile page is ready.',
        _ => '',
      };

  // ---- moving about

  void _setup(AppState app) {
    if (_didSetup) return;
    _didSetup = true;
    _signedIn = app.isSignedIn;
    final r = app.onboardingRole;
    if (r == 'brand') _role = 'brand';
    if (r == 'clipper' || r == 'creator') _role = 'clipper';
    if (app.isSignedIn && (app.me?.profile?.displayName ?? '').isNotEmpty && _name.isEmpty) _name = app.me!.profile!.displayName;
  }

  void _go(Id next, {String initial = ''}) {
    HapticFeedback.lightImpact();
    if (_id != Id.welcome) _trail.add(_id);
    _judging?.cancel();
    setState(() { _ready = false; _error = ''; _forced = null; _text.text = initial; _verdict = (st: ObState.idle, msg: ''); _id = next; });
    if (next == Id.saving) {
      _tick = 0;
      _notes?.cancel();
      _notes = Timer.periodic(const Duration(milliseconds: 1500), (t) { if (!mounted || _tick >= 3) return t.cancel(); setState(() => _tick++); });
    }
  }

  void _back() {
    if (_trail.isEmpty || !_canBack) return;
    setState(() { _id = _trail.removeLast(); _ready = false; _error = ''; _forced = null; _text.text = ''; _verdict = (st: ObState.idle, msg: ''); });
  }

  Id _afterAuth() => _brand ? Id.name : Id.paypal;

  void _advanceFromWelcome(AppState app) {
    if (_id != Id.welcome) return;
    if (_role.isNotEmpty) { _signedIn ? _enterAfterAuth(app) : _go(Id.method); } else { _go(Id.role); }
  }

  void _choose(AppState app, String role) {
    _role = role;
    _signedIn ? _enterAfterAuth(app) : _go(Id.method);
  }

  /// Everyone proves their account with a code, except people whose sign-in already did (Discord, email sign-ups).
  Future<void> _enterAfterAuth(AppState app) async {
    try {
      final v = await app.api.get('/api/me/verify') as Map;
      if (v['verified'] != true) {
        await _sendCode(app);
        if (mounted) _go(Id.code);
        return;
      }
    } catch (_) {}
    if (mounted) _go(_afterAuth());
  }

  Future<void> _sendCode(AppState app) async {
    try {
      final r = await app.api.post('/api/me/verify', {'action': 'send'}) as Map;
      _sentTo = '${r['sentTo'] ?? ''}';
    } on ApiError catch (e) {
      _forced = (st: ObState.bad, msg: e.message);
    }
  }

  Future<void> _signIn(AppState app) async {
    setState(() { _busy = true; _error = ''; });
    await app.signIn();
    if (!mounted) return;
    setState(() => _busy = false);
    if (!app.isSignedIn) {
      if (app.banner != null) setState(() { _error = app.banner!; app.banner = null; });
      return;
    }
    _signedIn = true;
    if (_name.isEmpty && (app.me?.profile?.displayName ?? '').isNotEmpty) _name = app.me!.profile!.displayName;
    // an account that has been through the flow already (on this or another device) does not run it again
    if (await app.onboardingDone()) { await app.finishOnboarding(); return; }
    if (mounted) _enterAfterAuth(app);
  }

  Future<void> _finish(AppState app) async {
    final target = _brand ? null : const AppRoute.dash(DashPage.overview);
    await app.finishOnboarding();
    if (target != null) {
      app.go(target);
    } else {
      await app.openPath('/brand');
    }
  }

  // ---- text steps

  void _changed(AppState app, String v) {
    setState(() { _error = ''; _forced = null; });
    if (_id == Id.code) {
      if (v.length == 6 && !_busy) _submit(app);
      return;
    }
    if (_id != Id.paypal && _id != Id.handle) return;
    _judging?.cancel();
    final value = v.trim();
    if (value.isEmpty) { setState(() => _verdict = (st: ObState.idle, msg: '')); return; }
    setState(() => _verdict = (st: ObState.checking, msg: ''));
    final step = _id;
    _judging = Timer(const Duration(milliseconds: 380), () async {
      final started = DateTime.now();
      final out = await _judge(app, step, value);
      final left = 520 - DateTime.now().difference(started).inMilliseconds;
      if (left > 0) await Future<void>.delayed(Duration(milliseconds: left));
      if (mounted && _id == step) setState(() => _verdict = out);
    });
  }

  Future<({ObState st, String msg})> _judge(AppState app, Id step, String v) async {
    if (step == Id.paypal) return _emailRe.hasMatch(v) ? (st: ObState.ok, msg: 'Earnings will be sent here') : (st: ObState.bad, msg: 'That does not look like a PayPal email');
    final h = v.toLowerCase();
    if (!_handleRe.hasMatch(h)) return (st: ObState.bad, msg: 'Use 3 to 20 letters, numbers or underscores');
    if (h == app.me?.profile?.handle) return (st: ObState.ok, msg: '@$h is yours');
    final free = await app.handleAvailable(h) ?? true;
    return free ? (st: ObState.ok, msg: '@$h is yours') : (st: ObState.bad, msg: 'Already taken');
  }

  bool get _canContinue => _id == Id.name ? _text.text.trim().length >= 2 : (_forced?.st ?? _verdict.st) == ObState.ok;

  Future<void> _submit(AppState app) async {
    final v = _text.text.trim();
    setState(() => _error = '');
    switch (_id) {
      case Id.code:
        if (v.length != 6) return;
        setState(() { _busy = true; _forced = (st: ObState.checking, msg: ''); });
        var ok = false;
        try { ok = ((await app.api.post('/api/me/verify', {'action': 'check', 'code': v}) as Map)['verified'] == true); } catch (_) {}
        if (!mounted) return;
        setState(() => _busy = false);
        if (!ok) { setState(() => _forced = (st: ObState.bad, msg: 'That code is not right. Check the 6 digits in your email.')); return; }
        setState(() => _forced = (st: ObState.ok, msg: 'Verified'));
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (mounted) _go(_afterAuth());
      case Id.paypal:
        if (_verdict.st != ObState.ok) return;
        setState(() => _busy = true);
        try { await app.addPaypal(v.toLowerCase()); if (mounted) { setState(() => _busy = false); _go(Id.name); } }
        catch (_) { if (mounted) setState(() { _busy = false; _forced = (st: ObState.bad, msg: 'We could not save that. Try again, or add it later in Settings.'); }); }
      case Id.name:
        if (!_canContinue) return;
        _name = v;
        _go(Id.handle, initial: v.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '').padRight(0).substring(0, math.min(20, v.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '').length)));
      case Id.handle:
        if (_verdict.st != ObState.ok) return;
        _handle = v.toLowerCase();
        if (_lookId.isEmpty) _lookId = Looks.forSeed(_handle).id;
        _go(Id.pictures);
      default:
    }
  }

  // ---- pictures

  Future<void> _pick(AppState app, String kind) async {
    setState(() => _error = '');
    final f = await openFile(acceptedTypeGroups: [const XTypeGroup(label: 'Pictures', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'])]);
    if (f == null) return;
    final raw = await f.readAsBytes();
    if (raw.length > 12 * 1024 * 1024) { setState(() => _error = 'That picture is too large. Pick one under 12 MB.'); return; }
    final (w, h) = kind == 'avatar' ? (512, 512) : (1600, 900);
    setState(() => _uploading = kind);
    try {
      final jpeg = await Future(() => _prepare(raw, w, h));
      if (jpeg == null) throw ApiError('That file is not a picture we can read.');
      final r = await app.api.post('/api/me/upload', {'kind': kind, 'data': base64Encode(jpeg)}) as Map;
      setState(() { if (kind == 'avatar') { _avatarKey = '${r['id']}'; _avatarBytes = jpeg; } else { _bannerKey = '${r['id']}'; _bannerBytes = jpeg; } });
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not upload that picture.');
    } finally {
      if (mounted) setState(() => _uploading = null);
    }
  }

  /// Shrinks to what the site accepts, cropping to fill, as a JPEG under 420 KB (re-encoding also strips hidden data).
  Uint8List? _prepare(Uint8List raw, int w, int h) {
    final src = img.decodeImage(raw);
    if (src == null) return null;
    final fitted = img.copyResizeCropSquare(src, size: 1); // keeps the import used for the square case below
    if (fitted.width < 0) return null;
    final out = w == h ? img.copyResizeCropSquare(src, size: w) : _cover(src, w, h);
    for (final q in [88, 78, 66, 54, 42, 32]) {
      final b = img.encodeJpg(out, quality: q);
      if (b.length <= 420 * 1024) return Uint8List.fromList(b);
    }
    return null;
  }

  img.Image _cover(img.Image src, int w, int h) {
    final scale = math.max(w / src.width, h / src.height);
    final resized = img.copyResize(src, width: (src.width * scale).ceil(), height: (src.height * scale).ceil(), interpolation: img.Interpolation.average);
    return img.copyCrop(resized, x: (resized.width - w) ~/ 2, y: (resized.height - h) ~/ 2, width: w, height: h);
  }

  // ---- saving

  /// Saving always takes at least five seconds, with a little commentary, so it feels like something is being made for you.
  Future<void> _save(AppState app) async {
    _go(Id.saving);
    final linked = <String, String>{for (final e in _acct.entries) if (e.value.text.trim().replaceAll('@', '').isNotEmpty) e.key: e.value.text.trim().replaceAll(RegExp(r'[\s@]'), '')};
    _linked..clear()..addAll(linked);
    Future<String?> work() async {
      try {
        await app.api.post('/api/me/onboarding', {'role': _brand ? 'brand' : 'clipper', 'name': _name, 'handle': _handle, 'avatarKey': _avatarKey ?? (_lookId.isEmpty ? null : Looks.key(_lookId)), if (_brand) 'company': _name, 'linked': linked});
        if (_bannerKey != null) { try { await app.api.put('/api/me/profile', {'bannerKind': 'image', 'banner': _bannerKey}); } catch (_) {} }
        else if (_lookId.isNotEmpty) { try { await app.api.put('/api/me/profile', {'bannerKind': 'preset', 'banner': _lookId}); } catch (_) {} }
        return null;
      } on ApiError catch (e) {
        return e.message;
      }
    }

    final results = await Future.wait<Object?>([work(), Future<void>.delayed(const Duration(milliseconds: (_settle * 1000) ~/ 1))]);
    await app.refreshMe();
    if (!mounted) return;
    final failed = results[0] as String?;
    if (failed != null) {
      if (_trail.isNotEmpty) _trail.removeLast();
      setState(() { _ready = false; _error = failed; _id = Id.happy; });
      return;
    }
    final verifiable = !_brand && linked.keys.any((k) => const ['tiktok', 'youtube', 'instagram'].contains(k));
    setState(() { _ready = false; _id = verifiable ? Id.verify : Id.hello; });
  }

  // ---- drawing

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    _setup(app);
    final size = MediaQuery.sizeOf(context);
    final compact = isCompact(context);
    final lineSize = math.min(58.0, math.max(32.0, size.width * 0.054));
    final progress = _id.index / (Id.values.length - 1);
    final liquid = _id == Id.saving && app.liquidLoader && !MediaQuery.disableAnimationsOf(context);

    Widget content = _id == Id.saving
        ? SettleOrb(line: _line, note: const ['Creating your profile', 'Setting up your page', 'Lining up your dashboard', 'Nearly there'][math.min(_tick, 3)], seconds: _settle, size: math.min(size.width * 0.78, 400))
        : Column(children: [
            TypedLine(text: _line, size: lineSize, onReady: () { if (mounted) setState(() => _ready = true); }, onDone: () { if (_id == Id.welcome) Future<void>.delayed(const Duration(milliseconds: 500), () { if (mounted) _advanceFromWelcome(app); }); }),
            const SizedBox(height: 12),
            AnimatedOpacity(duration: const Duration(milliseconds: 500), opacity: _ready && _hint.isNotEmpty ? 1 : 0, child: SizedBox(height: 24, child: Text(_hint, textAlign: TextAlign.center, style: body(16, color: C.mute)))),
            const SizedBox(height: 32),
            IgnorePointer(ignoring: !_ready, child: AnimatedOpacity(duration: const Duration(milliseconds: 500), opacity: _ready ? 1 : 0, child: _controls(app, compact))),
          ]);

    return Material(
      color: Colors.black,
      child: Stack(children: [
        const SiteBackground(),
        if (liquid) const Positioned.fill(child: LiquidFill(seconds: _settle)),
        SafeArea(
          child: LayoutBuilder(builder: (context, c) => SingleChildScrollView(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: 672, minHeight: c.maxHeight),
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(24, size.height * 0.2 - MediaQuery.paddingOf(context).top, 24, 112),
                      child: ColorFiltered(
                        colorFilter: ColorFilter.mode(liquid ? Colors.white : Colors.transparent, liquid ? BlendMode.difference : BlendMode.dst),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 160),
                          child: KeyedSubtree(key: ValueKey(_id), child: Column(children: [content, if (_error.isNotEmpty && !_isTextStep && _id != Id.pictures && _id != Id.method) Padding(padding: const EdgeInsets.only(top: 24), child: Text(_error, textAlign: TextAlign.center, style: body(14, color: redSignal)))])),
                        ),
                      ),
                    ),
                  ),
                ),
              )),
        ),
        Positioned(top: 0, left: 0, child: AnimatedContainer(duration: const Duration(milliseconds: 700), curve: Curves.easeOut, width: size.width * progress, height: 2, color: C.paper)),
        if (_canBack && !const [Id.saving, Id.verify, Id.hello, Id.tour, Id.done, Id.happy].contains(_id)) Positioned(bottom: 0, left: 0, right: 0, child: SafeArea(child: Center(child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Press(onTap: _back, child: Padding(padding: const EdgeInsets.all(12), child: Text('Back', style: body(15, color: C.mute)))))))),
        if (_id != Id.saving) Positioned(top: 0, right: 0, child: SafeArea(child: Padding(padding: const EdgeInsets.only(right: 14, top: 8), child: Press(onTap: app.finishOnboarding, child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), child: Text('Skip', style: body(14, color: C.mute))))))),
      ]),
    );
  }

  Widget _controls(AppState app, bool compact) {
    switch (_id) {
      case Id.welcome:
      case Id.saving:
        return const SizedBox.shrink();

      case Id.role:
        return SplitChoice(options: [('Creator', 'Cut content and get paid for every view', () => _choose(app, 'clipper')), ('Brand', 'Launch a campaign and reach creators', () => _choose(app, 'brand'))]);

      case Id.method:
        return Column(children: [
          ObMethodCard(title: 'Log in with logoless', sub: 'Opens a secure window. Google, Discord or email.', busy: _busy, onTap: () => _signIn(app)),
          if (_error.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 20), child: Text(_error, style: body(14, color: redSignal))),
          const SizedBox(height: 32),
          Row(mainAxisSize: MainAxisSize.min, children: [Text('Already have an account? ', style: body(15, color: C.mute)), Press(onTap: () => _signIn(app), child: Text('Log in', style: body(15).copyWith(decoration: TextDecoration.underline)))]),
          const SizedBox(height: 12),
          ConstrainedBox(constraints: const BoxConstraints(maxWidth: 384), child: Press(onTap: () async { await app.finishOnboarding(); app.goPage('/legal/terms'); }, child: Text('By continuing you agree to the Terms and Privacy Policy, and confirm you are 16 or older.', textAlign: TextAlign.center, style: body(12, color: C.mute.withValues(alpha: 0.8), height: 1.4)))),
        ]);

      case Id.code:
      case Id.paypal:
      case Id.name:
      case Id.handle:
        return Column(children: [
          AnswerField(
            key: ValueKey(_id),
            controller: _text,
            st: _id == Id.name ? ObState.idle : (_forced?.st ?? (_id == Id.code ? ObState.idle : _verdict.st)),
            msg: _id == Id.name ? '' : (_forced?.msg ?? (_id == Id.code ? '' : _verdict.msg)),
            hint: switch (_id) { Id.code => '000000', Id.paypal => 'you@example.com', Id.name => _brand ? 'Your name or brand' : 'Your name', _ => 'username' },
            prefix: _id == Id.handle ? '@' : null,
            numeric: _id == Id.code,
            maxLength: _id == Id.code ? 6 : _id == Id.handle ? 20 : 80,
            keyboard: _id == Id.paypal ? TextInputType.emailAddress : null,
            onChanged: (v) => _changed(app, v),
            onSubmit: () => _submit(app),
          ),
          const SizedBox(height: 28),
          if (_id != Id.code) ObPrimary('Continue', busy: _busy, onTap: _busy || !_canContinue ? null : () => _submit(app)),
          if (_id == Id.paypal) ...[const SizedBox(height: 16), ObQuiet('Add it later', onTap: () => _go(Id.name))],
          if (_id == Id.code) ...[
            ObQuiet('Send it again', onTap: () async { await _sendCode(app); if (mounted) setState(() => _forced ??= (st: ObState.ok, msg: 'We sent a new code')); }),
            const SizedBox(height: 16),
            ObQuiet('Do this later', onTap: () => _go(_afterAuth())),
          ],
        ]);

      case Id.pictures:
        return Column(children: [
          ProfilePill(name: _name, handle: _handle, look: _look, avatar: _avatarBytes == null ? null : MemoryImage(_avatarBytes!), banner: _bannerBytes == null ? null : MemoryImage(_bannerBytes!), editable: true, busy: _uploading, onAvatar: () => _pick(app, 'avatar'), onBanner: () => _pick(app, 'banner')),
          const SizedBox(height: 24),
          LookPicker(value: _lookId, onPick: (v) => setState(() => _lookId = v)),
          if (_error.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 16), child: Text(_error, style: body(14, color: redSignal))),
          const SizedBox(height: 32),
          ObPrimary('Continue', onTap: _uploading != null ? null : () => _go(_brand ? Id.happy : Id.accounts)),
        ]);

      case Id.accounts:
        return Column(children: [
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 384),
            child: Column(children: [
              for (final (k, label, ph) in const [('tiktok', 'TikTok', '@username'), ('youtube', 'YouTube', '@channel'), ('instagram', 'Instagram', '@username')])
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  height: 56,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: Colors.white.withValues(alpha: 0.22))),
                  child: Row(children: [
                    PlatformMark(k, size: 20, color: C.mute),
                    const SizedBox(width: 12),
                    Expanded(child: TextField(controller: _acct[k], onChanged: (_) => setState(() {}), maxLength: 60, autocorrect: false, style: body(16), cursorColor: C.paper, decoration: InputDecoration(counterText: '', border: InputBorder.none, isDense: true, hintText: ph, hintStyle: body(16, color: C.mute.withValues(alpha: 0.6)), semanticCounterText: label))),
                  ]),
                ),
            ]),
          ),
          const SizedBox(height: 20),
          ObPrimary(_acct.values.any((c) => c.text.trim().isNotEmpty) ? 'Continue' : 'Skip for now', onTap: () => _go(Id.happy)),
        ]);

      case Id.happy:
        return Column(children: [
          ProfilePill(name: _name, handle: _handle, look: _look, avatar: _avatarBytes == null ? null : MemoryImage(_avatarBytes!), banner: _bannerBytes == null ? null : MemoryImage(_bannerBytes!)),
          const SizedBox(height: 20),
          Text(_name, style: display(24)),
          const SizedBox(height: 6),
          Text('@$_handle', style: body(15, color: C.mute)),
          const SizedBox(height: 32),
          SplitChoice(options: [('Yes', 'Looks good to me', () => _save(app)), ('Not yet', 'Let me change something', _back)]),
        ]);

      case Id.verify:
        return VerifyAccounts(linked: {for (final e in _acct.entries) if (e.value.text.trim().isNotEmpty) e.key: e.value.text.trim()}, onDone: () => _go(Id.hello));

      case Id.hello:
        return Column(children: [
          Text('This is where people find you', style: body(15, color: C.mute)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.fromLTRB(24, 8, 8, 8),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: Colors.white.withValues(alpha: 0.22))),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Flexible(child: Text('logoless.io/@${_handle.isEmpty ? 'you' : _handle}', overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'monospace', fontSize: 17, color: C.paper))),
              Press(onTap: () async { await Clipboard.setData(ClipboardData(text: 'https://logoless.io/@$_handle')); setState(() => _copied = true); await Future<void>.delayed(const Duration(milliseconds: 1800)); if (mounted) setState(() => _copied = false); }, child: SizedBox(width: 40, height: 40, child: Icon(_copied ? Icons.check : Icons.copy_rounded, size: 16, color: _copied ? emerald : C.mute))),
            ]),
          ),
          const SizedBox(height: 16),
          ConstrainedBox(constraints: const BoxConstraints(maxWidth: 384), child: Text('It is public, so you can share it anywhere. You can also open it from your dashboard and the menu.', textAlign: TextAlign.center, style: body(14, color: C.mute, height: 1.4))),
          const SizedBox(height: 32),
          ObPrimary('Show me around', onTap: () => _go(Id.tour)),
          const SizedBox(height: 16),
          ObQuiet('Skip the tour', onTap: () => _go(Id.done)),
        ]);

      case Id.tour:
        return MiniDash(items: _brand ? const [(Icons.grid_view_rounded, 'Overview', 'How your campaigns are doing, and the next thing to do to get set up.'), (Icons.campaign_outlined, 'Campaigns', 'Launch a campaign with a brief, a rate and a budget cap. Pause it or change its budget any time.'), (Icons.video_library_outlined, 'Submissions', 'Everything made for your campaigns, with its views and its status.'), (Icons.payments_outlined, 'Balance', 'Add funds once. Every campaign draws from the same balance as creators earn.'), (Icons.settings_outlined, 'Settings', 'Notifications, Discord, your password and your account.')] : const [(Icons.grid_view_rounded, 'Overview', 'Your balance, how your submissions are going, and the next thing to do to get set up.'), (Icons.video_library_outlined, 'Submissions', 'Paste the link to something you posted. We take a first look right away, and a person checks anything unclear.'), (Icons.monetization_on_outlined, 'Earnings', 'Approved views are counted here. Withdraw to your PayPal once you reach the minimum.'), (Icons.person_outline_rounded, 'Profile', 'Your public page: your look, a bio, and the accounts you post from.'), (Icons.settings_outlined, 'Settings', 'Notifications, Discord, your password and your account.')], onFinish: () => _go(Id.done));

      case Id.done:
        return Column(children: [
          ConstrainedBox(constraints: const BoxConstraints(maxWidth: 384), child: Text(_brand ? 'Your dashboard has a short guide for the rest: adding funds and making your first campaign.' : 'Your dashboard has a short guide for the rest: linking your accounts, connecting Discord and sending your first submission.', textAlign: TextAlign.center, style: body(16, color: C.mute, height: 1.5))),
          const SizedBox(height: 32),
          ObPrimary('Go to your dashboard', onTap: () => _finish(app)),
        ]);
    }
  }
}
