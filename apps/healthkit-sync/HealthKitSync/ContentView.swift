import SwiftUI

struct ContentView: View {
    @EnvironmentObject var healthKit: HealthKitManager
    @EnvironmentObject var syncManager: SyncManager
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView {
            RecordingView()
                .tabItem {
                    Label("Record", systemImage: "mic.fill")
                }

            HealthKitView()
                .tabItem {
                    Label("Health Data", systemImage: "heart.text.square")
                }
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .active {
                // Auto-sync HealthKit on foreground
                if ScannedPatient.loadSaved() != nil, healthKit.isAuthorized {
                    Task { await syncManager.performSync() }
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(HealthKitManager())
        .environmentObject(SyncManager(healthKit: HealthKitManager()))
        .environmentObject(RecordingManager())
        .environmentObject(TranscriptionManager())
        .environmentObject(TranscriptSyncManager())
}
