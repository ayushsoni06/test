import Foundation

/// How hard the wake-up challenge is. Chosen per alarm when it is created.
enum Difficulty: String, Codable, CaseIterable, Identifiable, Sendable {
    case easy
    case medium
    case hard

    var id: String { rawValue }

    var title: String {
        switch self {
        case .easy: "Easy"
        case .medium: "Medium"
        case .hard: "Hard"
        }
    }

    var subtitle: String {
        switch self {
        case .easy: "Two-digit addition and subtraction."
        case .medium: "Multiplication and larger sums."
        case .hard: "Two-digit multiplication and mixed operations."
        }
    }

    var symbol: String {
        switch self {
        case .easy: "1.circle"
        case .medium: "2.circle"
        case .hard: "3.circle"
        }
    }

    /// Number of problems that must be solved in a row to silence the alarm.
    var problemCount: Int {
        switch self {
        case .easy: 3
        case .medium: 4
        case .hard: 5
        }
    }
}
