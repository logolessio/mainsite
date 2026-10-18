import 'package:flutter/painting.dart' show Color;
import 'config.dart';

int _i(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
String _s(dynamic v) => v == null ? '' : '$v';
List<String> _l(dynamic v) => v is List ? v.map((e) => '$e').toList() : <String>[];

class Campaign {
  Campaign({
    required this.id,
    required this.title,
    required this.creator,
    required this.type,
    required this.cover,
    this.previewUrl = '',
    this.platforms = const [],
    this.ratePer1k = 0,
    this.budget = 0,
    this.endsOn = '',
    this.summary = '',
    this.clipThis = const [],
    this.offLimits = const [],
    this.budgetLeftPct,
    this.capPerPost,
    this.capPerUser,
    this.pinned = false,
  });

  final String id, title, creator, type, cover, previewUrl, endsOn, summary;
  final List<String> platforms, clipThis, offLimits;
  final double ratePer1k, budget;
  final int? budgetLeftPct;
  final double? capPerPost, capPerUser;
  final bool pinned;

  factory Campaign.fromJson(Map<String, dynamic> j) => Campaign(
        id: _s(j['id']),
        title: _s(j['title']),
        creator: _s(j['creator']),
        type: _s(j['type']),
        cover: _s(j['cover']),
        previewUrl: _s(j['previewUrl']),
        platforms: _l(j['platforms']),
        ratePer1k: _d(j['ratePer1k']),
        budget: _d(j['budget']),
        endsOn: _s(j['endsOn']),
        summary: _s(j['summary']),
        clipThis: _l(j['clipThis']),
        offLimits: _l(j['offLimits']),
        budgetLeftPct: j['budgetLeftPct'] == null ? null : _i(j['budgetLeftPct']),
        capPerPost: j['capPerPost'] == null ? null : _d(j['capPerPost']),
        capPerUser: j['capPerUser'] == null ? null : _d(j['capPerUser']),
        pinned: j['pinned'] == true,
      );

  /// "Music · Single" -> "Music"
  String get kind => type.split(' · ').first;
  Uri? get coverUrl => Config.resolve(cover);
  Uri? get previewUri => previewUrl.isEmpty ? null : Config.resolve(previewUrl);
  Uri get pageUrl => Config.page('/campaign/$id');
}

class Balances {
  Balances({this.brand = 0, this.available = 0, this.pending = 0, this.earned = 0, this.withdrawn = 0});
  final int brand, available, pending, earned, withdrawn;
  factory Balances.fromJson(Map<String, dynamic> j) => Balances(
        brand: _i(j['brand']),
        available: _i(j['available']),
        pending: _i(j['pending']),
        earned: _i(j['earned']),
        withdrawn: _i(j['withdrawn']),
      );
}

class Submission {
  Submission({required this.id, required this.campaignId, required this.platform, required this.url, required this.status, required this.views, required this.earnedCents, required this.createdAt, required this.campaign, required this.cover});
  final String id, campaignId, platform, url, status, campaign, cover;
  final int views, earnedCents, createdAt;
  factory Submission.fromJson(Map<String, dynamic> j) => Submission(
        id: _s(j['id']),
        campaignId: _s(j['campaignId']),
        platform: _s(j['platform']),
        url: _s(j['url']),
        status: _s(j['status']),
        views: _i(j['views']),
        earnedCents: _i(j['earnedCents']),
        createdAt: _i(j['createdAt']),
        campaign: _s(j['campaign']),
        cover: _s(j['cover']),
      );
  Uri? get coverUrl => Config.resolve(cover);
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
  String get stateLabel => status == 'pending' ? 'In review' : status.isEmpty ? '' : status[0].toUpperCase() + status.substring(1);
}

class Home {
  Home({required this.name, required this.balances, required this.monthCents, required this.views, required this.submissions, required this.inReview, required this.unread, required this.recent});
  final String name;
  final Balances balances;
  final int monthCents, views, submissions, inReview, unread;
  final List<Submission> recent;
  factory Home.fromJson(Map<String, dynamic> j) => Home(
        name: _s(j['name']),
        balances: Balances.fromJson((j['balances'] as Map?)?.cast<String, dynamic>() ?? {}),
        monthCents: _i(j['monthCents']),
        views: _i(j['views']),
        submissions: _i(j['submissions']),
        inReview: _i(j['inReview']),
        unread: _i(j['unread']),
        recent: ((j['recent'] as List?) ?? []).map((e) => Submission.fromJson((e as Map).cast<String, dynamic>())).toList(),
      );
}

class LedgerRow {
  LedgerRow({required this.id, required this.kind, required this.amountCents, required this.createdAt, this.note, this.campaign});
  final String id, kind;
  final int amountCents, createdAt;
  final String? note, campaign;
  factory LedgerRow.fromJson(Map<String, dynamic> j) => LedgerRow(id: _s(j['id']), kind: _s(j['kind']), amountCents: _i(j['amountCents']), createdAt: _i(j['createdAt']), note: j['note'] as String?, campaign: j['campaign'] as String?);
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
}

class Payout {
  Payout({required this.id, required this.amountCents, required this.status, required this.createdAt});
  final String id, status;
  final int amountCents, createdAt;
  factory Payout.fromJson(Map<String, dynamic> j) => Payout(id: _s(j['id']), amountCents: _i(j['amountCents']), status: _s(j['status']), createdAt: _i(j['createdAt']));
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
}

class Earnings {
  Earnings({required this.balances, required this.ledger, required this.payouts, required this.paypalEmail, required this.paypalEmails, required this.minPayoutCents, required this.open});
  final Balances balances;
  final List<LedgerRow> ledger;
  final List<Payout> payouts;
  final String paypalEmail;
  final List<String> paypalEmails;
  final int minPayoutCents;
  final bool open;
  factory Earnings.fromJson(Map<String, dynamic> j) => Earnings(
        balances: Balances.fromJson((j['balances'] as Map?)?.cast<String, dynamic>() ?? {}),
        ledger: ((j['ledger'] as List?) ?? []).map((e) => LedgerRow.fromJson((e as Map).cast<String, dynamic>())).toList(),
        payouts: ((j['payouts'] as List?) ?? []).map((e) => Payout.fromJson((e as Map).cast<String, dynamic>())).toList(),
        paypalEmail: _s(j['paypalEmail']),
        paypalEmails: _l(j['paypalEmails']),
        minPayoutCents: _i(j['minPayoutCents']),
        open: j['open'] == true,
      );
}

class AppNotification {
  AppNotification({required this.id, required this.kind, required this.title, required this.body, this.href, this.readAt, required this.createdAt});
  final String id, kind, title, body;
  final String? href;
  int? readAt;
  final int createdAt;
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(id: _s(j['id']), kind: _s(j['kind']), title: _s(j['title']), body: _s(j['body']), href: j['href'] as String?, readAt: j['read_at'] == null ? null : _i(j['read_at']), createdAt: _i(j['created_at']));
  bool get isRead => readAt != null;
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
  Uri? get url => Config.resolve(href);
}

class Profile {
  Profile({required this.handle, required this.displayName, required this.bio, this.avatar});
  final String handle, displayName, bio;
  final String? avatar;
  factory Profile.fromJson(Map<String, dynamic> j) => Profile(handle: _s(j['handle']), displayName: _s(j['displayName']), bio: _s(j['bio']), avatar: j['avatar'] as String?);
}

class Me {
  Me({required this.signedIn, this.isAdmin = false, this.unread = 0, this.profile, this.clips = 0, this.views = 0, this.earnedCents = 0});
  final bool signedIn, isAdmin;
  final int unread, clips, views, earnedCents;
  final Profile? profile;
  factory Me.fromJson(Map<String, dynamic> j) {
    final s = (j['stats'] as Map?)?.cast<String, dynamic>() ?? {};
    return Me(
      signedIn: j['signedIn'] == true,
      isAdmin: j['isAdmin'] == true,
      unread: _i(j['unread']),
      profile: j['profile'] == null ? null : Profile.fromJson((j['profile'] as Map).cast<String, dynamic>()),
      clips: _i(s['clips']),
      views: _i(s['views']),
      earnedCents: _i(s['earnedCents']),
    );
  }
  Uri? get avatarUrl => Config.resolve(profile?.avatar);
}

class SubmitCheck {
  SubmitCheck({required this.id, required this.label, required this.state, this.note});
  final String id, label, state;
  final String? note;
  factory SubmitCheck.fromJson(Map<String, dynamic> j) => SubmitCheck(id: _s(j['id']), label: _s(j['label']), state: _s(j['state']), note: j['note'] as String?);
}

class SubmitResult {
  SubmitResult({required this.id, required this.status, required this.checks, this.reason});
  final String id, status;
  final List<SubmitCheck> checks;
  final String? reason;
  factory SubmitResult.fromJson(Map<String, dynamic> j) => SubmitResult(id: _s(j['id']), status: _s(j['status']), reason: j['reason'] as String?, checks: ((j['checks'] as List?) ?? []).map((e) => SubmitCheck.fromJson((e as Map).cast<String, dynamic>())).toList());
}

class StaffSubmission {
  StaffSubmission({required this.id, required this.platform, required this.url, required this.views, required this.createdAt, required this.campaign, required this.cover, required this.email, this.handle, required this.risk});
  final String id, platform, url, campaign, cover, email, risk;
  final String? handle;
  final int views, createdAt;
  factory StaffSubmission.fromJson(Map<String, dynamic> j) => StaffSubmission(id: _s(j['id']), platform: _s(j['platform']), url: _s(j['url']), views: _i(j['views']), createdAt: _i(j['createdAt']), campaign: _s(j['campaign']), cover: _s(j['cover']), email: _s(j['email']), handle: j['handle'] as String?, risk: _s(j['risk']));
  String get who => handle != null ? '@$handle' : email;
  Uri? get coverUrl => Config.resolve(cover);
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
}

class StaffPayout {
  StaffPayout({required this.id, required this.amountCents, this.reason, required this.createdAt, required this.email, required this.risk, this.paypalEmail});
  final String id, email, risk;
  final String? reason, paypalEmail;
  final int amountCents, createdAt;
  factory StaffPayout.fromJson(Map<String, dynamic> j) => StaffPayout(id: _s(j['id']), amountCents: _i(j['amountCents']), reason: j['reason'] as String?, createdAt: _i(j['createdAt']), email: _s(j['email']), risk: _s(j['risk']), paypalEmail: j['paypalEmail'] as String?);
  DateTime get date => DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
}

class Staff {
  Staff({required this.people, required this.liveCampaigns, required this.pendingSubmissions, required this.payoutsInReview, required this.joinedToday, required this.pending, required this.review});
  final int people, liveCampaigns, pendingSubmissions, payoutsInReview, joinedToday;
  final List<StaffSubmission> pending;
  final List<StaffPayout> review;
  factory Staff.fromJson(Map<String, dynamic> j) => Staff(
        people: _i(j['people']),
        liveCampaigns: _i(j['liveCampaigns']),
        pendingSubmissions: _i(j['pendingSubmissions']),
        payoutsInReview: _i(j['payoutsInReview']),
        joinedToday: _i(j['joinedToday']),
        pending: ((j['pending'] as List?) ?? []).map((e) => StaffSubmission.fromJson((e as Map).cast<String, dynamic>())).toList(),
        review: ((j['review'] as List?) ?? []).map((e) => StaffPayout.fromJson((e as Map).cast<String, dynamic>())).toList(),
      );
}

class Trophy {
  Trophy({required this.id, required this.name, required this.how, required this.points, required this.rarity, this.unlockedAt});
  final String id, name, how, rarity;
  final int points;
  final int? unlockedAt;
  bool get unlocked => unlockedAt != null;
  factory Trophy.fromJson(Map<String, dynamic> j) => Trophy(id: _s(j['id']), name: _s(j['name']), how: _s(j['how']), points: _i(j['points']), rarity: _s(j['rarity']), unlockedAt: j['unlockedAt'] == null ? null : _i(j['unlockedAt']));
}

class Achievements {
  Achievements({required this.badges, required this.points});
  final List<Trophy> badges;
  final int points;
  factory Achievements.fromJson(Map<String, dynamic> j) => Achievements(badges: ((j['badges'] as List?) ?? []).map((e) => Trophy.fromJson((e as Map).cast<String, dynamic>())).toList(), points: _i(j['points']));
}

class Money {
  /// 1234 -> "$12.34"
  static String cents(int c) {
    final neg = c < 0;
    final v = c.abs() / 100;
    final whole = v.truncate().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    final frac = (v - v.truncate()).toStringAsFixed(2).substring(1);
    return '${neg ? '-' : ''}\$$whole$frac';
  }

  /// 3.0 -> "3", 2.5 -> "2.50"
  static String plain(double d) => d == d.truncateToDouble() ? d.toInt().toString() : d.toStringAsFixed(2);

  /// 50000 -> "$50K"
  static String compact(double d) {
    if (d >= 1000000) return '\$${_trim(d / 1000000)}M';
    if (d >= 1000) return '\$${_trim(d / 1000)}K';
    return '\$${plain(d)}';
  }

  static String _trim(double d) {
    final s = d.toStringAsFixed(1);
    return s.endsWith('.0') ? s.substring(0, s.length - 2) : s;
  }

  /// 26000 -> "26K"
  static String views(int n) {
    if (n >= 1000000) return '${_trim(n / 1000000)}M';
    if (n >= 1000) return '${_trim(n / 1000)}K';
    return '$n';
  }

  static String grouped(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
}

/// The ready-made "looks" (lib/looks.ts on the site): a gradient picture and a matching banner.
class Look {
  const Look(this.id, this.name, this.light, this.mid, this.dark);
  final String id, name;
  final Color light, mid, dark;
}

class Looks {
  static const all = [
    Look('ember', 'Ember', Color(0xFFFF7A45), Color(0xFF8F2410), Color(0xFF140605)),
    Look('ocean', 'Ocean', Color(0xFF3CC0E0), Color(0xFF0D4F73), Color(0xFF02080F)),
    Look('dusk', 'Dusk', Color(0xFFC77BEA), Color(0xFF40237A), Color(0xFF0B0B1E)),
    Look('forest', 'Forest', Color(0xFF7FD18A), Color(0xFF175A30), Color(0xFF030A05)),
    Look('rose', 'Rose', Color(0xFFFF82B0), Color(0xFF701845), Color(0xFF120309)),
    Look('sand', 'Sand', Color(0xFFEFD39A), Color(0xFF8F5F2E), Color(0xFF1A1008)),
    Look('violet', 'Violet', Color(0xFF8D9BFF), Color(0xFF2F349A), Color(0xFF06061A)),
    Look('mono', 'Mono', Color(0xFFE4E4E8), Color(0xFF505058), Color(0xFF050505)),
  ];

  static Look? byId(String id) {
    for (final l in all) {
      if (l.id == id) return l;
    }
    return null;
  }

  /// The same look for the same seed, every time (the site's hash).
  static Look forSeed(String seed) {
    var h = 0;
    for (final u in seed.codeUnits) {
      h = (h * 31 + u) & 0xFFFFFFFF;
    }
    return all[h % all.length];
  }

  static String key(String id) => 'g:$id';
}
