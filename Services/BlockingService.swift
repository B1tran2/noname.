import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

protocol BlockingServiceProtocol {
    func requestAuthorization() async throws
    func applyRestrictions(using selection: FamilyActivitySelection)
    func removeRestrictions()
    func startTemporaryUnlock(durationMinutes: Int) throws
}

enum BlockingServiceError: LocalizedError {
    case missingSelection
    case deviceActivityUnavailable

    var errorDescription: String? {
        switch self {
        case .missingSelection:
            return "No hay apps seleccionadas para bloquear."
        case .deviceActivityUnavailable:
            return "DeviceActivity no está disponible o falta configuración de extensión."
        }
    }
}

final class BlockingService: BlockingServiceProtocol {
    private let store = ManagedSettingsStore()
    private let center = DeviceActivityCenter()

    func requestAuthorization() async throws {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }

    func applyRestrictions(using selection: FamilyActivitySelection) {
        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens
    }

    func removeRestrictions() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }

    func startTemporaryUnlock(durationMinutes: Int) throws {
        guard durationMinutes > 0 else { return }
        let now = Date()
        let end = now.addingTimeInterval(TimeInterval(durationMinutes * 60))
        let schedule = DeviceActivitySchedule(
            intervalStart: Calendar.current.dateComponents([.hour, .minute], from: now),
            intervalEnd: Calendar.current.dateComponents([.hour, .minute], from: end),
            repeats: false
        )
        do {
            try center.startMonitoring(.temporaryUnlock, during: schedule)
        } catch {
            throw BlockingServiceError.deviceActivityUnavailable
        }
    }
}

extension DeviceActivityName {
    static let temporaryUnlock = DeviceActivityName("temporaryUnlock")
}
