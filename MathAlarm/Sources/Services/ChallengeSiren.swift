import AudioToolbox
import AVFoundation
import UIKit

/// The noise the app makes on its own while the quiz is on screen.
///
/// AlarmKit silences its alarm as soon as the alert's button is tapped, so the
/// system alarm sound is already gone by the time the challenge appears. This
/// takes over from that moment: a synthesised two-tone siren plus a repeating
/// vibration, running until the quiz is solved.
@MainActor
final class ChallengeSiren {
    static let shared = ChallengeSiren()

    private let engine = AVAudioEngine()
    private var sourceNode: AVAudioSourceNode?
    private var hapticTask: Task<Void, Never>?
    private var isRunning = false

    private init() {}

    func start() {
        guard !isRunning else { return }
        isRunning = true
        startAudio()
        startHaptics()
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false

        hapticTask?.cancel()
        hapticTask = nil

        engine.stop()
        if let sourceNode {
            engine.detach(sourceNode)
            self.sourceNode = nil
        }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Audio

    private func startAudio() {
        do {
            // .playback keeps the siren audible with the ring switch set to silent.
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Siren audio session failed: \(error)")
        }

        let sampleRate = 44_100.0
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1) else { return }

        let state = SirenState()
        let node = AVAudioSourceNode { _, _, frameCount, audioBufferList -> OSStatus in
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            for frame in 0..<Int(frameCount) {
                // Sweep the pitch up and down twice a second.
                state.sweep += 2.0 / sampleRate
                if state.sweep >= 1 { state.sweep -= 1 }
                let ramp = state.sweep < 0.5 ? state.sweep * 2 : (1 - state.sweep) * 2
                let frequency = 620.0 + ramp * 540.0

                state.phase += frequency / sampleRate
                if state.phase >= 1 { state.phase -= 1 }

                // A square wave, because it is far harsher than a sine.
                let sample = Float(state.phase < 0.5 ? 0.7 : -0.7)
                for buffer in buffers {
                    UnsafeMutableBufferPointer<Float>(buffer)[frame] = sample
                }
            }
            return noErr
        }

        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 1.0
        sourceNode = node

        do {
            try engine.start()
        } catch {
            print("Siren engine failed to start: \(error)")
        }
    }

    // MARK: - Haptics

    private func startHaptics() {
        hapticTask = Task { @MainActor in
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.prepare()
            while !Task.isCancelled {
                generator.impactOccurred(intensity: 1.0)
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                try? await Task.sleep(for: .milliseconds(750))
            }
        }
    }
}

/// Scratch state for the render block, which runs on the real-time audio thread.
private final class SirenState: @unchecked Sendable {
    var phase: Double = 0
    var sweep: Double = 0
}
