import Foundation
import Security

/// Keeps the sign-in token on this Mac: in the data-protection Keychain when the app is signed for it, and otherwise in a private file inside
/// the app's own sandbox folder (readable only by this app and this user).
enum TokenStore {
    private static let service = "io.logoless.scroll"
    private static var account: String { Config.base.host ?? "logoless.io" }

    private static var file: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("scroll", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("session-\(account)")
    }

    private static var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account, kSecUseDataProtectionKeychain as String: true]
    }

    static func load() -> String? {
        var q = base
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        if SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data, let s = String(data: d, encoding: .utf8) { return s }
        if let d = try? Data(contentsOf: file), let s = String(data: d, encoding: .utf8) { return s.trimmingCharacters(in: .whitespacesAndNewlines) }
        return nil
    }

    static func save(_ token: String) {
        SecItemDelete(base as CFDictionary)
        var add = base
        add[kSecValueData as String] = Data(token.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        if SecItemAdd(add as CFDictionary, nil) == errSecSuccess {
            try? FileManager.default.removeItem(at: file)
            return
        }
        try? Data(token.utf8).write(to: file, options: [.atomic])
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
    }

    static func clear() {
        SecItemDelete(base as CFDictionary)
        try? FileManager.default.removeItem(at: file)
    }
}
