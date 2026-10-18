import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';

Future<void> showSubmitSheet(BuildContext context, Campaign c) => showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28), side: BorderSide(color: C.line)),
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 520), child: SubmitSheet(campaign: c)),
      ),
    );

class SubmitSheet extends StatefulWidget {
  const SubmitSheet({super.key, required this.campaign});
  final Campaign campaign;
  @override
  State<SubmitSheet> createState() => _SubmitSheetState();
}

class _SubmitSheetState extends State<SubmitSheet> {
  final _link = TextEditingController();
  late String _platform = widget.campaign.platforms.isNotEmpty ? widget.campaign.platforms.first : 'tiktok';
  bool _busy = false;
  String? _error;
  SubmitResult? _result;

  bool get _valid => (Uri.tryParse(_link.text.trim())?.host ?? '').isNotEmpty;

  @override
  void dispose() {
    _link.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_valid || _busy) return;
    setState(() { _busy = true; _error = null; });
    try {
      final r = await context.read<AppState>().submit(widget.campaign, _platform, _link.text.trim());
      if (mounted) setState(() => _result = r);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.all(28), child: SingleChildScrollView(child: _result != null ? _done(_result!) : _form()));

  Widget _form() {
    final c = widget.campaign;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Submit content', style: display(32)),
      const SizedBox(height: 6),
      Text('to ${c.title} by ${c.creator}', style: body(14, color: C.mute)),
      const SizedBox(height: 16),
      Text('Post your content on your own account first, then paste the link to that post here. Views are counted once it is approved.', style: body(14, color: C.mute, height: 1.45)),
      const SizedBox(height: 18),
      if (c.platforms.length > 1) ...[
        GlassTabs<String>(items: [for (final p in c.platforms) (p, platformName(p))], value: _platform, onChanged: (v) => setState(() => _platform = v), compact: true),
        const SizedBox(height: 16),
      ],
      Row(children: [
        Expanded(child: SiteField(controller: _link, hint: 'Link to your post', onChanged: (_) => setState(() {}), onSubmitted: (_) => _send(), keyboard: TextInputType.url)),
        const SizedBox(width: 10),
        GhostPill('Paste', height: 48, onTap: () async {
          final d = await Clipboard.getData('text/plain');
          if (d?.text != null) setState(() => _link.text = d!.text!.trim());
        }),
      ]),
      const SizedBox(height: 14),
      ErrorLine(_error),
      const SizedBox(height: 6),
      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
        GhostPill('Cancel', onTap: () => Navigator.of(context).pop()),
        const SizedBox(width: 10),
        PaperPill('Submit', busy: _busy, onTap: _valid && !_busy ? _send : null),
      ]),
    ]);
  }

  Widget _done(SubmitResult r) {
    final ok = r.status != 'declined';
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(ok ? Icons.check_circle : Icons.cancel, size: 40, color: ok ? C.good : C.bad),
      const SizedBox(height: 16),
      Text(r.status == 'approved' ? 'Approved' : r.status == 'declined' ? 'Not approved' : 'Sent for review', style: display(32)),
      const SizedBox(height: 10),
      Text(r.status == 'approved' ? 'Your views are checked while the campaign runs, and you are paid for the verified ones.' : r.status == 'declined' ? (r.reason ?? 'The link did not lead to a video.') : 'A person will look at it soon. You will hear when it is decided.', style: body(15, color: C.mute, height: 1.45)),
      if (r.checks.isNotEmpty) ...[
        const SizedBox(height: 16),
        for (final k in r.checks)
          Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [
            Icon(k.state == 'pass' ? Icons.check : k.state == 'fail' ? Icons.close : Icons.help_outline, size: 16, color: k.state == 'pass' ? C.good : k.state == 'fail' ? C.bad : C.warn),
            const SizedBox(width: 10),
            Flexible(child: Text(k.label + ((k.note ?? '').isNotEmpty ? '  ${k.note}' : ''), style: body(14))),
          ])),
      ],
      const SizedBox(height: 18),
      Align(alignment: Alignment.centerRight, child: PaperPill('Done', onTap: () => Navigator.of(context).pop())),
    ]);
  }
}
