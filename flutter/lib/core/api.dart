import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

/// A failure with a sentence that is safe to show.
class ApiError implements Exception {
  ApiError(this.message, [this.status = 0]);
  final String message;
  final int status;
  bool get unauthorized => status == 401;
  @override
  String toString() => message;
}

/// Talks to the site's JSON routes. The token (when there is one) goes on every request.
class Api {
  String? token;
  final http.Client _client = http.Client();

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body: body ?? <String, dynamic>{});
  Future<dynamic> put(String path, Object body) => _send('PUT', path, body: body);
  Future<dynamic> delete(String path, [Object? body]) => _send('DELETE', path, body: body ?? <String, dynamic>{});

  Future<dynamic> _send(String method, String path, {Object? body}) async {
    final uri = Config.base.resolve(path);
    final req = http.Request(method, uri)
      ..headers['accept'] = 'application/json'
      ..headers['user-agent'] = 'logoless-app/1.0';
    if (token != null) req.headers['authorization'] = 'Bearer $token';
    if (body != null) {
      req.headers['content-type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(req).timeout(const Duration(seconds: 25)));
    } catch (_) {
      throw ApiError('Could not reach logoless. Check your connection and try again.');
    }
    dynamic data;
    try {
      data = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      data = null;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = data is Map ? data['error'] as String? : null;
      throw ApiError(msg ?? (res.statusCode == 401 ? 'Please sign in.' : 'Something went wrong. Please try again.'), res.statusCode);
    }
    return data;
  }
}
