import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'theme.dart';

/// A pane of frosted glass: the page behind it is blurred, lightly washed, and the edge catches the light.
class Glass extends StatelessWidget {
  const Glass({super.key, required this.child, this.radius = 999, this.tint, this.blur = 28, this.padding, this.shape});
  final Widget child;
  final double radius;
  final Color? tint;
  final double blur;
  final EdgeInsetsGeometry? padding;
  final BorderRadius? shape;

  @override
  Widget build(BuildContext context) {
    final r = shape ?? BorderRadius.circular(radius);
    return ClipRRect(
      borderRadius: r,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: r,
            color: tint ?? Colors.white.withValues(alpha: 0.075),
            gradient: tint == null ? LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white.withValues(alpha: 0.13), Colors.white.withValues(alpha: 0.04)]) : null,
            border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          ),
          child: Padding(padding: padding ?? EdgeInsets.zero, child: child),
        ),
      ),
    );
  }
}

class Press extends StatefulWidget {
  const Press({super.key, required this.child, required this.onTap, this.enabled = true});
  final Widget child;
  final VoidCallback? onTap;
  final bool enabled;
  @override
  State<Press> createState() => _PressState();
}

class _PressState extends State<Press> {
  bool _down = false, _hover = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
        cursor: widget.enabled && widget.onTap != null ? SystemMouseCursors.click : MouseCursor.defer,
        onEnter: (_) => setState(() => _hover = true),
        onExit: (_) => setState(() => _hover = false),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => setState(() => _down = true),
          onTapCancel: () => setState(() => _down = false),
          onTapUp: (_) => setState(() => _down = false),
          onTap: widget.enabled ? widget.onTap : null,
          child: AnimatedScale(scale: _down ? 0.97 : 1, duration: const Duration(milliseconds: 120), child: AnimatedOpacity(opacity: widget.enabled ? (_hover ? 0.9 : 1) : 0.5, duration: const Duration(milliseconds: 120), child: widget.child)),
        ),
      );
}

/// The site's paper-white pill (Dashboard, Find a campaign, Submit content).
class PaperPill extends StatelessWidget {
  const PaperPill(this.title, {super.key, this.icon, this.busy = false, this.height = 44, this.full = false, this.onTap});
  final String title;
  final IconData? icon;
  final bool busy, full;
  final double height;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Press(
        onTap: busy ? null : onTap,
        enabled: onTap != null,
        child: Container(
          height: height,
          width: full ? double.infinity : null,
          padding: EdgeInsets.symmetric(horizontal: height > 40 ? 24 : 18),
          decoration: BoxDecoration(color: C.paper.withValues(alpha: 0.95), borderRadius: BorderRadius.circular(999), boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: 0.10), blurRadius: 14, spreadRadius: -4)]),
          child: Row(mainAxisSize: full ? MainAxisSize.max : MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
            if (busy) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black)) else if (icon != null) Icon(icon, size: 16, color: Colors.black),
            if (busy || icon != null) const SizedBox(width: 8),
            Flexible(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(height > 40 ? 15 : 13, color: Colors.black, weight: 500))),
          ]),
        ),
      );
}

/// The site's outlined pill (See all the steps, Report): clear glass, light text.
class GhostPill extends StatelessWidget {
  const GhostPill(this.title, {super.key, this.icon, this.height = 44, this.onTap});
  final String title;
  final IconData? icon;
  final double height;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Press(
        onTap: onTap,
        enabled: onTap != null,
        child: Glass(
          child: Container(
            height: height,
            padding: EdgeInsets.symmetric(horizontal: height > 40 ? 22 : 16),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (icon != null) ...[Icon(icon, size: 15, color: C.paper), const SizedBox(width: 8)],
              Text(title, style: body(height > 40 ? 15 : 13, weight: 500)),
            ]),
          ),
        ),
      );
}

/// A round glass button with one symbol (the bell, the menu).
class GlassCircle extends StatelessWidget {
  const GlassCircle(this.icon, {super.key, this.size = 42, this.dot = false, this.tooltip, this.paper = false, this.onTap});
  final IconData icon;
  final double size;
  final bool dot, paper;
  final String? tooltip;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    final w = Press(
      onTap: onTap,
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(alignment: Alignment.center, children: [
          paper ? Container(width: size, height: size, decoration: BoxDecoration(color: C.paper.withValues(alpha: 0.95), shape: BoxShape.circle)) : Glass(radius: size, child: SizedBox(width: size, height: size)),
          Icon(icon, size: size * 0.42, color: paper ? Colors.black : C.paper),
          if (dot) Positioned(top: 8, right: 8, child: Container(width: 8, height: 8, decoration: BoxDecoration(color: C.paper, shape: BoxShape.circle, border: Border.all(color: Colors.black, width: 2)))),
        ]),
      ),
    );
    return tooltip == null ? w : Tooltip(message: tooltip!, child: w);
  }
}

