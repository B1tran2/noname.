import Foundation
import Combine

final class AppState: ObservableObject {
    @Published var hasCompletedOnboarding: Bool = false
    @Published var savePhotosToLibrary: Bool = false
    @Published var minutesPerPhoto: Int = 15

    private let storage: StorageServiceProtocol

    init(storage: StorageServiceProtocol = StorageService()) {
        self.storage = storage
    }

    func load() {
        let settings = storage.loadSettings()
        hasCompletedOnboarding = settings.hasCompletedOnboarding
        savePhotosToLibrary = settings.savePhotosToLibrary
        minutesPerPhoto = settings.minutesPerPhoto
    }

    func markOnboardingCompleted() {
        hasCompletedOnboarding = true
        persistSettings()
    }

    func updateSavePhotos(_ enabled: Bool) {
        savePhotosToLibrary = enabled
        persistSettings()
    }

    func updateMinutesPerPhoto(_ minutes: Int) {
        minutesPerPhoto = minutes
        persistSettings()
    }

    private func persistSettings() {
        storage.saveSettings(AppSettings(
            hasCompletedOnboarding: hasCompletedOnboarding,
            savePhotosToLibrary: savePhotosToLibrary,
            minutesPerPhoto: minutesPerPhoto
        ))
    }
}
