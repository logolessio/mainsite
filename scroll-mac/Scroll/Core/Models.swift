import Foundation

/// A movie as the lists remember it: just enough to draw a poster and find it again.
struct Mini: Codable, Identifiable, Hashable {
    let id: Int
    let t: String
    let p: String?
    let y: String
    let r: Double
}

/// A person named on a movie.
struct Credited: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
}

/// A movie ready to play: the details, and the YouTube trailer.
struct Clip: Codable, Identifiable, Hashable {
    struct Trailer: Codable, Hashable { let key: String; let name: String }
    let id: Int
    let title: String
    let tagline: String
    let overview: String
    let year: String
    let runtime: Int
    let rating: Double
    let votes: Int
    let genres: [String]
    let poster: String?
    let backdrop: String?
    let trailer: Trailer
    let cast: [Credited]
    let director: Credited?
    let cert: String?

    var mini: Mini { Mini(id: id, t: title, p: poster, y: year, r: (rating * 10).rounded() / 10) }
    var facts: String {
        var parts: [String] = []
        if !year.isEmpty { parts.append(year) }
        if runtime > 0 { parts.append("\(runtime / 60)h \(String(format: "%02d", runtime % 60))m") }
        if let cert, !cert.isEmpty { parts.append(cert) }
        return parts.joined(separator: "  ·  ")
    }
}

struct Settings: Codable, Hashable {
    var region: String
    var sound: Bool
    var autoNext: Bool
    var ambient: Bool?
    var glass: Double?
    var perf: String?
}

struct Profile: Codable, Hashable {
    var username: String
    var name: String
    var createdAt: Int?
    var favorites: [Mini]
    var taste: [Int]
    var liked: [Mini]
    var saved: [Mini]
    var settings: Settings
}

struct Me: Decodable {
    let signedIn: Bool
    let name: String?
    let profile: Profile?
    let region: String?
}

struct Provider: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let logo: String
}

struct WhereToWatch: Codable {
    let region: String
    let link: String?
    let stream: [Provider]
    let free: [Provider]
    let rent: [Provider]
    let buy: [Provider]
    var isEmpty: Bool { stream.isEmpty && free.isEmpty && rent.isEmpty && buy.isEmpty }
}

/// One film or show a person is in or made.
struct Credit: Codable, Identifiable, Hashable {
    let tmdb: Int
    let kind: String
    let t: String
    let p: String?
    let y: String
    let role: String
    let r: Double
    let eps: Int?
    var id: String { "\(kind)\(tmdb)" }
    var isMovie: Bool { kind == "movie" }
    enum CodingKeys: String, CodingKey { case tmdb = "id", kind, t, p, y, role, r, eps }
}

struct PersonPage: Codable, Identifiable {
    let id: Int
    let name: String
    let photo: String?
    let dept: String
    let birthday: String?
    let deathday: String?
    let place: String?
    let bio: String
    let imdb: String?
    let known: [Credit]
    let movies: [Credit]
    let tv: [Credit]
}

/// The regions the where-to-watch information is shown for.
let regions: [(code: String, name: String)] = [
    ("US", "United States"), ("GB", "United Kingdom"), ("CA", "Canada"), ("AU", "Australia"), ("IE", "Ireland"), ("DE", "Germany"), ("FR", "France"), ("ES", "Spain"),
    ("IT", "Italy"), ("NL", "Netherlands"), ("SE", "Sweden"), ("NO", "Norway"), ("DK", "Denmark"), ("FI", "Finland"), ("PL", "Poland"), ("PT", "Portugal"), ("BR", "Brazil"),
    ("MX", "Mexico"), ("AR", "Argentina"), ("JP", "Japan"), ("KR", "South Korea"), ("IN", "India"), ("SG", "Singapore"), ("NZ", "New Zealand"), ("ZA", "South Africa"), ("AE", "United Arab Emirates"),
]
