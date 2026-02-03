import Foundation
import Combine

final class DashboardViewModel: ObservableObject {
    @Published var userState: UserState = .default
    @Published var session: UnlockSession = .inactive
    @Published var entries: [ProductivityEntry] = []
    @Published var errorMessage: String?
    @Published var remainingSeconds: TimeInterval = 0

    private let storage: StorageServiceProtocol
    private let sessionService: SessionServiceProtocol
    private let blockingService: BlockingServiceProtocol
    private var timer: AnyCancellable?

    init(
        storage: StorageServiceProtocol = StorageService(),
        sessionService: SessionServiceProtocol? = nil,
        blockingService: BlockingServiceProtocol = BlockingService()
    ) {
        self.storage = storage
        self.blockingService = blockingService
        self.sessionService = sessionService ?? SessionService(storage: storage, blockingService: blockingService)
        load()
        startTimer()
    }

    func load() {
        userState = storage.loadUserState()
        session = storage.loadSession()
        entries = storage.loadEntries()
        updateRemaining()
    }

    func applyLockNow() {
        let config = storage.loadConfig()
        blockingService.applyRestrictions(using: config.selection)
        session = sessionService.endSession()
        updateRemaining()
    }

    func unlockUsingBalance() {
        do {
            let newSession = try sessionService.startUnlockSession(usingMinutes: userState.minutesBalance)
            session = newSession
            userState = storage.loadUserState()
            updateRemaining()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateRemaining() {
        remainingSeconds = sessionService.remainingSeconds(for: session, now: Date())
        if remainingSeconds == 0, session.isActive {
            session = sessionService.endSession()
        }
    }

    private func startTimer() {
        timer = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateRemaining()
            }
    }
}
