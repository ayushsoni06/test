import AVFoundation
import SwiftUI
import UIKit

struct PushupView: View {
    @Environment(AlarmStore.self) private var store
    let alarm: AlarmItem

    @State private var detector = PushupDetector()
    @State private var showRepFlash = false
    @State private var switchedToMath = false

    /// How long without seeing anybody before offering a way out. A blaring
    /// alarm with no possible exit is worse than a skipped workout.
    private let fallbackAfter = 45

    var body: some View {
        if switchedToMath {
            QuizView(alarm: alarm)
                .environment(store)
        } else {
            pushupChallenge
        }
    }

    private var pushupChallenge: some View {
        ZStack {
            CameraPreview(session: detector.session)
                .ignoresSafeArea()

            LinearGradient(
                colors: [.black.opacity(0.7), .black.opacity(0.1), .black.opacity(0.8)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Spacer()
                if showRepFlash { repFlash }
                Spacer()
                footer
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 32)
        }
        .task {
            detector.onRep = handleRep
            await detector.start(target: alarm.pushupTarget)
            ChallengeSiren.shared.start()
        }
        .onDisappear {
            detector.stop()
            ChallengeSiren.shared.stop()
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Text(alarm.label)
                .font(.title3.weight(.semibold))

            Text("\(detector.reps) / \(alarm.pushupTarget)")
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
                .animation(.snappy, value: detector.reps)

            HStack(spacing: 6) {
                ForEach(0..<alarm.pushupTarget, id: \.self) { slot in
                    Capsule()
                        .fill(slot < detector.reps ? Color.orange : Color.white.opacity(0.25))
                        .frame(height: 5)
                }
            }
            .animation(.snappy, value: detector.reps)
        }
        .foregroundStyle(.white)
    }

    private var repFlash: some View {
        Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 96))
            .foregroundStyle(.green)
            .transition(.scale(scale: 0.7).combined(with: .opacity))
    }

    private var footer: some View {
        VStack(spacing: 16) {
            Label(detector.hint, systemImage: detector.isBodyVisible ? "figure.strengthtraining.traditional" : "eye.slash")
                .font(.headline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .background(.ultraThinMaterial, in: Capsule())

            if detector.secondsWithoutBody > fallbackAfter {
                Button {
                    detector.stop()
                    switchedToMath = true
                } label: {
                    Text("Can't do push-ups — solve math instead")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .transition(.opacity)
            }
        }
        .animation(.snappy, value: detector.secondsWithoutBody > fallbackAfter)
    }

    private func handleRep() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        withAnimation(.snappy) { showRepFlash = true }

        Task {
            try? await Task.sleep(for: .milliseconds(450))
            withAnimation(.snappy) { showRepFlash = false }
            if detector.reps >= alarm.pushupTarget {
                detector.stop()
                store.completeChallenge()
            }
        }
    }
}

/// Live camera feed behind the counter.
private struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}
