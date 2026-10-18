import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api.dart';
import 'config.dart';

/// Signing in without the app ever seeing a password. The website's own sign-in opens in the system browser (Google, Discord and email all work
/// there); it hands back a one-use code, which the app swaps for a token together with a secret it kept to itself (PKCE).
class WebAuth {
  static String _random(int bytes) {
    final r = Random.secure();
    return base64Url.encode(List<int>.generate(bytes, (_) => r.nextInt(256))).replaceAll('=', '');
  }

  /// Runs the whole sign-in and returns the token, or null if the person closed the window.
  static Future<String?> signIn(Api api, {String device = 'device'}) async {
    final verifier = _random(48);
    final state = _random(12);
    final challenge = base64Url.encode(sha256.convert(utf8.encode(verifier)).bytes).replaceAll('=', '');
    final desktop = Platform.isWindows || Platform.isLinux || Platform.isMacOS;

    Uri? back;
    if (desktop) {
      back = await _loopback(state, challenge);
    } else {
      final url = Config.page('/app/connect').replace(queryParameters: {'state': state, 'challenge': challenge});
      try {
        final result = await FlutterWebAuth2.authenticate(url: url.toString(), callbackUrlScheme: Config.callbackScheme);
        back = Uri.parse(result);
      } catch (_) {
        return null; // closed the sheet
      }
    }
    if (back == null) return null;
    final code = back.queryParameters['code'];
    if (code == null || back.queryParameters['state'] != state) throw ApiError('That sign-in did not match the one the app started. Please try again.');
    final r = await api.post('/api/app/token', {'code': code, 'verifier': verifier, 'device': device}) as Map;
    return r['token'] as String;
  }

  /// Desktop: a tiny server on this computer's loopback address waits for the website to send the browser back (RFC 8252).
  static Future<Uri?> _loopback(String state, String challenge) async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final completer = Completer<Uri?>();
    server.listen((req) async {
      if (req.uri.path != '/callback') {
        req.response.statusCode = 404;
        await req.response.close();
        return;
      }
      req.response.headers.contentType = ContentType.html;
      req.response.write('<!doctype html><meta charset="utf-8"><title>logoless</title><body style="margin:0;background:#000;color:#f3f2ee;font:16px system-ui;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h1 style="font-weight:400">You are signed in</h1><p style="opacity:.6">You can close this window and go back to the app.</p></div>');
      await req.response.close();
      if (!completer.isCompleted) completer.complete(Uri.parse('http://127.0.0.1:${server.port}${req.uri}'));
    });
    final redirect = 'http://127.0.0.1:${server.port}/callback';
    final url = Config.page('/app/connect').replace(queryParameters: {'state': state, 'challenge': challenge, 'redirect': redirect});
    await launchUrl(url, mode: LaunchMode.externalApplication);
    try {
      return await completer.future.timeout(const Duration(minutes: 5), onTimeout: () => null);
    } finally {
      await server.close(force: true);
    }
  }
}
