import SwiftUI

struct AlarmListView: View {
    @Environment(AlarmStore.self) private var store
    @State private var editing: AlarmItem?
    @State private var showingTestConfirmation = false

    var body: some View {
        NavigationStack {
            Group {
                if store.alarms.isEmpty {
                    emptyState
                } else {
                    alarmList
                }
            }
            .navigationTitle("Alarms")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Button("Test Alarm in 10s", systemImage: "bolt.fill") {
                            Task { await store.scheduleTestAlarm(difficulty: .easy) }
                            showingTestConfirmation = true
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add Alarm", systemImage: "plus") {
                        editing = AlarmItem.newDefault()
                    }
                }
            }
            .sheet(item: $editing) { alarm in
                AlarmEditorView(alarm: alarm) { store.upsert($0) }
            }
            .alert("Test alarm set", isPresented: $showingTestConfirmation) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Lock your phone now. It will ring in about 10 seconds.")
            }
            .safeAreaInset(edge: .bottom) {
                if store.authorization != .authorized {
                    authorizationBanner
                }
            }
        }
    }

    private var alarmList: some View {
        List {
            ForEach(store.alarms) { alarm in
                AlarmRow(alarm: alarm)
                    .contentShape(Rectangle())
                    .onTapGesture { editing = alarm }
            }
            .onDelete { store.delete(at: $0) }
        }
        .listStyle(.insetGrouped)
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Alarms", systemImage: "alarm")
        } description: {
            Text("Add an alarm and pick how hard the math has to be before it will stop.")
        } actions: {
            Button("Add Alarm") { editing = AlarmItem.newDefault() }
                .buttonStyle(.borderedProminent)
        }
    }

    private var authorizationBanner: some View {
        VStack(spacing: 8) {
            Text("Alarm permission needed")
                .font(.subheadline.weight(.semibold))
            Text("Allow alarms in Settings so they can ring on the Lock Screen, even in Silent Mode or a Focus.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .font(.footnote.weight(.semibold))
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.thinMaterial)
    }
}

private struct AlarmRow: View {
    @Environment(AlarmStore.self) private var store
    let alarm: AlarmItem

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(alarm.formattedTime)
                    .font(.system(size: 44, weight: .light, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(alarm.isEnabled ? .primary : .secondary)

                HStack(spacing: 6) {
                    Text(alarm.label)
                    Text("•")
                    Text(alarm.repeatSummary)
                    Text("•")
                    Label(alarm.difficulty.title, systemImage: alarm.difficulty.symbol)
                        .labelStyle(.titleAndIcon)
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { alarm.isEnabled },
                set: { store.setEnabled($0, for: alarm) }
            ))
            .labelsHidden()
        }
        .padding(.vertical, 6)
    }
}
