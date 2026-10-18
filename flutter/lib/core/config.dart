/// Where the app talks to. `--dart-define=LOGOLESS_BASE=http://localhost:3111` points a development build at another address.
class Config {
  static const String _base = String.fromEnvironment('LOGOLESS_BASE', defaultValue: 'https://logoless.io');
  static Uri get base => Uri.parse(_base);

  /// The address the system hands back to the app on Android when the website has signed someone in.
  static const String callbackScheme = 'logoless';

  /// A picture or page address from the site, written as a path ("/covers/01.jpg") or in full.
  static Uri? resolve(String? s) {
    if (s == null || s.isEmpty) return null;
    if (s.startsWith('http://') || s.startsWith('https://')) return Uri.tryParse(s);
    return base.resolve(s);
  }

  static Uri page(String path) => base.resolve(path);
}
