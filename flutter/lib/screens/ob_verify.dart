import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'ob_controls.dart';

class Acct {
  Acct(this.platform, this.handle, this.status, this.code, this.profileUrl);
  final String platform, handle, status;
  final String? code, profileUrl;
  factory Acct.from(Map j) => Acct('${j['platform']}', '${j['handle'] ?? ''}', '${j['status'] ?? 'none'}', j['code'] as String?, j['profileUrl'] as String?);
}

/// The last question in onboarding: prove the accounts that were just added by putting a short code in their bios. Each account can be done now or
/// left for later (it stays in the dashboard).
class VerifyAccounts extends StatefulWidget {
  const VerifyAccounts({super.key, required this.linked, required this.onDone});
  final Map<String, String> linked;
  final VoidCallback onDone;
  @override
  State<VerifyAccounts> createState() => _VerifyAccountsState();
}

class _VerifyAccountsState extends State<VerifyAccounts> {
  Map<String, Acct> _states = {};
  static const _order = ['tiktok', 'youtube', 'instagram'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _bare(String h) => h.replaceAll('@', '').trim();
  List<String> get _mine => [for (final p in _order) if (_bare(widget.linked[p] ?? '').isNotEmpty) p];
  String _status(String p) => _states[p]?.status == 'verified' ? 'verified' : _states[p]?.status == 'waiting' ? 'waiting' : 'open';

  Future<void> _load() async {
    try {
      final r = await context.read<AppState>().api.get('/api/me/accounts/verify') as Map;
      final next = <String, Acct>{};
      for (final a in (r['accounts'] as List? ?? [])) { final x = Acct.from(a as Map); next[x.platform] = x; }
      if (mounted) setState(() => _states = next);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final done = _mine.where((p) => _status(p) == 'verified').length;
    return Column(children: [
      ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 384),
        child: Column(children: [
          for (final p in _mine)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              height: 56,
              padding: const EdgeInsets.only(left: 20, right: 8),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: Colors.white.withValues(alpha: 0.22))),
              child: Row(children: [
                PlatformMark(p, size: 20, color: C.mute),
                const SizedBox(width: 12),
                Expanded(child: Text('@${_bare(_states[p]?.handle ?? widget.linked[p] ?? '')}', overflow: TextOverflow.ellipsis, style: body(16))),
                switch (_status(p)) {
                  'verified' => Container(height: 40, padding: const EdgeInsets.symmetric(horizontal: 16), decoration: BoxDecoration(color: emerald.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(999)), child: Row(children: [const Icon(Icons.check, size: 16, color: Color(0xFF6EE7B7)), const SizedBox(width: 6), Text('Verified', style: body(14, color: const Color(0xFF6EE7B7)))])),
                  'waiting' => Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text('Waiting for the team', style: body(14, color: C.mute))),
                  _ => Press(onTap: () => showDialog<void>(context: context, barrierColor: Colors.black.withValues(alpha: 0.75), builder: (_) => Dialog(backgroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28), side: BorderSide(color: C.line)), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: BioVerifySheet(platform: p, handle: _bare(_states[p]?.handle ?? widget.linked[p] ?? ''), onChange: _load)))), child: Container(height: 40, padding: const EdgeInsets.symmetric(horizontal: 20), alignment: Alignment.center, decoration: BoxDecoration(color: C.paper, borderRadius: BorderRadius.circular(999)), child: Text('Verify', style: body(14, color: Colors.black, weight: 500)))),
                },
              ]),
            ),
        ]),
      ),
      const SizedBox(height: 20),
      ObPrimary(done > 0 || _mine.any((p) => _status(p) == 'waiting') ? 'Continue' : 'Do this later', onTap: widget.onDone),
      const SizedBox(height: 16),
      ConstrainedBox(constraints: const BoxConstraints(maxWidth: 384), child: Text(done == 0 ? 'Unverified accounts still work. Their submissions just wait for a person to check them. You can verify any time in Accounts.' : done == _mine.length ? 'All set. You can take the codes out of your bios.' : 'You can verify the rest later in Accounts.', textAlign: TextAlign.center, style: body(14, color: C.mute, height: 1.4))),
    ]);
  }
}

