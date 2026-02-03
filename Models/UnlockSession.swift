import Foundation

struct UnlockSession: Codable {
    var startDate: Date
    var duration: TimeInterval
    var isActive: Bool

    var endDate: Date {
        startDate.addingTimeInterval(duration)
    }

    static let inactive = UnlockSession(startDate: Date(), duration: 0, isActive: false)
}
