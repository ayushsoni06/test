import AlarmKit
import AppIntents
import Foundation

/// Attached to the alert's Stop button. It deliberately does *not* stop the
/// alarm — it opens the app on the math challenge and lets the alarm keep
/// ringing. `AlarmStore.completeChallenge()` is the only thing that silences it.
struct SolveToStopIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Solve to Stop"
    static var description = IntentDescription("Opens the math challenge required to stop the alarm.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Alarm ID")
    var alarmID: String

    init() {}

    init(alarmID: String) {
        self.alarmID = alarmID
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        AlarmStore.shared.beginChallenge(alarmID: alarmID)
        return .result()
    }
}
