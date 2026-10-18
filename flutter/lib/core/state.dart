import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api.dart';
import 'auth.dart';
import 'config.dart';
import 'models.dart';

/// The pages of the dashboard (the website's /dashboard), each with the menu it belongs to.
enum DashPage {
  overview('Overview'),
  submissions('Submissions'),
  earnings('Earnings'),
  profile('Profile'),
  achievements('Achievements'),
  saved('Saved'),
  settings('Settings'),
  notifications('Notifications'),
  queue('Queue');

  const DashPage(this.title);
  final String title;

  /// The item in the rail that stands for this page (Achievements and Saved live under Profile, Notifications under Settings).
  DashPage get rail => switch (this) { achievements || saved => profile, notifications => settings, _ => this };

  /// The glass tabs at the top of the page, if it shares a menu with its neighbours.
  List<DashPage> get tabs => switch (rail) { DashPage.profile => [profile, achievements, saved], DashPage.settings => [settings, notifications], _ => const [] };

  String get webPath => this == overview ? '/dashboard' : this == queue ? '/admin/submissions' : '/dashboard/$name';
}

/// Where the person is: the site (home, a campaign) or the dashboard.
class AppRoute {
  const AppRoute.home() : campaignId = null, page = null;
  const AppRoute.campaign(String id) : campaignId = id, page = null;
  const AppRoute.dash(DashPage p) : campaignId = null, page = p;
  final String? campaignId;
  final DashPage? page;
  bool get isDash => page != null;
  bool get isHome => campaignId == null && page == null;
  @override
  bool operator ==(Object other) => other is AppRoute && other.campaignId == campaignId && other.page == page;
  @override
  int get hashCode => Object.hash(campaignId, page);
  String get key => campaignId != null ? 'campaign-$campaignId' : page != null ? 'dash-${page!.rail.name}' : 'home';
}

enum Phase { starting, signedOut, signedIn }

class AppState extends ChangeNotifier {
  static const _onboardedKey = 'onboarded.v1';
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'logoless.token';

  final Api api = Api();

  // where the person is
  AppRoute route = const AppRoute.home();
  final List<AppRoute> _history = [];
  bool showJump = false, showMenu = false, showBell = false, showOnboarding = false;
  int onboardingStart = 0;

  // who they are
  Phase phase = Phase.starting;
  Me? me;
  bool signingIn = false;
  String? banner;

  // what the site has told us
  List<Campaign> campaigns = [];
  Set<String> favorites = {};
  Home? home;
  List<Submission> submissions = [];
  Earnings? earnings;
  List<AppNotification> notifications = [];
  int unread = 0;
  Staff? staff;
  Achievements? achievements;

  // what is loading, and what went wrong
  final Map<String, String> failures = {};
  bool loadedCampaigns = false;

  Timer? _poller;
  bool _started = false;

  bool get isSignedIn => phase == Phase.signedIn;
  bool get isAdmin => me?.isAdmin == true;
  bool get canGoBack => _history.isNotEmpty;
  Campaign? campaign(String id) {
    for (final c in campaigns) {
      if (c.id == id) return c;
    }
    return null;
  }

  void _changed() => notifyListeners();

  // ---- start up

  Future<void> start() async {
    if (_started) return;
    _started = true;
    final prefs = await SharedPreferences.getInstance();
    showOnboarding = !(prefs.getBool(_onboardedKey) ?? false);
    const forced = String.fromEnvironment('LOGOLESS_ONBOARDING');
    if (forced.isNotEmpty) showOnboarding = true;
    String? token;
    try {
      token = await _storage.read(key: _tokenKey);
    } catch (_) {
      token = null;
    }
    const devToken = String.fromEnvironment('LOGOLESS_TOKEN');
    if (devToken.isNotEmpty) token = devToken;
    api.token = token;
    _changed();
    final list = loadCampaigns();
    if (token != null) {
      await refreshMe();
    } else {
      phase = Phase.signedOut;
      _changed();
    }
    await list;
    if (isSignedIn) {
      _startPolling();
      await loadCurrent();
    }
  }

  Future<void> refreshMe() async {
    try {
      final m = Me.fromJson(await api.get('/api/me/nav') as Map<String, dynamic>);
      if (m.signedIn) {
        me = m;
        unread = m.unread;
        phase = Phase.signedIn;
      } else {
        await _dropSession();
      }
    } on ApiError catch (e) {
      if (e.unauthorized) {
        await _dropSession();
      } else {
        if (phase == Phase.starting) phase = api.token == null ? Phase.signedOut : Phase.signedIn;
        banner = e.message;
      }
    }
    _changed();
  }

