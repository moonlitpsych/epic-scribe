import SwiftUI

@main
struct HealthKitSyncApp: App {
    @StateObject private var healthKit: HealthKitManager
    @StateObject private var syncManager: SyncManager
    @StateObject private var recordingManager = RecordingManager()
    @StateObject private var transcriptionManager = TranscriptionManager()
    @StateObject private var transcriptSync = TranscriptSyncManager()

    init() {
        let hk = HealthKitManager()
        _healthKit = StateObject(wrappedValue: hk)
        let sm = SyncManager(healthKit: hk)
        _syncManager = StateObject(wrappedValue: sm)

        // Wire background delivery callback → auto-sync
        hk.onClinicalDataChanged = { [weak sm] in
            guard let sm = sm else { return }
            Task { await sm.performSync() }
        }

        // Register observer queries on every launch
        hk.enableBackgroundDelivery()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(healthKit)
                .environmentObject(syncManager)
                .environmentObject(recordingManager)
                .environmentObject(transcriptionManager)
                .environmentObject(transcriptSync)
                .task {
                    await transcriptionManager.loadModel()
                }
        }
    }
}
