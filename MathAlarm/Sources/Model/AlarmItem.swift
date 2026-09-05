import Foundation

/// A saved alarm. Persisted locally and mirrored into AlarmKit when enabled.
struct AlarmItem: Identifiable, Codable, Hashable, Sendable {
    var id: UUID
    var hour: Int
    var minute: Int
    var label: String
    var difficulty: Difficulty
    /// Calendar weekday numbers (1 = Sunday ... 7 = Saturday). Empty means "once".
    var weekdays: Set<Int>
    var isEnabled: Bool
    var challenge: ChallengeKind
    var pushupTarget: Int

    init(
        id: UUID = UUID(),
        hour: Int,
        minute: Int,
        label: String,
        difficulty: Difficulty,
        weekdays: Set<Int> = [],
        isEnabled: Bool = true,
        challenge: ChallengeKind = .math,
        pushupTarget: Int = 5
    ) {
        self.id = id
        self.hour = hour
        self.minute = minute
        self.label = label
        self.difficulty = difficulty
        self.weekdays = weekdays
        self.isEnabled = isEnabled
        self.challenge = challenge
        self.pushupTarget = pushupTarget
    }

    /// Decoded leniently so alarms saved by an earlier version survive an update.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        hour = try container.decode(Int.self, forKey: .hour)
        minute = try container.decode(Int.self, forKey: .minute)
        label = try container.decode(String.self, forKey: .label)
        difficulty = try container.decode(Difficulty.self, forKey: .difficulty)
        weekdays = try container.decodeIfPresent(Set<Int>.self, forKey: .weekdays) ?? []
        isEnabled = try container.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? true
        challenge = try container.decodeIfPresent(ChallengeKind.self, forKey: .challenge) ?? .math
        pushupTarget = try container.decodeIfPresent(Int.self, forKey: .pushupTarget) ?? 5
    }

    var time: Date {
        Calendar.current.date(from: DateComponents(hour: hour, minute: minute)) ?? .now
    }

    var formattedTime: String {
        time.formatted(.dateTime.hour().minute())
    }

    var challengeSummary: String {
        switch challenge {
        case .math: difficulty.title
        case .pushups: "\(pushupTarget) push-ups"
        }
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
