import SwiftUI

struct AlarmEditorView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var draft: AlarmItem
    @State private var time: Date
    private let onSave: (AlarmItem) -> Void

    init(alarm: AlarmItem, onSave: @escaping (AlarmItem) -> Void) {
        _draft = State(initialValue: alarm)
        _time = State(initialValue: alarm.time)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker(
                        "Time",
                        selection: $time,
                        displayedComponents: .hourAndMinute
                    )
                    .datePickerStyle(.wheel)
                    .labelsHidden()
                    .frame(maxWidth: .infinity)
                }

                Section("Challenge") {
                    Picker("Difficulty", selection: $draft.difficulty) {
                        ForEach(Difficulty.allCases) { level in
                            Text(level.title).tag(level)
                        }
                    }
                    .pickerStyle(.segmented)

                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: draft.difficulty.symbol)
                            .foregroundStyle(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(draft.difficulty.subtitle)
                            Text("\(draft.difficulty.problemCount) problems in a row to stop the alarm.")
                                .foregroundStyle(.secondary)
                        }
                        .font(.footnote)
                    }
                }

                Section("Repeat") {
                    WeekdayPicker(selection: $draft.weekdays)
                }

                Section("Label") {
                    TextField("Wake Up", text: $draft.label)
                }
            }
            .navigationTitle("Alarm")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let components = Calendar.current.dateComponents([.hour, .minute], from: time)
                        draft.hour = components.hour ?? 7
                        draft.minute = components.minute ?? 0
                        draft.isEnabled = true
                        if draft.label.trimmingCharacters(in: .whitespaces).isEmpty {
                            draft.label = "Wake Up"
                        }
                        onSave(draft)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

private struct WeekdayPicker: View {
    @Binding var selection: Set<Int>

    private let symbols = Calendar.current.veryShortWeekdaySymbols

    var body: some View {
        HStack(spacing: 8) {
            ForEach(1...7, id: \.self) { day in
                let isOn = selection.contains(day)
                Button {
                    if isOn { selection.remove(day) } else { selection.insert(day) }
                } label: {
                    Text(symbols[day - 1])
                        .font(.footnote.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(isOn ? Color.orange : Color(.secondarySystemFill))
                        .foregroundStyle(isOn ? .white : .primary)
                        .clipShape(RoundedRectangle(cornerRadius: 9))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }
}
