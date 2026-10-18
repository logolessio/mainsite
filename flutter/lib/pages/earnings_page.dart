import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/models.dart';
import '../core/state.dart';
import '../ui/glass.dart';
import '../ui/theme.dart';
import 'dash_shell.dart';

class EarningsPage extends StatefulWidget {
  const EarningsPage({super.key});
  @override
  State<EarningsPage> createState() => _EarningsPageState();
}

class _EarningsPageState extends State<EarningsPage> {
  final _email = TextEditingController(), _amount = TextEditingController();
  bool _busy = false;
  ({String text, bool good})? _message;

  @override
  void dispose() {
    _email.dispose();
    _amount.dispose();
    super.dispose();
  }

  double? get _dollars {
    final t = _amount.text.trim().replaceAll('\$', '').replaceAll(',', '.');
    return t.isEmpty ? null : double.tryParse(t);
  }

  Future<void> _withdraw(AppState app, int cents) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        title: Text('Withdraw ${Money.cents(cents)} to ${_email.text.trim()}?', style: display(22)),
        content: Text('It is sent to that PayPal address.', style: body(14, color: C.mute)),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Withdraw'))],
      ),
    );
    if (ok != true) return;
    setState(() { _busy = true; _message = null; });
    try {
      final held = await app.withdraw(_email.text.trim().toLowerCase(), _dollars);
      if (mounted) { _amount.clear(); setState(() => _message = (text: held ? 'Sent for a quick check. This usually takes under a day.' : 'On its way to ${_email.text.trim()}.', good: true)); }
    } on ApiError catch (e) {
      if (mounted) setState(() => _message = (text: e.message, good: false));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final compact = isCompact(context);
    final e = app.earnings;
    if (e != null && _email.text.isEmpty && e.paypalEmail.isNotEmpty) _email.text = e.paypalEmail;
    final cents = _dollars != null ? (_dollars! * 100).round() : (e?.balances.available ?? 0);
    final emailOk = _email.text.contains('@') && _email.text.contains('.');
    final can = e != null && e.open && emailOk && cents >= e.minPayoutCents && cents <= e.balances.available && !_busy;
    return DashFrame(
      page: DashPage.earnings,
      subtitle: "What your submissions have earned, your PayPal emails, and withdrawing. We cover PayPal's fees.",
      children: [
        ErrorLine(app.failures['earnings'], retry: () => app.load(DashPage.earnings)),
        if (e != null) ...[
          if (!e.open) Container(width: double.infinity, margin: const EdgeInsets.only(bottom: 20), padding: const EdgeInsets.all(14), decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: C.line)), child: Text('Withdrawals are not open yet. Your earnings are kept and will be here when they are.', style: body(13.5, color: C.mute))),
          SiteCard(
            padding: 26,
            radius: 26,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Withdraw to PayPal', style: display(26)),
              const SizedBox(height: 6),
              Text("We pay PayPal's fees. Whatever you withdraw is what arrives. From ${Money.cents(e.minPayoutCents)}.", style: body(13.5, color: C.mute)),
              const SizedBox(height: 18),
              if (compact) ...[_emailField(e), const SizedBox(height: 14), _amountField(e), const SizedBox(height: 14), _button(can, app, cents)]
              else Row(crossAxisAlignment: CrossAxisAlignment.end, children: [Expanded(child: _emailField(e)), const SizedBox(width: 14), SizedBox(width: 190, child: _amountField(e)), const SizedBox(width: 14), _button(can, app, cents)]),
              if (_message != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(_message!.text, style: body(13.5, color: _message!.good ? C.good : C.bad))),
            ]),
          ),
          const SizedBox(height: 24),
          Grid(columns: e.balances.pending > 0 ? 4 : 3, compactColumns: 2, children: [
            StatCard('Lifetime earned', Money.cents(e.balances.earned)),
            StatCard('Available', Money.cents(e.balances.available), note: 'Ready to withdraw'),
            if (e.balances.pending > 0) StatCard('Pending', Money.cents(e.balances.pending), note: 'Being confirmed'),
            StatCard('Withdrawn', Money.cents(e.balances.withdrawn), note: 'All time'),
          ]),
          if (e.payouts.isNotEmpty) _section('Withdrawals', [for (final p in e.payouts) _row(Money.cents(p.amountCents), shortDate(p.date), pill: p.status == 'review' ? 'Being checked' : p.status == 'sent' ? 'Sent' : p.status, tint: p.status == 'sent' ? C.good : p.status == 'failed' || p.status == 'reversed' ? C.bad : C.warn)]),
          _section('History', [
            if (e.ledger.isEmpty) const EmptyNote(Icons.monetization_on_outlined, 'No earnings yet', message: 'Your history appears here once your first submission is verified.'),
            for (final l in e.ledger) _row(_kind(l.kind) + (l.campaign != null ? ' · ${l.campaign}' : ''), shortDate(l.date), trailing: '${l.amountCents > 0 ? '+' : ''}${Money.cents(l.amountCents)}', good: l.amountCents > 0),
          ]),
        ] else if (app.failures['earnings'] == null)
          const Spinner(),
      ],
    );
  }

  Widget _emailField(Earnings e) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Eyebrow('Send it to'),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: SiteField(controller: _email, hint: 'you@example.com', onChanged: (_) => setState(() {}), keyboard: TextInputType.emailAddress)),
          if (e.paypalEmails.length > 1) PopupMenuButton<String>(color: const Color(0xFF151515), icon: const Icon(Icons.keyboard_arrow_down_rounded, color: C.paper), onSelected: (v) => setState(() => _email.text = v), itemBuilder: (_) => [for (final m in e.paypalEmails) PopupMenuItem(value: m, child: Text(m, style: body(14)))]),
        ]),
      ]);

  Widget _amountField(Earnings e) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Eyebrow('Amount'),
        const SizedBox(height: 8),
        SiteField(controller: _amount, hint: 'All (${Money.cents(e.balances.available)})', onChanged: (_) => setState(() {}), keyboard: const TextInputType.numberWithOptions(decimal: true)),
      ]);

  Widget _button(bool can, AppState app, int cents) => PaperPill('Withdraw', busy: _busy, onTap: can ? () => _withdraw(app, cents) : null);

  String _kind(String k) => switch (k) { 'earning' => 'Earned', 'withdrawal' => 'Withdrawn', 'withdrawal_reversal' => 'Returned', 'earning_reversal' => 'Reversed', _ => k.isEmpty ? k : k[0].toUpperCase() + k.substring(1) };

  Widget _section(String title, List<Widget> rows) => Padding(
        padding: const EdgeInsets.only(top: 36),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: display(30)), const SizedBox(height: 14), const Hairline(), ...rows]),
      );

  Widget _row(String left, String sub, {String? pill, Color tint = C.warn, String? trailing, bool good = false}) => Column(children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(left, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(15)), const SizedBox(height: 3), Text(sub, style: body(12, color: C.faint))])),
            if (pill != null) StatusPill(pill, tint),
            if (trailing != null) Text(trailing, style: body(15, color: good ? C.good : C.paper.withValues(alpha: 0.8))),
          ]),
        ),
        const Hairline(),
      ]);
}
