import Foundation

/// What the user has to do to stop the alarm.
enum ChallengeKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case math
    case pushups

    var id: String { rawValue }

    var title: String {
        switch self {
        case .math: "Math"
        case .pushups: "Push-Ups"
        }
    }

    var symbol: String {
        switch self {
        case .math: "function"
        case .pushups: "figure.strengthtraining.traditional"
        }
    }

    var alertButtonText: String {
        switch self {
        case .math: "Solve to Stop"
        case .pushups: "Move to Stop"
        }
    }
}
