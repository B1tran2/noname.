import Foundation
import UIKit

final class CaptureViewModel: ObservableObject {
    @Published var selectedImage: UIImage?
    @Published var selectedCategory: ProductivityCategory = .study
    @Published var note: String = ""
    @Published var errorMessage: String?
    @Published var isValidated: Bool = false

    private let classifier: ProductivityClassifier
    private let sessionService: SessionServiceProtocol
    private let storage: StorageServiceProtocol

    init(
        classifier: ProductivityClassifier = DummyManualClassifier(),
        sessionService: SessionServiceProtocol? = nil,
        storage: StorageServiceProtocol = StorageService()
    ) {
        self.classifier = classifier
        self.storage = storage
        self.sessionService = sessionService ?? SessionService(storage: storage, blockingService: BlockingService())
    }

    @MainActor
    func validate(minutesPerPhoto: Int, saveToLibrary: Bool) async {
        guard let image = selectedImage else { return }
        do {
            let isValid = try await classifier.classify(image: image)
            guard isValid else {
                errorMessage = "La foto no se pudo validar."
                return
            }
            let entry = try sessionService.validateEntry(
                category: selectedCategory,
                note: note,
                minutesPerPhoto: minutesPerPhoto
            )
            if saveToLibrary {
                UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
            }
            isValidated = true
            _ = entry
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
