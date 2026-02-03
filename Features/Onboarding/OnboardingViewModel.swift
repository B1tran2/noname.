import Foundation
import FamilyControls

final class OnboardingViewModel: ObservableObject {
    @Published var selection = FamilyActivitySelection()
    @Published var errorMessage: String?

    private let storage: StorageServiceProtocol
    private let blockingService: BlockingServiceProtocol

    init(
        storage: StorageServiceProtocol = StorageService(),
        blockingService: BlockingServiceProtocol = BlockingService()
    ) {
        self.storage = storage
        self.blockingService = blockingService
        selection = storage.loadConfig().selection
    }

    @MainActor
    func requestAuthorization() async {
        do {
            try await blockingService.requestAuthorization()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveSelection() {
        storage.saveConfig(AppBlockingConfig(selection: selection))
    }
}
