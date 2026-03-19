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
            let friendlyMessage = categorizeError(error)
            await MainActor.run {
                lastSyncResult = .error(friendlyMessage)
                isSyncing = false
            }
            return false
        }
    }

    /// Maps raw errors to user-friendly messages.
    private func categorizeError(_ error: Error) -> String {
        if let syncError = error as? APIClient.SyncError {
            switch syncError {
            case .invalidURL:
                return "Configuration error. Please reinstall the app."
            case .httpError(let code, _):
                if code == 401 || code == 403 {
                    return "Authentication failed. Please contact your provider."
                } else if code >= 500 {
                    return "Server temporarily unavailable. Try again in a few minutes."
                } else {
                    return "Sync failed (error \(code)). Tap 'Sync Now' to try again."
                }
            case .networkError(let underlying):
                let nsError = underlying as NSError
                if nsError.domain == NSURLErrorDomain {
                    switch nsError.code {
                    case NSURLErrorNotConnectedToInternet,
                         NSURLErrorNetworkConnectionLost,
                         NSURLErrorDataNotAllowed:
                        return "No internet connection. Check Wi-Fi or cellular data."
                    case NSURLErrorTimedOut:
                        return "Connection timed out. Try again in a moment."
                    default:
                        return "Network error. Check your connection and try again."
                    }
                }
                return "Sync failed. Tap 'Sync Now' to try again."
            }
        }

        // Catch-all for unexpected errors
        return "Sync failed. Tap 'Sync Now' to try again."
    }
}
