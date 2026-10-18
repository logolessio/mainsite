import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/images.dart';
import '../ui/theme.dart';
import 'submit_sheet.dart';

/// A campaign's own page: the cover and the audio, the facts, the brief, and the button to submit.
class CampaignPage extends StatefulWidget {
  const CampaignPage({super.key, required this.campaign});
  final Campaign campaign;
  @override
  State<CampaignPage> createState() => _CampaignPageState();
}

class _CampaignPageState extends State<CampaignPage> {
  bool _copied = false;
  Campaign get c => widget.campaign;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    final inner = compact ? _phone(app) : _wide(app);
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(compact ? 16 : 40, (compact ? 62 : 78) + MediaQuery.paddingOf(context).top, compact ? 16 : 40, 90),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1040),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _breadcrumbs(app),
            SizedBox(height: compact ? 20 : 30),
            Container(
              padding: EdgeInsets.all(compact ? 18 : 32),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.025), borderRadius: BorderRadius.circular(compact ? 28 : R.panel), border: Border.all(color: C.line)),
              child: Column(children: [
                inner,
                SizedBox(height: compact ? 24 : 32),
                PaperPill('Submit content', height: 54, full: true, onTap: () => app.isSignedIn ? showSubmitSheet(context, c) : app.signIn()),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _wide(AppState app) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 400, child: Column(children: [_cover(28), const SizedBox(height: 16), PlayerPill(campaign: c)])),
        const SizedBox(width: 44),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(c.kind, style: body(14, color: C.mute)), const Spacer(), _save(app)]),
            const SizedBox(height: 14),
            Text(c.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: display(50)),
            const SizedBox(height: 12),
            Text('by ${c.creator}', style: body(17, color: C.mute)),
            const SizedBox(height: 20),
            _facts(false),
            const SizedBox(height: 18),
            Wrap(spacing: 16, runSpacing: 8, children: _platforms()),
            const SizedBox(height: 22),
            _brief(),
            const SizedBox(height: 18),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _bullets('Create this', c.clipThis)), const SizedBox(width: 26), Expanded(child: _bullets('Not allowed', c.offLimits))]),
            const SizedBox(height: 18),
            _footnote(),
          ]),
        ),
      ]);

  Widget _phone(AppState app) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 116, child: _cover(22)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(c.kind, style: body(13, color: C.mute)), const Spacer(), _save(app)]),
              const SizedBox(height: 6),
              Text(c.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: display(30)),
              const SizedBox(height: 6),
              Text('by ${c.creator}', style: body(15, color: C.mute)),
            ]),
          ),
        ]),
        const SizedBox(height: 18),
        _facts(true),
        const SizedBox(height: 18),
        Wrap(spacing: 16, runSpacing: 8, children: _platforms()),
        const SizedBox(height: 18),
        PlayerPill(campaign: c),
        const SizedBox(height: 18),
        _brief(),
        const SizedBox(height: 18),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _bullets('Create this', c.clipThis)), const SizedBox(width: 18), Expanded(child: _bullets('Not allowed', c.offLimits))]),
        const SizedBox(height: 18),
        _footnote(),
      ]);

  Widget _cover(double radius) => AspectRatio(
        aspectRatio: 1,
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(radius), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 26, offset: const Offset(0, 18))]),
          child: ClipRRect(borderRadius: BorderRadius.circular(radius), child: Stack(fit: StackFit.expand, children: [RemoteImage(c.coverUrl, seed: c.id), DecoratedBox(decoration: BoxDecoration(borderRadius: BorderRadius.circular(radius), border: Border.all(color: Colors.white.withValues(alpha: 0.08))))])),
        ),
      );

  Widget _save(AppState app) => Tooltip(
        message: app.isSaved(c) ? 'Remove from saved' : 'Save this campaign',
        child: Press(onTap: () => app.toggleSaved(c), child: Glass(radius: 36, child: SizedBox(width: 36, height: 36, child: Icon(app.isSaved(c) ? Icons.favorite : Icons.favorite_border, size: 17, color: app.isSaved(c) ? C.paper : C.paper.withValues(alpha: 0.7))))),
      );

  Widget _facts(bool compact) => Row(children: [
        Expanded(child: _fact('You earn', '\$${c.ratePer1k.toStringAsFixed(2)}', 'per 1,000 views', compact)),
        SizedBox(width: compact ? 8 : 12),
        Expanded(child: _fact('Budget', c.budget > 0 ? Money.compact(c.budget) : 'Open', c.budgetLeftPct != null ? '${c.budgetLeftPct}% left' : (c.budget > 0 ? 'total' : 'no cap'), compact)),
        SizedBox(width: compact ? 8 : 12),
        Expanded(child: _fact('Ends', c.endsOn.isEmpty ? 'Open' : c.endsOn, 'deadline', compact)),
      ]);

  Widget _fact(String label, String value, String note, bool compact) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 6),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.03), borderRadius: BorderRadius.circular(18), border: Border.all(color: C.line)),
        child: Column(children: [
          Text(label, style: body(12, color: C.mute)),
          const SizedBox(height: 6),
          FittedBox(fit: BoxFit.scaleDown, child: Text(value, style: display(compact ? 22 : 26))),
          const SizedBox(height: 6),
          Text(note, textAlign: TextAlign.center, style: body(11, color: C.faint)),
        ]),
      );

  List<Widget> _platforms() => [for (final p in c.platforms) Row(mainAxisSize: MainAxisSize.min, children: [PlatformMark(p), const SizedBox(width: 7), Text(platformName(p), style: body(14, color: C.paper.withValues(alpha: 0.85)))])];

  Widget _brief() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('The brief', style: body(13, color: C.mute)),
        const SizedBox(height: 8),
        Text(c.summary.isEmpty ? 'No brief yet.' : c.summary, style: body(16, color: C.paper.withValues(alpha: 0.92), height: 1.5)),
      ]);

  Widget _bullets(String title, List<String> items) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: body(13, color: C.mute)),
        const SizedBox(height: 8),
        if (items.isEmpty) Text('Nothing specific.', style: body(14, color: C.faint)),
        for (final i in items) Padding(padding: const EdgeInsets.only(bottom: 4), child: Text('· $i', style: body(14, color: C.paper.withValues(alpha: 0.88)))),
      ]);

  Widget _footnote() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (c.capPerPost != null || c.capPerUser != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text([if (c.capPerPost != null) 'One submission can earn up to \$${Money.plain(c.capPerPost!)}.', if (c.capPerUser != null) 'One creator can earn up to \$${Money.plain(c.capPerUser!)} here.'].join(' '), style: body(13, color: C.mute)),
          ),
        Text('Earnings can be withdrawn as soon as they are confirmed, from \$10.', style: body(13, color: C.mute)),
        const SizedBox(height: 8),
        Wrap(spacing: 14, children: [
          _link('Campaign rules', () => context.read<AppState>().openPath('/legal/campaign-rules')),
          _link('Report', () => context.read<AppState>().openPath('/report')),
          _link(_copied ? 'Copied' : 'Copy link', () async {
            await Clipboard.setData(ClipboardData(text: c.pageUrl.toString()));
            setState(() => _copied = true);
            await Future<void>.delayed(const Duration(seconds: 2));
            if (mounted) setState(() => _copied = false);
          }),
        ]),
      ]);

  Widget _link(String t, VoidCallback onTap) => Press(onTap: onTap, child: Text(t, style: body(13, color: C.paper.withValues(alpha: 0.8)).copyWith(decoration: TextDecoration.underline, decorationColor: C.paper.withValues(alpha: 0.5))));

  Widget _breadcrumbs(AppState app) => Row(children: [
        Press(onTap: () => app.go(const AppRoute.home()), child: Text('Home', style: body(13, color: C.mute))),
        Text('  /  ', style: body(13, color: C.faint)),
        Press(onTap: () => app.go(const AppRoute.home()), child: Text('Campaigns', style: body(13, color: C.mute))),
        Text('  /  ', style: body(13, color: C.faint)),
        Flexible(child: Text(c.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13))),
      ]);
}

