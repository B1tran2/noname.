import Foundation

enum ProductivityCategory: String, Codable, CaseIterable, Identifiable {
    case study = "Estudio"
    case work = "Trabajo"
    case sport = "Deporte"
    case home = "Hogar"
    case other = "Otro"

    var id: String { rawValue }
}

struct ProductivityEntry: Codable, Identifiable {
    let id: UUID
    let date: Date
    let category: ProductivityCategory
    let note: String
    let pointsOrMinutesGranted: Int

    init(date: Date, category: ProductivityCategory, note: String, pointsOrMinutesGranted: Int) {
        self.id = UUID()
        self.date = date
        self.category = category
        self.note = note
        self.pointsOrMinutesGranted = pointsOrMinutesGranted
    }
}
