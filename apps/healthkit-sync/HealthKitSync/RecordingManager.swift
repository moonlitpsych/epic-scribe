import AVFoundation
import Foundation

/// Manages audio recording for visit transcription.
/// Records 16kHz mono WAV — WhisperKit's native input format.
class RecordingManager: ObservableObject {
    @Published var isRecording = false
    @Published var elapsedSeconds: Int = 0
    @Published var audioLevel: Float = 0 // 0-1, for waveform visualization

    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    private var levelTimer: Timer?
    private var recordingURL: URL?

    /// Start recording to a temp WAV file.
    func startRecording() async -> Bool {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
        } catch {
            print("[Recording] Audio session error: \(error)")
            return false
        }

        // Check microphone permission
        let permitted: Bool
        if #available(iOS 17.0, *) {
            permitted = await AVAudioApplication.requestRecordPermission()
        } else {
            permitted = await withCheckedContinuation { cont in
                session.requestRecordPermission { granted in
                    cont.resume(returning: granted)
                }
            }
        }
        guard permitted else {
            print("[Recording] Microphone permission denied")
            return false
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("visit_\(Int(Date().timeIntervalSince1970)).wav")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
        ]

        do {
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.isMeteringEnabled = true
            recorder.prepareToRecord()
            recorder.record()

            self.audioRecorder = recorder
            self.recordingURL = url

            await MainActor.run {
                self.isRecording = true
                self.elapsedSeconds = 0
            }

            // Elapsed time timer
            let elapsed = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    self?.elapsedSeconds += 1
                }
            }
            self.timer = elapsed

            // Level metering timer
            let level = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                guard let recorder = self?.audioRecorder else { return }
                recorder.updateMeters()
                let db = recorder.averagePower(forChannel: 0)
                // Convert dB (-160...0) to 0...1 range
                let normalized = max(0, min(1, (db + 60) / 60))
                Task { @MainActor in
                    self?.audioLevel = normalized
                }
            }
            self.level = level

            return true
        } catch {
            print("[Recording] Failed to start: \(error)")
            return false
        }
    }

    private var level: Timer? {
        get { levelTimer }
        set {
            levelTimer?.invalidate()
            levelTimer = newValue
        }
    }

    /// Stop recording and return the file URL.
    func stopRecording() -> URL? {
        timer?.invalidate()
        timer = nil
        levelTimer?.invalidate()
        levelTimer = nil

        audioRecorder?.stop()
        audioRecorder = nil

        Task { @MainActor in
            self.isRecording = false
            self.audioLevel = 0
        }

        // Deactivate audio session so other apps can use audio
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        return recordingURL
    }

    /// Delete the last recording file.
    func deleteRecording() {
        if let url = recordingURL {
            try? FileManager.default.removeItem(at: url)
            recordingURL = nil
        }
        elapsedSeconds = 0
    }

    /// Format elapsed time as MM:SS.
    var formattedDuration: String {
        let m = elapsedSeconds / 60
        let s = elapsedSeconds % 60
        return String(format: "%02d:%02d", m, s)
    }
}