/// The campaign's short audio preview: a play button and a waveform that fills as it plays, on glass.
class PlayerPill extends StatefulWidget {
  const PlayerPill({super.key, required this.campaign});
  final Campaign campaign;
  @override
  State<PlayerPill> createState() => _PlayerPillState();
}

class _PlayerPillState extends State<PlayerPill> {
  AudioPlayer? _player;
  bool _playing = false;
  Duration _pos = Duration.zero, _dur = Duration.zero;

  Campaign get c => widget.campaign;

  @override
  void dispose() {
    _player?.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    final uri = c.previewUri;
    if (uri == null) return;
    if (_player == null) {
      final p = AudioPlayer();
      _player = p;
      p.onPositionChanged.listen((d) => mounted ? setState(() => _pos = d) : null);
      p.onDurationChanged.listen((d) => mounted ? setState(() => _dur = d) : null);
      p.onPlayerComplete.listen((_) => mounted ? setState(() { _playing = false; _pos = Duration.zero; }) : null);
    }
    if (_playing) {
      await _player!.pause();
      setState(() => _playing = false);
    } else {
      await _player!.play(UrlSource(uri.toString()));
      setState(() => _playing = true);
    }
  }

  List<double> get _bars {
    var h = c.id.codeUnits.fold<int>(5381, (a, u) => (a * 33 + u) & 0xffffff);
    return List.generate(56, (_) {
      h = (h * 1664525 + 1013904223) & 0xffffffff;
      return 0.25 + ((h >> 16) & 0xff) / 255 * 0.75;
    });
  }

  @override
  Widget build(BuildContext context) {
    final enabled = c.previewUri != null;
    final progress = _dur.inMilliseconds > 0 ? (_pos.inMilliseconds / _dur.inMilliseconds).clamp(0.0, 1.0) : 0.0;
    final bars = _bars;
    return Glass(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(children: [
        Press(
          onTap: enabled ? _toggle : null,
          enabled: enabled,
          child: Container(width: 40, height: 40, decoration: const BoxDecoration(color: C.paper, shape: BoxShape.circle), child: Icon(_playing ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.black, size: 22)),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: SizedBox(
            height: 28,
            child: Row(crossAxisAlignment: CrossAxisAlignment.center, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              for (var i = 0; i < bars.length; i++) Container(width: 2.5, height: 26 * bars[i], decoration: BoxDecoration(color: i / bars.length < progress ? C.paper : C.paper.withValues(alpha: 0.28), borderRadius: BorderRadius.circular(2))),
            ]),
          ),
        ),
        const SizedBox(width: 14),
        Text(_playing ? '${_pos.inMinutes}:${(_pos.inSeconds % 60).toString().padLeft(2, '0')}' : '0:00', style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: C.mute, fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
    );
  }
}
