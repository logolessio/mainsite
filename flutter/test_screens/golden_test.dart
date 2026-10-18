import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:logoless/core/models.dart';
import 'package:logoless/core/state.dart';
import 'package:logoless/main.dart';

Future<void> loadFont(String family, String path) async {
  final loader = FontLoader(family)..addFont(Future.value(ByteData.sublistView(File(path).readAsBytesSync())));
  await loader.load();
}

AppState sample({AppRoute? route, bool onboarding = false, int step = 0}) {
  final s = AppState();
  s.phase = Phase.signedIn;
  s.loadedCampaigns = true;
  s.showOnboarding = onboarding;
  s.me = Me(signedIn: true, isAdmin: true, unread: 2, clips: 2, views: 26000, earnedCents: 6500, profile: Profile(handle: 'luna_ray', displayName: 'Luna Ray', bio: 'Edits at night.', avatar: '/api/look/mono?kind=avatar&l=L'));
  s.unread = 2;
  s.campaigns = [
    for (var i = 0; i < 8; i++)
      Campaign(id: 'c$i', title: ['Red Room', 'Mercury', 'Late Shift', 'Glass Hours', 'Neon', 'Tunnel', 'Ridge', 'Studio'][i], creator: ['KXNG VALE', 'Hollow Form', 'Dex Marlow', 'Aria', 'Tester', 'Nox', 'Kai', 'Vela'][i], type: i % 2 == 0 ? 'Music · Single' : 'Streamer · Highlights', cover: '/covers/0${i + 1}.jpg', ratePer1k: 2.5 + i * 0.5, budget: 30000, endsOn: 'Nov 12', summary: 'New single out Friday. Cut up the performance video, the studio session, or use the track under your own edits.', platforms: ['tiktok', 'youtube', 'instagram'], clipThis: ['The chorus drop at 0:42', 'Studio session footage'], offLimits: ['Re-uploads of the full video'], budgetLeftPct: 100 - i * 7),
  ];
  s.favorites = {'c1'};
  s.home = Home(name: 'Luna Ray', balances: Balances(available: 4250, earned: 6500, withdrawn: 2250), monthCents: 2400, views: 26000, submissions: 2, inReview: 1, unread: 2, recent: [
    Submission(id: 's1', campaignId: 'c0', platform: 'tiktok', url: 'https://tiktok.com/x', status: 'approved', views: 20000, earnedCents: 5000, createdAt: 1792000000, campaign: 'Red Room', cover: ''),
    Submission(id: 's2', campaignId: 'c1', platform: 'youtube', url: 'https://youtube.com/x', status: 'pending', views: 6000, earnedCents: 1500, createdAt: 1792100000, campaign: 'Mercury', cover: ''),
  ]);
  s.submissions = s.home!.recent;
  s.earnings = Earnings(balances: s.home!.balances, ledger: [LedgerRow(id: 'l1', kind: 'earning', amountCents: 5000, createdAt: 1792000000, campaign: 'Red Room')], payouts: [Payout(id: 'p1', amountCents: 2250, status: 'sent', createdAt: 1791000000)], paypalEmail: 'luna@example.com', paypalEmails: ['luna@example.com'], minPayoutCents: 1000, open: true);
  s.notifications = [AppNotification(id: 'n1', kind: 'badge', title: 'Badge unlocked: Settled in', body: 'Be a member for 7 days', createdAt: 1792200000), AppNotification(id: 'n2', kind: 'submission', title: 'Submission approved (Red Room)', body: 'Its views are checked while the campaign runs.', readAt: 1792300000, createdAt: 1792100000)];
  s.achievements = Achievements(points: 11, badges: [Trophy(id: 'a', name: 'First cut', how: 'Submit your first piece of content', points: 5, rarity: 'common', unlockedAt: 1), Trophy(id: 'b', name: 'Million club', how: 'Reach 1,000,000 verified views', points: 12, rarity: 'epic')]);
  s.staff = Staff(people: 61, liveCampaigns: 17, pendingSubmissions: 1, payoutsInReview: 1, joinedToday: 2, pending: [StaffSubmission(id: 'q1', platform: 'tiktok', url: 'https://tiktok.com/x', views: 0, createdAt: 1792200000, campaign: 'Red Room', cover: '', email: 'a@b.c', handle: 'kai', risk: 'low')], review: [StaffPayout(id: 'r1', amountCents: 5000, createdAt: 1792200000, email: 'a@b.c', risk: 'elevated', reason: 'First withdrawal', paypalEmail: 'a@b.c')]);
  if (route != null) s.route = route;
  return s;
}

void main() {
  setUpAll(() async {
    await loadFont('Gloock', 'assets/fonts/Gloock-Regular.ttf');
    await loadFont('Inter', 'assets/fonts/Inter.ttf');
  });

  Future<void> shoot(WidgetTester t, String name, Size size, AppState state, {void Function(AppState)? after}) async {
    t.view.physicalSize = size;
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(LogolessApp(state: state));
    after?.call(state);
    await t.pump(const Duration(milliseconds: 700));
    await t.pump(const Duration(milliseconds: 700));
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));
  }

  const desk = Size(1280, 820), phone = Size(390, 844);
  testWidgets('home desktop', (t) => shoot(t, 'home_desktop', desk, sample()));
  testWidgets('home phone', (t) => shoot(t, 'home_phone', phone, sample()));
  testWidgets('campaign desktop', (t) => shoot(t, 'campaign_desktop', desk, sample(route: const AppRoute.campaign('c0'))));
  testWidgets('campaign phone', (t) => shoot(t, 'campaign_phone', phone, sample(route: const AppRoute.campaign('c0'))));
  testWidgets('overview desktop', (t) => shoot(t, 'overview_desktop', desk, sample(route: const AppRoute.dash(DashPage.overview))));
  testWidgets('overview phone', (t) => shoot(t, 'overview_phone', phone, sample(route: const AppRoute.dash(DashPage.overview))));
  testWidgets('submissions desktop', (t) => shoot(t, 'submissions_desktop', desk, sample(route: const AppRoute.dash(DashPage.submissions))));
  testWidgets('earnings phone', (t) => shoot(t, 'earnings_phone', phone, sample(route: const AppRoute.dash(DashPage.earnings))));
  testWidgets('profile desktop', (t) => shoot(t, 'profile_desktop', desk, sample(route: const AppRoute.dash(DashPage.profile))));
  testWidgets('queue desktop', (t) => shoot(t, 'queue_desktop', desk, sample(route: const AppRoute.dash(DashPage.queue))));
  testWidgets('menu desktop', (t) => shoot(t, 'menu_desktop', desk, sample(), after: (s) => s.showMenu = true));
  testWidgets('onboarding welcome phone', (t) => shoot(t, 'onboarding_welcome_phone', phone, sample(onboarding: true)));
}