  Future<void> _dropSession() async {
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {}
    api.token = null;
    me = null; home = null; submissions = []; earnings = null; notifications = []; staff = null; unread = 0; favorites = {};
    phase = Phase.signedOut;
    _poller?.cancel();
    if (route.isDash) {
      route = const AppRoute.home();
      _history.clear();
    }
  }

  // ---- first launch

  Future<void> finishOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardedKey, true);
    showOnboarding = false;
    route = const AppRoute.home();
    _changed();
  }

  void replayOnboarding() {
    showOnboarding = true;
    _changed();
  }

  Future<bool?> handleAvailable(String h) async {
    try {
      final r = await api.get('/api/me/handle?h=${Uri.encodeQueryComponent(h)}') as Map;
      return r['available'] == true;
    } catch (_) {
      return null;
    }
  }

  Future<void> completeProfile({required String name, required String handle, required String bio, required Map<String, String> linked}) async {
    await api.post('/api/me/onboarding', {'role': 'clipper', 'name': name, 'handle': handle, 'bio': bio, 'linked': linked});
    await refreshMe();
  }

  Future<void> addPaypal(String email) async {
    await api.post('/api/me/paypal', {'email': email});
  }

  // ---- signing in and out

  Future<void> signIn() async {
    if (signingIn) return;
    signingIn = true;
    _changed();
    try {
      final token = await WebAuth.signIn(api, device: Platform.isAndroid ? 'Android' : Platform.isWindows ? 'Windows' : 'App');
      if (token != null) {
        try {
          await _storage.write(key: _tokenKey, value: token);
        } catch (_) {}
        api.token = token;
        banner = null;
        await refreshMe();
        if (isSignedIn) {
          _startPolling();
          await loadCampaigns();
          await loadCurrent();
        }
      }
    } on ApiError catch (e) {
      banner = e.message;
    } catch (_) {
      banner = 'Signing in did not finish. Please try again.';
    } finally {
      signingIn = false;
      _changed();
    }
  }

  Future<void> signOut() async {
    try {
      await api.post('/api/app/signout');
    } catch (_) {}
    await _dropSession();
    _changed();
  }

  // ---- loading

  Future<T?> _run<T>(String key, Future<T> Function() work) async {
    try {
      final v = await work();
      failures.remove(key);
      _changed();
      return v;
    } on ApiError catch (e) {
      if (e.unauthorized && api.token != null) {
        await _dropSession();
      } else {
        failures[key] = e.message;
      }
      _changed();
      return null;
    } catch (_) {
      failures[key] = 'Something went wrong. Please try again.';
      _changed();
      return null;
    }
  }

  Future<void> loadCampaigns() async {
    final d = await _run('campaigns', () => api.get('/api/app/v1/campaigns'));
    if (d is Map) {
      campaigns = ((d['campaigns'] as List?) ?? []).map((e) => Campaign.fromJson((e as Map).cast<String, dynamic>())).toList();
      favorites = ((d['favorites'] as List?) ?? []).map((e) => '$e').toSet();
      loadedCampaigns = true;
      _changed();
    }
  }

  Future<void> load(DashPage p) async {
    switch (p) {
      case DashPage.overview:
        final d = await _run('home', () => api.get('/api/app/v1/home'));
        if (d is Map) { home = Home.fromJson(d.cast<String, dynamic>()); unread = home!.unread; }
      case DashPage.submissions:
        final d = await _run('submissions', () => api.get('/api/app/v1/submissions'));
        if (d is Map) submissions = ((d['submissions'] as List?) ?? []).map((e) => Submission.fromJson((e as Map).cast<String, dynamic>())).toList();
      case DashPage.earnings:
        final d = await _run('earnings', () => api.get('/api/app/v1/earnings'));
        if (d is Map) earnings = Earnings.fromJson(d.cast<String, dynamic>());
      case DashPage.notifications:
        await loadNotifications();
      case DashPage.profile || DashPage.settings:
        await refreshMe();
      case DashPage.saved:
        await loadCampaigns();
      case DashPage.achievements:
        final d = await _run('achievements', () => api.get('/api/app/v1/achievements'));
        if (d is Map) achievements = Achievements.fromJson(d.cast<String, dynamic>());
      case DashPage.queue:
        await loadStaff();
    }
    _changed();
  }

  Future<void> loadCurrent() async {
    if (route.page != null) {
      await load(route.page!);
    } else {
      await loadCampaigns();
    }
  }

  Future<void> loadNotifications() async {
    final d = await _run('notifications', () => api.get('/api/me/notifications'));
    if (d is Map) {
      notifications = ((d['items'] as List?) ?? []).map((e) => AppNotification.fromJson((e as Map).cast<String, dynamic>())).toList();
      unread = (d['unread'] as num?)?.toInt() ?? 0;
      _changed();
    }
  }

  Future<void> loadStaff() async {
    final d = await _run('staff', () => api.get('/api/app/v1/staff'));
    if (d is Map) { staff = Staff.fromJson(d.cast<String, dynamic>()); _changed(); }
  }

  // ---- things people do

  bool isSaved(Campaign c) => favorites.contains(c.id);

  Future<void> toggleSaved(Campaign c) async {
    if (!isSignedIn) { await signIn(); return; }
    final on = !favorites.contains(c.id);
    on ? favorites.add(c.id) : favorites.remove(c.id);
    _changed();
    final r = await _run('favorite', () => api.post('/api/me/favorites', {'campaignId': c.id, 'on': on}));
    if (r == null && failures.containsKey('favorite')) {
      on ? favorites.remove(c.id) : favorites.add(c.id);
      _changed();
    }
  }

  Future<SubmitResult> submit(Campaign c, String platform, String url) async {
    final r = SubmitResult.fromJson(((await api.post('/api/campaigns/${c.id}/submit', {'platform': platform, 'url': url})) as Map).cast<String, dynamic>());
    unawaited(load(DashPage.overview));
    unawaited(load(DashPage.submissions));
    return r;
  }

  /// Returns true when the withdrawal was held for a quick check.
  Future<bool> withdraw(String email, double? dollars) async {
    final r = await api.post('/api/payouts/withdraw', {'email': email, if (dollars != null) 'amount': dollars}) as Map;
    await load(DashPage.earnings);
    unawaited(load(DashPage.overview));
    return r['review'] == true;
  }

  Future<void> markRead(AppNotification n) async {
    if (n.isRead) return;
    n.readAt = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    unread = (unread - 1).clamp(0, 1 << 30);
    _changed();
    await _run('notif', () => api.post('/api/me/notifications', {'id': n.id}));
  }

  Future<void> markAllRead() async {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    for (final n in notifications) { n.readAt ??= now; }
    unread = 0;
    _changed();
    await _run('notif', () => api.post('/api/me/notifications', {}));
  }

  Future<void> clearNotifications() async {
    notifications = [];
    unread = 0;
    _changed();
    await _run('notif', () => api.delete('/api/me/notifications'));
  }

  Future<bool> saveProfile(String displayName, String bio) async {
    final r = await _run('profile', () => api.put('/api/me/profile', {'displayName': displayName, 'bio': bio}));
    if (r != null) await refreshMe();
    return r != null;
  }

  // ---- the owner's queue

  Future<bool> decideSubmission(StaffSubmission s, {required bool approve, String reason = ''}) async {
    final r = await _run('decide', () => api.post('/api/admin/submissions/${s.id}', approve ? {'action': 'approve'} : {'action': 'reject', 'reason': reason}));
    if (r != null) { staff?.pending.removeWhere((x) => x.id == s.id); await loadStaff(); }
    return r != null;
  }

  Future<bool> decidePayout(StaffPayout p, {required bool approve, String note = ''}) async {
    final r = await _run('decide', () => api.post('/api/admin/payouts/${p.id}', approve ? {'action': 'approve'} : {'action': 'reject', 'note': note}));
    if (r != null) { staff?.review.removeWhere((x) => x.id == p.id); await loadStaff(); }
    return r != null;
  }

  // ---- movement

  /// Moves to a page. The dashboard needs an account: signed-out people are asked to sign in first.
  void go(AppRoute r) {
    if (r == route) return;
    if (r.isDash && !isSignedIn && phase != Phase.starting) {
      signIn().then((_) { if (isSignedIn) go(r); });
      return;
    }
    _history.add(route);
    if (_history.length > 40) _history.removeAt(0);
    showMenu = false; showBell = false; showJump = false;
    route = r;
    _changed();
    unawaited(loadCurrent());
  }

  void back() {
    if (_history.isEmpty) return;
    showMenu = false; showBell = false;
    route = _history.removeLast();
    _changed();
  }

  void open(Campaign c) => go(AppRoute.campaign(c.id));
  void openCampaignId(String id) => go(AppRoute.campaign(id));

  void setOverlay({bool? menu, bool? bell, bool? jump}) {
    if (menu != null) showMenu = menu;
    if (bell != null) showBell = bell;
    if (jump != null) showJump = jump;
    _changed();
  }

  Future<void> openUrl(Uri u) async { await launchUrl(u, mode: LaunchMode.externalApplication); }
  Future<void> openPath(String path) => openUrl(Config.page(path));

  void _startPolling() {
    _poller?.cancel();
    _poller = Timer.periodic(const Duration(seconds: 60), (_) async {
      await refreshMe();
      if (isAdmin) await loadStaff();
    });
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }
}
