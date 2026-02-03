import Foundation
import FamilyControls

final class SettingsViewModel: ObservableObject {
    @Published var savePhotos: Bool
    @Published var minutesPerPhoto: Int
    @Published var selection: FamilyActivitySelection
    @Published var errorMessage: String?

    private let storage: StorageServiceProtocol
    private let blockingService: BlockingServiceProtocol

    init(storage: StorageServiceProtocol = StorageService(), blockingService: BlockingServiceProtocol = BlockingService()) {
        self.storage = storage
        self.blockingService = blockingService
        let settings = storage.loadSettings()
        self.savePhotos = settings.savePhotosToLibrary
        self.minutesPerPhoto = settings.minutesPerPhoto
        self.selection = storage.loadConfig().selection
    }

    func persistSettings() {
        var settings = storage.loadSettings()
        settings.savePhotosToLibrary = savePhotos
        settings.minutesPerPhoto = minutesPerPhoto
        storage.saveSettings(settings)
    }

    func persistSelection() {
        storage.saveConfig(AppBlockingConfig(selection: selection))
    }

    @MainActor
    func requestAuthorization() async {
        do {
            try await blockingService.requestAuthorization()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetAll() {
        storage.resetAll()
    }
}