/// Prove an account is yours: put a short code in its bio, then we look for it. A person on the team can check by hand when a site will not let us read it.
class BioVerifySheet extends StatefulWidget {
  const BioVerifySheet({super.key, required this.platform, required this.handle, required this.onChange});
  final String platform, handle;
  final VoidCallback onChange;
  @override
  State<BioVerifySheet> createState() => _BioVerifySheetState();
}

enum _Phase { loading, ready, checking, verified, notFound, unreadable, waiting, error }

class _BioVerifySheetState extends State<BioVerifySheet> {
  _Phase _phase = _Phase.loading;
  String _code = '', _profileUrl = '', _message = '';
  bool _copied = false;

  String get _label => platformName(widget.platform);
  String get _where => switch (widget.platform) {
        'tiktok' => 'In TikTok, open your profile, press Edit profile, and add the code to your Bio.',
        'youtube' => 'In YouTube Studio, open Customization, then Basic info, and add the code to your Description.',
        _ => 'In Instagram, open your profile, press Edit profile, and add the code to your Bio.',
      };

  @override
  void initState() {
    super.initState();
    _begin();
  }

  Future<Map> _call(String action) async => await context.read<AppState>().api.post('/api/me/accounts/verify', {'action': action, 'platform': widget.platform}) as Map;

  Future<void> _begin() async {
    try {
      final a = Acct.from((await _call('start'))['account'] as Map);
      if (!mounted) return;
      setState(() { _code = a.code ?? ''; _profileUrl = a.profileUrl ?? ''; _phase = a.status == 'verified' ? _Phase.verified : a.status == 'waiting' ? _Phase.waiting : _Phase.ready; });
    } on ApiError catch (e) {
      if (mounted) setState(() { _phase = _Phase.error; _message = e.message; });
    }
  }

  Future<void> _run() async {
    setState(() => _phase = _Phase.checking);
    try {
      final r = ((await _call('check'))['result'] as Map?) ?? {};
      if (!mounted) return;
      setState(() { _message = '${r['message'] ?? ''}'; _phase = r['status'] == 'verified' ? _Phase.verified : r['status'] == 'unreadable' ? _Phase.unreadable : r['status'] == 'not-found' ? _Phase.notFound : _Phase.error; });
      if (r['status'] == 'verified') widget.onChange();
    } on ApiError catch (e) {
      if (mounted) setState(() { _phase = _Phase.error; _message = e.message; });
    }
  }

  Future<void> _ask() async {
    setState(() => _phase = _Phase.checking);
    try {
      await _call('ask');
      if (mounted) setState(() => _phase = _Phase.waiting);
      widget.onChange();
    } on ApiError catch (e) {
      if (mounted) setState(() { _phase = _Phase.error; _message = e.message; });
    }
  }