/// A row of choices on one pane of glass. The paper highlight moves from one choice to the next.
class GlassTabs<T> extends StatelessWidget {
  const GlassTabs({super.key, required this.items, required this.value, required this.onChanged, this.compact = false});
  final List<(T, String)> items;
  final T value;
  final ValueChanged<T> onChanged;
  final bool compact;
  @override
  Widget build(BuildContext context) => Glass(
        padding: EdgeInsets.all(compact ? 4 : 5),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          for (final (id, label) in items)
            Press(
              onTap: () => onChanged(id),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 260),
                curve: Curves.easeOutCubic,
                height: compact ? 28 : 38,
                padding: EdgeInsets.symmetric(horizontal: compact ? 12 : 20),
                alignment: Alignment.center,
                decoration: BoxDecoration(color: id == value ? C.paper : Colors.transparent, borderRadius: BorderRadius.circular(999)),
                child: Text(label, style: body(compact ? 12.5 : 14.5, color: id == value ? Colors.black : C.paper.withValues(alpha: 0.65), weight: id == value ? 500 : 400)),
              ),
            ),
        ]),
      );
}

/// A bordered dark card, as the website draws its panels.
class SiteCard extends StatelessWidget {
  const SiteCard({super.key, required this.child, this.padding = 22, this.radius = R.card});
  final Widget child;
  final double padding, radius;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: EdgeInsets.all(padding),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.03), borderRadius: BorderRadius.circular(radius), border: Border.all(color: C.line)),
        child: child,
      );
}

class StatCard extends StatelessWidget {
  const StatCard(this.label, this.value, {super.key, this.note});
  final String label, value;
  final String? note;
  @override
  Widget build(BuildContext context) => SiteCard(
        padding: 20,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: body(13, color: C.mute)),
          const SizedBox(height: 12),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: display(30))),
          if (note != null) ...[const SizedBox(height: 12), Text(note!, style: body(12, color: C.faint))],
        ]),
      );
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.text, this.tint, {super.key});
  final String text;
  final Color tint;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: tint.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(999)), child: Text(text, style: body(12, color: tint, weight: 500)));
}

Color statusTint(String s) => s == 'approved' ? C.good : s == 'rejected' ? C.bad : C.warn;

/// A text field drawn like the site's inputs: dark, bordered, rounded.
class SiteField extends StatelessWidget {
  const SiteField({super.key, required this.controller, required this.hint, this.onChanged, this.maxLines = 1, this.keyboard, this.onSubmitted});
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onChanged, onSubmitted;
  final int maxLines;
  final TextInputType? keyboard;
  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        maxLines: maxLines,
        keyboardType: keyboard,
        style: body(14),
        cursorColor: C.paper,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: body(14, color: C.faint),
          filled: true,
          fillColor: Colors.black.withValues(alpha: 0.5),
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: maxLines > 1 ? 14 : 15),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(R.chip), borderSide: BorderSide(color: C.line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(R.chip), borderSide: BorderSide(color: C.line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(R.chip), borderSide: BorderSide(color: C.paper.withValues(alpha: 0.5))),
        ),
      );
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: body(13, color: C.mute));
}

class ErrorLine extends StatelessWidget {
  const ErrorLine(this.text, {super.key, this.retry});
  final String? text;
  final VoidCallback? retry;
  @override
  Widget build(BuildContext context) {
    if (text == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: C.warn.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(R.chip)),
      child: Row(children: [
        const Icon(Icons.warning_amber_rounded, color: C.warn, size: 18),
        const SizedBox(width: 12),
        Expanded(child: Text(text!, style: body(14, color: C.paper.withValues(alpha: 0.85)))),
        if (retry != null) GhostPill('Try again', height: 32, onTap: retry),
      ]),
    );
  }
}

class EmptyNote extends StatelessWidget {
  const EmptyNote(this.icon, this.title, {super.key, this.message});
  final IconData icon;
  final String title;
  final String? message;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 56),
        child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 28, color: C.faint),
          const SizedBox(height: 10),
          Text(title, style: display(24)),
          if (message != null) ...[const SizedBox(height: 10), ConstrainedBox(constraints: const BoxConstraints(maxWidth: 360), child: Text(message!, textAlign: TextAlign.center, style: body(14, color: C.mute)))],
        ])),
      );
}

class Spinner extends StatelessWidget {
  const Spinner({super.key});
  @override
  Widget build(BuildContext context) => const Padding(padding: EdgeInsets.symmetric(vertical: 80), child: Center(child: SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2, color: C.paper))));
}

/// A brand logo (TikTok, YouTube, Instagram), white.
class PlatformMark extends StatelessWidget {
  const PlatformMark(this.platform, {super.key, this.size = 14, this.color = C.paper});
  final String platform;
  final double size;
  final Color color;
  @override
  Widget build(BuildContext context) {
    final p = platform.toLowerCase();
    if (p == 'tiktok' || p == 'youtube' || p == 'instagram') {
      return SvgPicture.asset('assets/images/$p.svg', width: size, height: size, colorFilter: ColorFilter.mode(color, BlendMode.srcIn));
    }
    return Icon(Icons.link, size: size, color: color);
  }
}

String platformName(String p) => switch (p.toLowerCase()) { 'tiktok' => 'TikTok', 'youtube' => 'YouTube', 'instagram' => 'Instagram', _ => p.isEmpty ? p : p[0].toUpperCase() + p.substring(1) };

/// A hairline.
class Hairline extends StatelessWidget {
  const Hairline({super.key, this.strong = false});
  final bool strong;
  @override
  Widget build(BuildContext context) => Container(height: 1, color: strong ? Colors.white.withValues(alpha: 0.25) : C.line);
}
