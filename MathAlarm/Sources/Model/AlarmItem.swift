import Foundation

/// A saved alarm. Persisted locally and mirrored into AlarmKit when enabled.
struct AlarmItem: Identifiable, Codable, Hashable, Sendable {
    var id: UUID = UUID()
    var hour: Int
    var minute: Int
    var label: String
    var difficulty: Difficulty
    /// Calendar weekday numbers (1 = Sunday ... 7 = Saturday). Empty means "once".
    var weekdays: Set<Int> = []
    var isEnabled: Bool = true

    var time: Date {
        Calendar.current.date(from: DateComponents(hour: hour, minute: minute)) ?? .now
    }

    var formattedTime: String {
        time.formatted(.dateTime.hour().minute())
    }

    var repeatSummary: String {
        if weekdays.isEmpty { return "Once" }
        if weekdays == Set(1...7) { return "Every day" }
        if weekdays == [2, 3, 4, 5, 6] { return "Weekdays" }
        if weekdays == [1, 7] { return "Weekends" }
        let symbols = Calendar.current.shortWeekdaySymbols
        return weekdays.sorted().map { symbols[$0 - 1] }.joined(separator: " ")
    }

    static func newDefault() -> AlarmItem {
        let components = Calendar.current.dateComponents([.hour, .minute], from: .now.addingTimeInterval(3600))
        return AlarmItem(
            hour: components.hour ?? 7,
            minute: components.minute ?? 0,
            label: "Wake Up",
            difficulty: .medium
        )
    }
}
