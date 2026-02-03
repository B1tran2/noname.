import Foundation
import UIKit

protocol ProductivityClassifier {
    func classify(image: UIImage) async throws -> Bool
}

struct DummyManualClassifier: ProductivityClassifier {
    func classify(image: UIImage) async throws -> Bool {
        true
    }
}
