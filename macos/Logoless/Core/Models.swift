import Foundation

// What the site sends. Property names follow the JSON (snake_case keys are turned into camelCase by the decoder).

struct Campaign: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let creator: String
    let type: String
    let cover: String
    var previewUrl: String = ""
    var platforms: [String] = []
    let ratePer1k: Double
    var budget: Double = 0
    var endsOn: String = ""
    var summary: String = ""
    var clipThis: [String] = []
    var offLimits: [String] = []
    var budgetLeftPct: Int?
    var capPerPost: Double?
    var capPerUser: Double?
    var pinned: Bool?

    /// "Music · Single" -> "Music"
    var kind: String { type.components(separatedBy: " · ").first ?? type }
    var coverURL: URL? { Config.resolve(cover) }
    var previewURL: URL? { Config.resolve(previewUrl) }
    var pageURL: URL { Config.base.appendingPathComponent("campaign/\(id)") }
    var rateText: String { "$" + Money.plain(ratePer1k) }

    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        creator = try c.decodeIfPresent(String.self, forKey: .creator) ?? ""
        type = try c.decodeIfPresent(String.self, forKey: .type) ?? ""
        cover = try c.decodeIfPresent(String.self, forKey: .cover) ?? ""
        previewUrl = try c.decodeIfPresent(String.self, forKey: .previewUrl) ?? ""
        platforms = try c.decodeIfPresent([String].self, forKey: .platforms) ?? []
        ratePer1k = try c.decodeIfPresent(Double.self, forKey: .ratePer1k) ?? 0
        budget = try c.decodeIfPresent(Double.self, forKey: .budget) ?? 0
        endsOn = try c.decodeIfPresent(String.self, forKey: .endsOn) ?? ""
        summary = try c.decodeIfPresent(String.self, forKey: .summary) ?? ""
        clipThis = try c.decodeIfPresent([String].self, forKey: .clipThis) ?? []
        offLimits = try c.decodeIfPresent([String].self, forKey: .offLimits) ?? []
        budgetLeftPct = try c.decodeIfPresent(Int.self, forKey: .budgetLeftPct)
        capPerPost = try c.decodeIfPresent(Double.self, forKey: .capPerPost)
        capPerUser = try c.decodeIfPresent(Double.self, forKey: .capPerUser)
        pinned = try c.decodeIfPresent(Bool.self, forKey: .pinned)
    }

    init(id: String, title: String, creator: String, type: String, cover: String, ratePer1k: Double, budget: Double = 0, endsOn: String = "", summary: String = "", platforms: [String] = [], clipThis: [String] = [], offLimits: [String] = [], budgetLeftPct: Int? = nil) {
        self.id = id; self.title = title; self.creator = creator; self.type = type; self.cover = cover; self.ratePer1k = ratePer1k
        self.budget = budget; self.endsOn = endsOn; self.summary = summary; self.platforms = platforms; self.clipThis = clipThis; self.offLimits = offLimits; self.budgetLeftPct = budgetLeftPct
    }

    private enum CodingKeys: String, CodingKey { case id, title, creator, type, cover, previewUrl, platforms, ratePer1k, budget, endsOn, summary, clipThis, offLimits, budgetLeftPct, capPerPost, capPerUser, pinned }
}

struct CampaignList: Decodable { let campaigns: [Campaign]; let favorites: [String] }

struct Balances: Codable, Hashable {
    var brand = 0, available = 0, pending = 0, earned = 0, withdrawn = 0
}

struct Submission: Codable, Identifiable, Hashable {
    let id: String
    let campaignId: String
    let platform: String
    let url: String
    let status: String
    let views: Int
    let earnedCents: Int
    let createdAt: Int
    let campaign: String
    var cover: String = ""

    var coverURL: URL? { Config.resolve(cover) }
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
    var state: SubmissionState { SubmissionState(rawValue: status) ?? .pending }

    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        campaignId = try c.decode(String.self, forKey: .campaignId)
        platform = try c.decode(String.self, forKey: .platform)
        url = try c.decode(String.self, forKey: .url)
        status = try c.decode(String.self, forKey: .status)
        views = try c.decodeIfPresent(Int.self, forKey: .views) ?? 0
        earnedCents = try c.decodeIfPresent(Int.self, forKey: .earnedCents) ?? 0
        createdAt = try c.decode(Int.self, forKey: .createdAt)
        campaign = try c.decode(String.self, forKey: .campaign)
        cover = try c.decodeIfPresent(String.self, forKey: .cover) ?? ""
    }

    init(id: String, campaignId: String, platform: String, url: String, status: String, views: Int, earnedCents: Int, createdAt: Int, campaign: String, cover: String = "") {
        self.id = id; self.campaignId = campaignId; self.platform = platform; self.url = url; self.status = status; self.views = views; self.earnedCents = earnedCents; self.createdAt = createdAt; self.campaign = campaign; self.cover = cover
    }
}

enum SubmissionState: String, CaseIterable {
    case pending, approved, rejected
    var label: String { self == .pending ? "In review" : rawValue.capitalized }
}

struct SubmissionList: Decodable { let submissions: [Submission] }

struct Home: Decodable {
    let name: String
    let balances: Balances
    let monthCents: Int
    let views: Int
    let submissions: Int
    let inReview: Int
    let unread: Int
    let recent: [Submission]
}

