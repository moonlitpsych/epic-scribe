import Foundation
import WhisperKit

/// Manages on-device Whisper transcription via WhisperKit.
/// Model downloads automatically on first use (~142MB for base).
class TranscriptionManager: ObservableObject {
    @Published var isModelLoaded = false
    @Published var isTranscribing = false
    @Published var transcriptionProgress: String = ""
    @Published var transcript: String = ""
    @Published var modelLoadError: String?

    private var whisperKit: WhisperKit?

    /// Load the Whisper model. Call at app launch.
    func loadModel() async {
        await MainActor.run {
            transcriptionProgress = "Loading Whisper model..."
        }

        do {
            let kit = try await WhisperKit(model: "openai_whisper-base")
            self.whisperKit = kit

            await MainActor.run {
                self.isModelLoaded = true
                self.transcriptionProgress = ""
                self.modelLoadError = nil
            }
            print("[Whisper] Model loaded successfully")
        } catch {
            print("[Whisper] Model load error: \(error)")
            await MainActor.run {
                self.modelLoadError = error.localizedDescription
                self.transcriptionProgress = ""
            }
        }
    }

    /// Transcribe an audio file and return the text.
    func transcribe(audioURL: URL) async -> String? {
        guard let kit = whisperKit else {
            print("[Whisper] Model not loaded")
            return nil
        }

        await MainActor.run {
            isTranscribing = true
            transcriptionProgress = "Transcribing..."
            transcript = ""
        }

        do {
            let results = try await kit.transcribe(audioPath: audioURL.path())

            let text = results.map { $0.text }.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)

            await MainActor.run {
                self.transcript = text
                self.isTranscribing = false
                self.transcriptionProgress = ""
            }

            print("[Whisper] Transcribed \(text.split(separator: " ").count) words")
            return text
        } catch {
            print("[Whisper] Transcription error: \(error)")
            await MainActor.run {
                self.isTranscribing = false
                self.transcriptionProgress = "Transcription failed: \(error.localizedDescription)"
            }
            return nil
        }
    }

    /// Clear the current transcript.
    func clear() {
        transcript = ""
        transcriptionProgress = ""
    }
}
