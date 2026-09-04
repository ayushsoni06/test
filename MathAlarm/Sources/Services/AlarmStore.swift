import AlarmKit
import Foundation
import Observation
import SwiftUI

/// Metadata carried alongside each AlarmKit alarm so the alert and the
/// challenge screen know which difficulty to present.
struct MathAlarmMetadata: AlarmMetadata {
    let difficulty: Difficulty
    let label: String

    init(difficulty: Difficulty, label: String) {
        self.difficulty = difficulty
        self.label = label
    }
}

/// Single source of truth for saved alarms, AlarmKit scheduling, and the
/// in-progress wake-up challenge.
@MainActor
@Observable
final class AlarmStore {
    static let shared = AlarmStore()

    private(set) var alarms: [AlarmItem] = []
    private(set) var authorization: AlarmManager.AuthorizationState = .notDetermined

    /// The challenge in flight, if any. Drives the full-screen quiz.
    ///
    /// Its identity is deliberately stable for the whole challenge: the quiz is
    /// keyed to it, so changing it would tear the view down and wipe the user's
    /// progress. The AlarmKit alarm actually ringing is tracked separately by
    /// `backingAlarmID`, which does change on every re-arm.
    private(set) var activeChallenge: AlarmItem?
    /// The AlarmKit alarm currently ringing (or armed) behind `activeChallenge`.
    private var backingAlarmID: UUID?
    /// When the last re-arm was issued, so the watchdog cannot spin.
    private var lastRearmAt: Date?
    /// Set the moment the user answers the last problem correctly, so the
    /// watchdog does not treat the resulting silence as an escape.
    private var challengeSatisfied = false

    private let defaultsKey = "com.mathalarm.alarms"
    private var watchdog: Task<Void, Never>?
    private var latestSnapshot: [Alarm] = []

    private init() {
        load()
        startWatchdog()
    }

    // MARK: - Authorization

    func requestAuthorizationIfNeeded() async {
        do {
            authorization = try await AlarmManager.shared.requestAuthorization()
        } catch {
            authorization = .denied
        }
    }