struct LedgerRow: Decodable, Identifiable, Hashable {
    let id: String
    let kind: String
    let amountCents: Int
    let note: String?
    let createdAt: Int
    let campaign: String?
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
}

struct Payout: Decodable, Identifiable, Hashable {
    let id: String
    let amountCents: Int
    let status: String
    let createdAt: Int
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
}

struct Earnings: Decodable {
    let balances: Balances
    let ledger: [LedgerRow]
    let payouts: [Payout]
    let paypalEmail: String
    let paypalEmails: [String]
    let minPayoutCents: Int
    let open: Bool
}

struct AppNotification: Decodable, Identifiable, Hashable {
    let id: String
    let kind: String
    let title: String
    let body: String
    let href: String?
    var readAt: Int?
    let createdAt: Int
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
    var isRead: Bool { readAt != nil }
    var url: URL? { Config.resolve(href) }
}

struct NotificationList: Decodable { let items: [AppNotification]; let unread: Int }

struct Me: Decodable {
    struct Stats: Decodable { let clips: Int; let views: Int; let earnedCents: Int; let campaigns: Int; let brandCents: Int }
    struct Profile: Decodable {
        let handle: String
        let displayName: String
        let bio: String
        let avatar: String?
        let accent: String?
        let badges: [String]
    }
    let signedIn: Bool
    var isAdmin = false
    var isDev = false
    var stats: Stats?
    var restricted = false
    var unread = 0
    var profile: Profile?

    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        signedIn = try c.decode(Bool.self, forKey: .signedIn)
        isAdmin = try c.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        isDev = try c.decodeIfPresent(Bool.self, forKey: .isDev) ?? false
        stats = try c.decodeIfPresent(Stats.self, forKey: .stats)
        restricted = try c.decodeIfPresent(Bool.self, forKey: .restricted) ?? false
        unread = try c.decodeIfPresent(Int.self, forKey: .unread) ?? 0
        profile = try c.decodeIfPresent(Profile.self, forKey: .profile)
    }
    var avatarURL: URL? { Config.resolve(profile?.avatar) }
    private enum CodingKeys: String, CodingKey { case signedIn, isAdmin, isDev, stats, restricted, unread, profile }
}

struct SubmitCheck: Decodable, Hashable, Identifiable {
    let id: String
    let label: String
    let state: String
    let note: String?
}

struct SubmitResult: Decodable {
    let id: String
    let status: String // approved, declined, review
    let checks: [SubmitCheck]
    let reason: String?
}

struct WithdrawResult: Decodable {
    let amount: Int
    var review: Bool?
}

struct StaffSubmission: Decodable, Identifiable, Hashable {
    let id: String
    let platform: String
    let url: String
    let views: Int
    let createdAt: Int
    let campaign: String
    let cover: String
    let rateCents: Int
    let email: String
    let handle: String?
    let risk: String
    var who: String { handle.map { "@\($0)" } ?? email }
    var coverURL: URL? { Config.resolve(cover) }
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
}

struct StaffPayout: Decodable, Identifiable, Hashable {
    let id: String
    let amountCents: Int
    let reason: String?
    let createdAt: Int
    let email: String
    let risk: String
    let paypalEmail: String?
    var date: Date { Date(timeIntervalSince1970: TimeInterval(createdAt)) }
}

struct Staff: Decodable {
    let people: Int
    let liveCampaigns: Int
    let pendingSubmissions: Int
    let payoutsInReview: Int
    let joinedToday: Int
    var pending: [StaffSubmission]
    var review: [StaffPayout]
}

enum Money {
    /// 1234 -> "$12.34"
    static func cents(_ c: Int) -> String {
        let neg = c < 0
        let v = Double(abs(c)) / 100
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.locale = Locale(identifier: "en_US")
        return (neg ? "-" : "") + (f.string(from: NSNumber(value: v)) ?? "$0.00")
    }
    /// 3.0 -> "3", 2.5 -> "2.50"
    static func plain(_ d: Double) -> String { d.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(d)) : String(format: "%.2f", d) }
    /// 50000 -> "$50K"
    static func compact(_ d: Double) -> String {
        if d >= 1_000_000 { return "$" + trim(d / 1_000_000) + "M" }
        if d >= 1_000 { return "$" + trim(d / 1_000) + "K" }
        return "$" + plain(d)
    }
    private static func trim(_ d: Double) -> String { let s = String(format: "%.1f", d); return s.hasSuffix(".0") ? String(s.dropLast(2)) : s }
}

extension Int {
    /// 26000 -> "26K"
    var compact: String {
        let d = Double(self)
        if d >= 1_000_000 { return Self.trim(d / 1_000_000) + "M" }
        if d >= 1_000 { return Self.trim(d / 1_000) + "K" }
        return String(self)
    }
    private static func trim(_ d: Double) -> String { let s = String(format: "%.1f", d); return s.hasSuffix(".0") ? String(s.dropLast(2)) : s }
}

struct Badge: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let how: String
    let points: Int
    let rarity: String
    let unlockedAt: Int?
    var unlocked: Bool { unlockedAt != nil }
}

struct Achievements: Decodable {
    let badges: [Badge]
    let points: Int
}
