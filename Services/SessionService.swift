import Foundation

protocol SessionServiceProtocol {
    func validateEntry(category: ProductivityCategory, note: String, minutesPerPhoto: Int) throws -> ProductivityEntry
    func startUnlockSession(usingMinutes minutes: Int) throws -> UnlockSession
    func endSession() -> UnlockSession
    func remainingSeconds(for session: UnlockSession, now: Date) -> TimeInterval
}

enum SessionServiceError: LocalizedError {
    case cooldownActive
    case insufficientMinutes

    var errorDescription: String? {
        switch self {
        case .cooldownActive:
            return "Espera un poco antes de validar otra foto."
        case .insufficientMinutes:
            return "No tienes minutos disponibles."
        }
    }
}

final class SessionService: SessionServiceProtocol {
    private let storage: StorageServiceProtocol
    private let blockingService: BlockingServiceProtocol
    private let nowProvider: () -> Date
    private let cooldownSeconds: TimeInterval = 120

    init(
        storage: StorageServiceProtocol,
        blockingService: BlockingServiceProtocol,
        nowProvider: @escaping () -> Date = Date.init
    ) {
        self.storage = storage
        self.blockingService = blockingService
        self.nowProvider = nowProvider
    }

    func validateEntry(category: ProductivityCategory, note: String, minutesPerPhoto: Int) throws -> ProductivityEntry {
        var state = storage.loadUserState()
        let now = nowProvider()
        if let last = state.lastValidationDate, now.timeIntervalSince(last) < cooldownSeconds {
            throw SessionServiceError.cooldownActive
        }
        let entry = ProductivityEntry(
            date: now,
            category: category,
            note: note,
            pointsOrMinutesGranted: minutesPerPhoto
        )
        state.minutesBalance += minutesPerPhoto
        state.lastValidationDate = now
        state.streak = (Calendar.current.isDateInToday(last ?? now)) ? state.streak + 1 : 1
        storage.saveUserState(state)

        var entries = storage.loadEntries()
        entries.insert(entry, at: 0)
        storage.saveEntries(Array(entries.prefix(10)))
        return entry
    }

    func startUnlockSession(usingMinutes minutes: Int) throws -> UnlockSession {
        var state = storage.loadUserState()
        guard minutes > 0, state.minutesBalance >= minutes else {
            throw SessionServiceError.insufficientMinutes
        }
        state.minutesBalance -= minutes
        storage.saveUserState(state)

        let session = UnlockSession(startDate: nowProvider(), duration: TimeInterval(minutes * 60), isActive: true)
        storage.saveSession(session)
        try blockingService.startTemporaryUnlock(durationMinutes: minutes)
        blockingService.removeRestrictions()
        return session
    }

    func endSession() -> UnlockSession {
        let session = UnlockSession(startDate: nowProvider(), duration: 0, isActive: false)
        storage.saveSession(session)
        return session
    }

    func remainingSeconds(for session: UnlockSession, now: Date) -> TimeInterval {
        max(0, session.endDate.timeIntervalSince(now))
    }
}
