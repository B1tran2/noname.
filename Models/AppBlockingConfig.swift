import Foundation
import FamilyControls

struct AppBlockingConfig: Codable {
    var selection: FamilyActivitySelection

    static let empty = AppBlockingConfig(selection: FamilyActivitySelection())
}
