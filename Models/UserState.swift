import Foundation

struct UserState: Codable {
    var minutesBalance: Int
    var lastValidationDate: Date?
    var streak: Int

    static let `default` = UserState(minutesBalance: 0, lastValidationDate: nil, streak: 0)
}
