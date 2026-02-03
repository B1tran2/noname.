import XCTest
import FamilyControls
@testable import Noname

final class SessionServiceTests: XCTestCase {
    func testCooldownPreventsBackToBackValidation() throws {
        let storage = InMemoryStorageService()
        let blocking = MockBlockingService()
        var now = Date()
        let service = SessionService(storage: storage, blockingService: blocking, nowProvider: { now })

        _ = try service.validateEntry(category: .study, note: "", minutesPerPhoto: 15)
        now = now.addingTimeInterval(30)

        XCTAssertThrowsError(try service.validateEntry(category: .work, note: "", minutesPerPhoto: 15))
    }

    func testUnlockConsumesMinutes() throws {
        let storage = InMemoryStorageService()
        let blocking = MockBlockingService()
        let service = SessionService(storage: storage, blockingService: blocking)

        _ = try service.validateEntry(category: .study, note: "", minutesPerPhoto: 15)
        let session = try service.startUnlockSession(usingMinutes: 15)

        XCTAssertTrue(session.isActive)
        XCTAssertEqual(storage.loadUserState().minutesBalance, 0)
    }
}

private final class InMemoryStorageService: StorageServiceProtocol {
    private var userState: UserState = .default
    private var entries: [ProductivityEntry] = []
    private var config: AppBlockingConfig = .empty
    private var session: UnlockSession = .inactive
    private var settings: AppSettings = .default

    func loadUserState() -> UserState { userState }
    func saveUserState(_ state: UserState) { userState = state }
    func loadEntries() -> [ProductivityEntry] { entries }
    func saveEntries(_ entries: [ProductivityEntry]) { self.entries = entries }
    func loadConfig() -> AppBlockingConfig { config }
    func saveConfig(_ config: AppBlockingConfig) { self.config = config }
    func loadSession() -> UnlockSession { session }
    func saveSession(_ session: UnlockSession) { self.session = session }
    func loadSettings() -> AppSettings { settings }
    func saveSettings(_ settings: AppSettings) { self.settings = settings }
    func resetAll() {
        userState = .default
        entries = []
        config = .empty
        session = .inactive
        settings = .default
    }
}

private final class MockBlockingService: BlockingServiceProtocol {
    func requestAuthorization() async throws {}
    func applyRestrictions(using selection: FamilyActivitySelection) {}
    func removeRestrictions() {}
    func startTemporaryUnlock(durationMinutes: Int) throws {}
}
