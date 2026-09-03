import SwiftUI

@main
struct MathAlarmApp: App {
    @State private var store = AlarmStore.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            AlarmListView()
                .environment(store)
                .task { await store.requestAuthorizationIfNeeded() }
                .fullScreenCover(item: Binding(
                    get: { store.activeChallenge },
                    set: { _ in }
                )) { alarm in
                    QuizView(alarm: alarm)
                        .environment(store)
                        .interactiveDismissDisabled()
                }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.resumeChallengeIfAlerting() }
        }
    }
}
