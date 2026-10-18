import 'package:flutter_test/flutter_test.dart';
import 'package:logoless/core/models.dart';

void main() {
  test('money is written the way the site writes it', () {
    expect(Money.cents(1234), '\$12.34');
    expect(Money.cents(0), '\$0.00');
    expect(Money.cents(-500), '-\$5.00');
    expect(Money.cents(123456789), '\$1,234,567.89');
    expect(Money.compact(50000), '\$50K');
    expect(Money.plain(3), '3');
    expect(Money.plain(2.5), '2.50');
    expect(Money.views(26000), '26K');
  });

  test('a campaign is read from the site\'s JSON', () {
    final c = Campaign.fromJson({'id': 'a', 'title': 'Red Room', 'creator': 'KXNG VALE', 'type': 'Music · Single', 'cover': '/covers/01.jpg', 'ratePer1k': 3, 'platforms': ['tiktok'], 'budgetLeftPct': 62});
    expect(c.kind, 'Music');
    expect(c.budgetLeftPct, 62);
    expect(c.coverUrl.toString(), 'https://logoless.io/covers/01.jpg');
    expect(c.previewUri, isNull);
  });

  test('notifications keep the site\'s snake_case keys', () {
    final n = AppNotification.fromJson({'id': '1', 'kind': 'badge', 'title': 't', 'body': 'b', 'href': null, 'read_at': null, 'created_at': 100});
    expect(n.isRead, isFalse);
    expect(n.createdAt, 100);
  });
}
