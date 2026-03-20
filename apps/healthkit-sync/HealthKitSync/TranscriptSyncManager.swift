import Foundation

/// Manages offline-capable sync queue for visit transcripts.
/// Transcripts are queued locally and synced to the backend when possible.
class TranscriptSyncManager: ObservableObject {
    @Published var pendingTranscripts: [PendingTranscript] = []
    @Published var isSyncing = false

    private static let storageKey = "pendingTranscripts"

    struct PendingTranscript: Codable, Identifiable {
        let id: String
        let patientName: String
        let patientId: String?
        let transcript: String
        let durationSeconds: Int
        let wordCount: Int
        let whisperModel: String
        let recordedAt: Date
        let transcribedAt: Date
        var synced: Bool
    }

    init() {
        loadFromStorage()
    }

    /// Add a transcript to the queue and trigger sync.
    func queue(
        patientName: String,
        patientId: String?,
        transcript: String,
        durationSeconds: Int,
        whisperModel: String = "base",
        recordedAt: Date,
        transcribedAt: Date
    ) {
        let pending = PendingTranscript(
            id: UUID().uuidString,
            patientName: patientName,
            patientId: patientId,
            transcript: transcript,
            durationSeconds: durationSeconds,
            wordCount: transcript.split(separator: " ").count,
            whisperModel: whisperModel,
            recordedAt: recordedAt,
            transcribedAt: transcribedAt,
            synced: false
        )

        pendingTranscripts.insert(pending, at: 0)
        saveToStorage()

        Task { await syncAll() }
    }

    /// Sync all unsynced transcripts to the backend.
    func syncAll() async {
        guard !isSyncing else { return }
        await MainActor.run { isSyncing = true }

        let unsynced = pendingTranscripts.filter { !$0.synced }
        var anyFailed = false

        for pending in unsynced {
            do {
                try await APIClient.syncTranscript(pending)

                await MainActor.run {
                    if let idx = self.pendingTranscripts.firstIndex(where: { $0.id == pending.id }) {
                        self.pendingTranscripts[idx].synced = true
                    }
                }
            } catch {
                print("[TranscriptSync] Failed to sync \(pending.id): \(error)")
                anyFailed = true
            }
        }

        saveToStorage()
        await MainActor.run { isSyncing = false }

        if anyFailed {
            print("[TranscriptSync] Some transcripts failed to sync, will retry later")
        }
    }

    // MARK: - Persistence

    private func saveToStorage() {
        if let data = try? JSONEncoder().encode(pendingTranscripts) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let items = try? JSONDecoder().decode([PendingTranscript].self, from: data) else { return }
        pendingTranscripts = items
    }
}
