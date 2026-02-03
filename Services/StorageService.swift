import Foundation
import FamilyControls

protocol StorageServiceProtocol {
    func loadUserState() -> UserState
    func saveUserState(_ state: UserState)
    func loadEntries() -> [ProductivityEntry]
    func saveEntries(_ entries: [ProductivityEntry])
    func loadConfig() -> AppBlockingConfig
    func saveConfig(_ config: AppBlockingConfig)
    func loadSession() -> UnlockSession
    func saveSession(_ session: UnlockSession)
    func loadSettings() -> AppSettings
    func saveSettings(_ settings: AppSettings)
    func resetAll()
}

final class StorageService: StorageServiceProtocol {
    private enum Keys {
        static let userState = "userState"
        static let entries = "entries"
        static let config = "config"
        static let session = "session"
        static let settings = "settings"
    }

    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func loadUserState() -> UserState {
        load(UserState.self, key: Keys.userState) ?? .default
    }

    func saveUserState(_ state: UserState) {
        save(state, key: Keys.userState)
    }

    func loadEntries() -> [ProductivityEntry] {
        load([ProductivityEntry].self, key: Keys.entries) ?? []
    }

    func saveEntries(_ entries: [ProductivityEntry]) {
        save(entries, key: Keys.entries)
    }

    func loadConfig() -> AppBlockingConfig {
        load(AppBlockingConfig.self, key: Keys.config) ?? .empty
    }

    func saveConfig(_ config: AppBlockingConfig) {
        save(config, key: Keys.config)
    }

    func loadSession() -> UnlockSession {
        load(UnlockSession.self, key: Keys.session) ?? .inactive
    }

    func saveSession(_ session: UnlockSession) {
        save(session, key: Keys.session)
    }

    func loadSettings() -> AppSettings {
        load(AppSettings.self, key: Keys.settings) ?? .default
    }

    func saveSettings(_ settings: AppSettings) {
        save(settings, key: Keys.settings)
    }

    func resetAll() {
        [Keys.userState, Keys.entries, Keys.config, Keys.session, Keys.settings].forEach { key in
            defaults.removeObject(forKey: key)
        }
    }

    private func save<T: Codable>(_ value: T, key: String) {
        guard let data = try? encoder.encode(value) else { return }
        defaults.set(data, forKey: key)
    }

    private func load<T: Codable>(_ type: T.Type, key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? decoder.decode(type, from: data)
    }
}
