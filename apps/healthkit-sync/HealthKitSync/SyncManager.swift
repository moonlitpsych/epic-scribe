import Foundation

/// Central sync coordinator that reads HealthKit data and POSTs to the backend.
class SyncManager: ObservableObject {
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var lastSyncResult: SyncResult?

    enum SyncResult {
        case success(String)
        case error(String)
    }

    private let healthKit: HealthKitManager

    private static let lastSyncDateKey = "lastSyncDate"

    init(healthKit: HealthKitManager) {
        self.healthKit = healthKit
        self.lastSyncDate = UserDefaults.standard.object(forKey: Self.lastSyncDateKey) as? Date
    }

    /// Full sync cycle: read HealthKit → POST to backend.
    /// Returns true on success.
    @discardableResult
    func performSync() async -> Bool {
        guard !isSyncing else { return false }
        guard let patient = ScannedPatient.loadSaved() else { return false }

        await MainActor.run { isSyncing = true }

        // Read clinical records
        await healthKit.readAllClinicalRecords()

        guard var payload = healthKit.clinicalData else {
            await MainActor.run {
                isSyncing = false
                lastSyncResult = .error("No clinical data found")
            }
            return false
        }

        payload.patientId = patient.id

        do {
            let response = try await APIClient.syncClinicalData(payload)
            let now = Date()
            UserDefaults.standard.set(now, forKey: Self.lastSyncDateKey)

            await MainActor.run {
                lastSyncDate = now
                if let types = response.syncedTypes {
                    let summary = types.map { "\($0.value) \($0.key)" }.joined(separator: ", ")
                    lastSyncResult = .success(summary)
                } else {
                    lastSyncResult = .success("Data synced")
                }
                isSyncing = false
            }
            return true
        } catch {
            await MainActor.run {
                lastSyncResult = .error(error.localizedDescription)
                isSyncing = false
            }
            return false
        }
    }
}
