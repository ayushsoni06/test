import SwiftUI
import UIKit

struct QuizView: View {
    @Environment(AlarmStore.self) private var store
    let alarm: AlarmItem

    @State private var problems: [MathProblem] = []
    @State private var index = 0
    @State private var entry = ""
    @State private var shake = false

    var body: some View {
        VStack(spacing: 0) {
            header
            Spacer(minLength: 0)
            problemCard
            Spacer(minLength: 0)
            Keypad(
                onDigit: append,
                onDelete: deleteLast,
                onSubmit: submit,
                submitEnabled: !entry.isEmpty
            )
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
        .background(Color(.systemBackground))
        .onAppear(perform: reset)
    }

    private var header: some View {
        VStack(spacing: 14) {
            Text(alarm.label)
                .font(.title3.weight(.semibold))
            Text("Solve \(alarm.difficulty.problemCount) problems to stop the alarm")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 6) {
                ForEach(0..<alarm.difficulty.problemCount, id: \.self) { slot in
                    Capsule()
                        .fill(slot < index ? Color.orange : Color(.tertiarySystemFill))
                        .frame(height: 5)
                }
            }
            .animation(.snappy, value: index)
        }
        .padding(.top, 28)
    }

    private var problemCard: some View {
        VStack(spacing: 22) {
            Text(problems.indices.contains(index) ? problems[index].question : "")
                .font(.system(size: 52, weight: .medium, design: .rounded))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            Text(entry.isEmpty ? "–" : entry)
                .font(.system(size: 40, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(entry.isEmpty ? Color.secondary : Color.orange)
                .frame(maxWidth: .infinity, minHeight: 68)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .offset(x: shake ? 10 : 0)
                .animation(.default.repeatCount(3, autoreverses: true).speed(6), value: shake)
        }
        .padding(.vertical, 24)
    }

    // MARK: - Input

    private func append(_ digit: String) {
        guard entry.count < 6 else { return }
        if digit == "-" {
            guard entry.isEmpty else { return }
            entry = "-"
            return
        }
        entry.append(digit)
    }

    private func deleteLast() {
        guard !entry.isEmpty else { return }
        entry.removeLast()
    }

    private func submit() {
        guard problems.indices.contains(index), let value = Int(entry) else { return }

        if value == problems[index].answer {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            entry = ""
            index += 1
            if index >= problems.count {
                store.completeChallenge()
            }
        } else {
            // A wrong answer costs the whole streak — no half-asleep guessing.
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            shake.toggle()
            entry = ""
            reset()
        }
    }

    private func reset() {
        problems = MathProblem.series(for: alarm.difficulty)
        index = 0
        entry = ""
    }
}

private struct Keypad: View {
    let onDigit: (String) -> Void
    let onDelete: () -> Void
    let onSubmit: () -> Void
    let submitEnabled: Bool

    private let rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["-", "0", "⌫"]]

    var body: some View {
        VStack(spacing: 10) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(row, id: \.self) { key in
                        Button {
                            if key == "⌫" { onDelete() } else { onDigit(key) }
                        } label: {
                            Text(key)
                                .font(.system(size: 28, weight: .regular, design: .rounded))
                                .frame(maxWidth: .infinity, minHeight: 58)
                                .background(Color(.secondarySystemFill))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.primary)
                    }
                }
            }

            Button(action: onSubmit) {
                Text("Check Answer")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 54)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .disabled(!submitEnabled)
            .padding(.top, 4)
        }
    }
}
