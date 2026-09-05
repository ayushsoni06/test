import AVFoundation
import Foundation
import Observation
import Vision

/// Counts push-ups from the front camera using Apple's Vision body-pose model.
///
/// The signal is the **elbow angle** — the angle at the elbow between the
/// shoulder and the wrist. That is rotation invariant, so it does not matter
/// how the phone is propped up, which way the camera thinks is up, or whether
/// the image is mirrored. Arms bend near the floor and straighten at the top,
/// and one down-then-up cycle is one rep.
///
/// This is deliberately forgiving. The push-ups exist to get someone out of
/// bed, not to judge their form.
@MainActor
@Observable
final class PushupDetector: NSObject {
    /// Elbow angle below this counts as "down".
    private static let downAngle = 105.0
    /// Elbow angle above this counts as "up".
    private static let upAngle = 150.0
    /// Joints below this confidence are ignored.
    private static let minimumConfidence: Float = 0.3

    private(set) var reps = 0
    private(set) var isBodyVisible = false
    private(set) var hint = "Prop your phone up so it can see you"
    /// Seconds since a body was last seen, used to offer a way out.
    private(set) var secondsWithoutBody = 0

    var onRep: (() -> Void)?

    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "com.mathalarm.pose")
    private var isDown = false
    private var lastRepAt: Date?
    private var lostBodyTimer: Task<Void, Never>?

    // MARK: - Lifecycle

    func start(target: Int) async {
        guard await requestCameraAccess() else {
            hint = "Camera access is off. Allow it in Settings, or switch to math below."
            return
        }
        configureSession()
        let session = self.session
        await withCheckedContinuation { continuation in
            queue.async {
                if !session.isRunning { session.startRunning() }
                continuation.resume()
            }
        }
        startLostBodyTimer()
    }

    func stop() {
        lostBodyTimer?.cancel()
        lostBodyTimer = nil
        let session = self.session
        queue.async {
            if session.isRunning { session.stopRunning() }
        }
    }

    private func requestCameraAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: true
        case .notDetermined: await AVCaptureDevice.requestAccess(for: .video)
        default: false
        }
    }

    private func configureSession() {
        guard session.inputs.isEmpty else { return }

        // Leave the audio session alone — ChallengeSiren owns it.
        session.automaticallyConfiguresApplicationAudioSession = false
        session.beginConfiguration()
        session.sessionPreset = .medium

        if let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
           let input = try? AVCaptureDeviceInput(device: camera),
           session.canAddInput(input) {
            session.addInput(input)
        }

        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(output) { session.addOutput(output) }

        session.commitConfiguration()
    }

    private func startLostBodyTimer() {
        lostBodyTimer = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                secondsWithoutBody = isBodyVisible ? 0 : secondsWithoutBody + 1
            }
        }
    }

    // MARK: - Rep counting

    fileprivate func ingest(angle: Double?) {
        guard let angle else {
            isBodyVisible = false
            if reps == 0 { hint = "Get in frame — the camera needs to see your arms" }
            return
        }

        isBodyVisible = true

        if !isDown, angle < Self.downAngle {
            isDown = true
            hint = "Now push back up"
            return
        }

        guard isDown, angle > Self.upAngle else {
            if !isDown { hint = "Go down" }
            return
        }

        // Ignore anything faster than a plausible rep, so a twitch cannot farm reps.
        if let lastRepAt, Date().timeIntervalSince(lastRepAt) < 0.6 { return }

        isDown = false
        lastRepAt = Date()
        reps += 1
        hint = "Go down"
        onRep?()
    }
}

// MARK: - Frame handling

extension PushupDetector: AVCaptureVideoDataOutputSampleBufferDelegate {
    nonisolated func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let request = VNDetectHumanBodyPoseRequest()
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
        try? handler.perform([request])

        let angle = (request.results?.first).flatMap(Self.elbowAngle(in:))
        Task { @MainActor [weak self] in
            self?.ingest(angle: angle)
        }
    }

    /// The straighter of the two elbows, so an arm hidden by the body does not
    /// stall the count.
    nonisolated private static func elbowAngle(in observation: VNHumanBodyPoseObservation) -> Double? {
        let left = angle(
            observation,
            shoulder: .leftShoulder,
            elbow: .leftElbow,
            wrist: .leftWrist
        )
        let right = angle(
            observation,
            shoulder: .rightShoulder,
            elbow: .rightElbow,
            wrist: .rightWrist
        )
        return [left, right].compactMap { $0 }.max()
    }

    nonisolated private static func angle(
        _ observation: VNHumanBodyPoseObservation,
        shoulder: VNHumanBodyPoseObservation.JointName,
        elbow: VNHumanBodyPoseObservation.JointName,
        wrist: VNHumanBodyPoseObservation.JointName
    ) -> Double? {
        guard let s = try? observation.recognizedPoint(shoulder),
              let e = try? observation.recognizedPoint(elbow),
              let w = try? observation.recognizedPoint(wrist),
              s.confidence > minimumConfidence,
              e.confidence > minimumConfidence,
              w.confidence > minimumConfidence
        else { return nil }

        let upper = CGVector(dx: s.location.x - e.location.x, dy: s.location.y - e.location.y)
        let fore = CGVector(dx: w.location.x - e.location.x, dy: w.location.y - e.location.y)

        let dot = upper.dx * fore.dx + upper.dy * fore.dy
        let magnitude = hypot(upper.dx, upper.dy) * hypot(fore.dx, fore.dy)
        guard magnitude > 0 else { return nil }

        return Double(acos(max(-1, min(1, dot / magnitude)))) * 180 / .pi
    }
}