  Widget _step(String n, String title, List<Widget> body) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(margin: const EdgeInsets.only(top: 2), width: 24, height: 24, alignment: Alignment.center, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.22))), child: Text(n, style: body_(12))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: body_(15)), const SizedBox(height: 10), ...body])),
      ]);

  TextStyle body_(double s) => body(s);

  @override
  Widget build(BuildContext context) {
    final busy = _phase == _Phase.loading || _phase == _Phase.checking;
    final canAsk = _phase == _Phase.unreadable || _phase == _Phase.notFound || (widget.platform == 'instagram' && _phase == _Phase.ready);
    return Padding(
      padding: const EdgeInsets.all(28),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 48, height: 48, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: C.line)), child: Center(child: PlatformMark(widget.platform, size: 24))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Verify $_label', style: display(24)), Text('@${widget.handle}', overflow: TextOverflow.ellipsis, style: body(14, color: C.mute))])),
            Press(onTap: () => Navigator.of(context).pop(), child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.close, size: 18, color: C.paper))),
          ]),
          if (_phase == _Phase.verified) ...[
            const SizedBox(height: 32),
            Center(child: Column(children: [
              Container(width: 56, height: 56, decoration: BoxDecoration(color: emerald.withValues(alpha: 0.15), shape: BoxShape.circle), child: const Icon(Icons.check, size: 28, color: Color(0xFF6EE7B7))),
              const SizedBox(height: 20),
              Text('@${widget.handle} is verified', style: body(18)),
              const SizedBox(height: 8),
              Text('Submissions from this account can now be checked automatically. You can take the code out of your bio.', textAlign: TextAlign.center, style: body(14, color: C.mute, height: 1.4)),
              const SizedBox(height: 24),
              ObPrimary('Done', onTap: () => Navigator.of(context).pop()),
            ])),
          ] else if (_phase == _Phase.waiting) ...[
            const SizedBox(height: 32),
            Center(child: Column(children: [
              Text('Waiting for the team', style: body(18)),
              const SizedBox(height: 8),
              Text('Someone will look at your bio and you will get a notification. Leave the code in your bio until then.', textAlign: TextAlign.center, style: body(14, color: C.mute, height: 1.4)),
              const SizedBox(height: 16),
              Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withValues(alpha: 0.22))), child: SelectableText(_code, style: const TextStyle(fontFamily: 'monospace', fontSize: 14, color: C.paper))),
              const SizedBox(height: 24),
              GhostPill('Close', onTap: () => Navigator.of(context).pop()),
            ])),
          ] else ...[
            const SizedBox(height: 24),
            _step('1', 'Put this code in your bio', [
              Row(children: [
                Expanded(child: Container(padding: const EdgeInsets.symmetric(vertical: 12), alignment: Alignment.center, decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: 0.22))), child: SelectableText(_phase == _Phase.loading ? '…' : _code, style: const TextStyle(fontFamily: 'monospace', fontSize: 16, color: C.paper)))),
                const SizedBox(width: 8),
                Press(
                  onTap: _code.isEmpty ? null : () async { await Clipboard.setData(ClipboardData(text: _code)); setState(() => _copied = true); await Future<void>.delayed(const Duration(milliseconds: 1600)); if (mounted) setState(() => _copied = false); },
                  child: Container(width: 48, height: 48, decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: 0.22))), child: Icon(_copied ? Icons.check : Icons.copy_rounded, size: 16, color: _copied ? const Color(0xFF6EE7B7) : C.paper)),
                ),
              ]),
              const SizedBox(height: 10),
              Text(_where, style: body(14, color: C.mute, height: 1.4)),
            ]),
            const SizedBox(height: 20),
            _step('2', 'Save it, then check', [Text('It can take a minute for the platform to show the new bio.', style: body(14, color: C.mute))]),
            if (_phase == _Phase.notFound) Container(width: double.infinity, margin: const EdgeInsets.only(top: 20), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), decoration: BoxDecoration(color: C.warn.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(16), border: Border.all(color: C.warn.withValues(alpha: 0.3))), child: Text(_message, style: body(14, color: const Color(0xFFFFF3CC)))),
            if (_phase == _Phase.unreadable) Container(width: double.infinity, margin: const EdgeInsets.only(top: 20), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: 0.22))), child: Text('$_message${_code.isEmpty ? '' : ' If the code is in your bio, ask the team to check it by hand.'}', style: body(14, color: C.paper.withValues(alpha: 0.8)))),
            if (_phase == _Phase.error) Padding(padding: const EdgeInsets.only(top: 20), child: Text(_message, style: body(14, color: redSignal))),
            if (widget.platform == 'instagram' && _phase == _Phase.ready) Padding(padding: const EdgeInsets.only(top: 20), child: Text('Instagram does not let a website read profiles, so a person on our team will check this one. Try the check first, or ask us straight away once the code is in your bio.', style: body(14, color: C.mute, height: 1.4))),
            const SizedBox(height: 24),
            PaperPill('Check my bio', busy: _phase == _Phase.checking, height: 48, full: true, onTap: busy || _code.isEmpty ? null : _run),
            if (canAsk) ...[const SizedBox(height: 10), Center(child: GhostPill('Ask the team to check it', height: 48, onTap: busy ? null : _ask))],
            if (_profileUrl.isNotEmpty) Center(child: Padding(padding: const EdgeInsets.only(top: 12), child: Press(onTap: () => context.read<AppState>().openUrl(Uri.parse(_profileUrl)), child: Text('Open my $_label profile', style: body(14, color: C.mute))))),
          ],
        ]),
      ),
    );
  }
}