    // MARK: - Persistence

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey),
              let decoded = try? JSONDecoder().decode([AlarmItem].self, from: data)
        else { return }
        alarms = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(alarms) else { return }
        UserDefaults.standard.set(data, forKey: defaultsKey)
    }

    // MARK: - Editing

    func upsert(_ alarm: AlarmItem) {
        if let index = alarms.firstIndex(where: { $0.id == alarm.id }) {
            alarms[index] = alarm
        } else {
            alarms.append(alarm)
        }
        alarms.sort { ($0.hour, $0.minute) < ($1.hour, $1.minute) }
        save()
        Task { await sync(alarm) }
    }

    func delete(at offsets: IndexSet) {
        let removed = offsets.map { alarms[$0] }
        alarms.remove(atOffsets: offsets)
        save()
        for alarm in removed {
            try? AlarmManager.shared.cancel(id: alarm.id)
        }
    }

    func setEnabled(_ isEnabled: Bool, for alarm: AlarmItem) {
        guard let index = alarms.firstIndex(where: { $0.id == alarm.id }) else { return }
        alarms[index].isEnabled = isEnabled
        save()
        Task { await sync(alarms[index]) }
    }

    // MARK: - AlarmKit scheduling

    private func sync(_ alarm: AlarmItem) async {
        try? AlarmManager.shared.cancel(id: alarm.id)
        guard alarm.isEnabled else { return }

        if authorization != .authorized {
            await requestAuthorizationIfNeeded()
            guard authorization == .authorized else { return }
        }

        let time = Alarm.Schedule.Relative.Time(hour: alarm.hour, minute: alarm.minute)
        let recurrence: Alarm.Schedule.Relative.Recurrence = alarm.weekdays.isEmpty
            ? .never
            : .weekly(alarm.weekdays.sorted().compactMap(Self.weekday(from:)))
        let schedule = Alarm.Schedule.relative(.init(time: time, repeats: recurrence))

        do {
            _ = try await AlarmManager.shared.schedule(
                id: alarm.id,
                configuration: configuration(for: alarm, schedule: schedule)
            )
        } catch {
            print("Failed to schedule alarm \(alarm.id): \(error)")
        }
    }

    private func configuration(
        for alarm: AlarmItem,
        schedule: Alarm.Schedule
    ) -> AlarmManager.AlarmConfiguration<MathAlarmMetadata> {
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: alarm.label),
            stopButton: AlarmButton(
                text: "Solve to Stop",
                textColor: .white,
                systemImageName: "function"
            )
        )
        let attributes = AlarmAttributes(
            presentation: AlarmPresentation(alert: alert),
            metadata: MathAlarmMetadata(difficulty: alarm.difficulty, label: alarm.label),
            tintColor: Color.orange
        )
        return AlarmManager.AlarmConfiguration(
            schedule: schedule,
            attributes: attributes,
            stopIntent: SolveToStopIntent(alarmID: alarm.id.uuidString),
            sound: .default
        )
    }

    private static func weekday(from calendarWeekday: Int) -> Locale.Weekday? {
        switch calendarWeekday {
        case 1: .sunday
        case 2: .monday
        case 3: .tuesday
        case 4: .wednesday
        case 5: .thursday
        case 6: .friday
        case 7: .saturday
        default: nil
        }
    }

    /// Fires an alarm a few seconds from now so the whole flow can be tested
    /// without waiting until morning.
    func scheduleTestAlarm(difficulty: Difficulty, in seconds: TimeInterval = 10) async {
        await requestAuthorizationIfNeeded()
        guard authorization == .authorized else { return }

        let probe = AlarmItem(
            hour: 0,
            minute: 0,
            label: "Test Alarm",
            difficulty: difficulty,
            isEnabled: true
        )
        let schedule = Alarm.Schedule.fixed(Date().addingTimeInterval(seconds))
        do {
            _ = try await AlarmManager.shared.schedule(
                id: probe.id,
                configuration: configuration(for: probe, schedule: schedule)
            )
            transientAlarms[probe.id] = probe
        } catch {
            print("Failed to schedule test alarm: \(error)")
        }
    }

    /// Alarms that exist in AlarmKit but are not part of the saved list
    /// (test alarms and watchdog re-arms).
    private var transientAlarms: [UUID: AlarmItem] = [:]

    private func alarm(for id: UUID) -> AlarmItem? {
        alarms.first { $0.id == id } ?? transientAlarms[id]
    }

    // MARK: - Challenge

    /// Called by the alert's Stop button. AlarmKit silences its own alarm at
    /// that point, so `ChallengeSiren` takes over the noise while the quiz runs
    /// and the watchdog below re-arms the alarm if the quiz is abandoned.
    func beginChallenge(alarmID: String) {
        guard let uuid = UUID(uuidString: alarmID), let alarm = alarm(for: uuid) else { return }
        challengeSatisfied = false
        backingAlarmID = uuid
        lastRearmAt = nil
        // If a quiz is already up, only the backing alarm changed. Leave the
        // challenge itself alone so the questions and progress survive.
        if activeChallenge == nil {
            activeChallenge = alarm
        }
    }

    /// Re-attaches the quiz if the app is opened while an alarm is alerting
    /// (for example the user tapped the alert instead of the Stop button).
    func resumeChallengeIfAlerting() {
        guard activeChallenge == nil else { return }
        guard let alerting = latestSnapshot.first(where: { $0.state == .alerting }) else { return }
        beginChallenge(alarmID: alerting.id.uuidString)
    }

    /// The only path that actually stops the alarm.
    func completeChallenge() {
        guard activeChallenge != nil else { return }
        challengeSatisfied = true
        activeChallenge = nil
        ChallengeSiren.shared.stop()
        if let backingAlarmID {
            try? AlarmManager.shared.stop(id: backingAlarmID)
            transientAlarms[backingAlarmID] = nil
        }
        backingAlarmID = nil
        lastRearmAt = nil
    }

    /// Watches AlarmKit state. If a challenge is in flight and the alarm stops
    /// ringing without the quiz being solved, it is immediately re-armed.
    private func startWatchdog() {
        watchdog = Task { [weak self] in
            for await snapshot in AlarmManager.shared.alarmUpdates {
                guard let self else { return }
                await self.handle(snapshot)
            }
        }
    }

    private func handle(_ snapshot: [Alarm]) async {
        latestSnapshot = snapshot
        guard activeChallenge != nil, !challengeSatisfied else { return }
        guard let backing = backingAlarmID else { return }

        // Ringing: nothing to do.
        if snapshot.contains(where: { $0.id == backing && $0.state == .alerting }) {
            lastRearmAt = nil
            return
        }
        // Armed but not yet ringing — a re-arm we already scheduled. Let it fire.
        if snapshot.contains(where: { $0.id == backing }) { return }
        // Belt and braces: never re-arm twice inside the same window, even if
        // the replacement never shows up in a snapshot.
        if let lastRearmAt, Date().timeIntervalSince(lastRearmAt) < 10 { return }

        await rearm()
    }

    /// Schedules a fresh alarm a couple of seconds out. Note that
    /// `activeChallenge` is left untouched, so the quiz on screen keeps its
    /// questions and its progress.
    private func rearm() async {
        guard let template = activeChallenge else { return }
        lastRearmAt = Date()

        var replacement = template
        replacement.id = UUID()
        let schedule = Alarm.Schedule.fixed(Date().addingTimeInterval(2))
        do {
            _ = try await AlarmManager.shared.schedule(
                id: replacement.id,
                configuration: configuration(for: replacement, schedule: schedule)
            )
            transientAlarms[replacement.id] = replacement
            backingAlarmID = replacement.id
        } catch {
            print("Failed to re-arm alarm: \(error)")
        }
    }
}
