import Foundation

struct AppSettings: Codable {
    var hasCompletedOnboarding: Bool
    var savePhotosToLibrary: Bool
    var minutesPerPhoto: Int

    static let `default` = AppSettings(
        hasCompletedOnboarding: false,
        savePhotosToLibrary: false,
        minutesPerPhoto: 15
    )
}
