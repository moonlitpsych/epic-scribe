import Foundation

/// Sends clinical data to the Epic Scribe backend.
enum APIClient {

    enum SyncError: LocalizedError {
        case invalidURL
        case httpError(Int, String)
        case networkError(Error)

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid API URL"
            case .httpError(let code, let msg): return "HTTP \(code): \(msg)"
            case .networkError(let err): return err.localizedDescription
            }
        }
    }

    struct SyncResponse: Codable {
        let success: Bool?
        let patientId: String?
        let syncedTypes: [String: Int]?
        let error: String?
    }

    /// POST clinical data to the HealthKit sync endpoint.
    static func syncClinicalData(_ payload: ClinicalDataPayload) async throws -> SyncResponse {
        guard let url = URL(string: Config.healthKitSyncEndpoint) else {
            throw SyncError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(Config.apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        let decoded = try JSONDecoder().decode(SyncResponse.self, from: data)

        if httpResponse.statusCode != 200 {
            throw SyncError.httpError(httpResponse.statusCode, decoded.error ?? "Unknown error")
        }

        return decoded
    }

    // MARK: - Transcript Sync

    struct TranscriptSyncPayload: Codable {
        let patientName: String
        let patientId: String?
        let transcript: String
        let recordingDurationSeconds: Int
        let wordCount: Int
        let whisperModel: String
        let recordedAt: String
        let transcribedAt: String
    }

    struct TranscriptSyncResponse: Codable {
        let success: Bool?
        let transcriptId: String?
        let error: String?
    }

    /// POST a visit transcript to the sync endpoint.
    static func syncTranscript(_ pending: TranscriptSyncManager.PendingTranscript) async throws -> TranscriptSyncResponse {
        guard let url = URL(string: Config.transcriptSyncEndpoint) else {
            throw SyncError.invalidURL
        }

        let formatter = ISO8601DateFormatter()
        let payload = TranscriptSyncPayload(
            patientName: pending.patientName,
            patientId: pending.patientId,
            transcript: pending.transcript,
            recordingDurationSeconds: pending.durationSeconds,
            wordCount: pending.wordCount,
            whisperModel: pending.whisperModel,
            recordedAt: formatter.string(from: pending.recordedAt),
            transcribedAt: formatter.string(from: pending.transcribedAt)
        )

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(Config.apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        let decoded = try JSONDecoder().decode(TranscriptSyncResponse.self, from: data)

        if httpResponse.statusCode != 200 {
            throw SyncError.httpError(httpResponse.statusCode, decoded.error ?? "Unknown error")
        }

        return decoded
    }

    // MARK: - Patient Search

    struct PatientSearchResponse: Codable {
        let patients: [PatientSearchService.PatientSuggestion]
    }

    /// Search patients by name for autocomplete.
    static func searchPatients(query: String) async throws -> [PatientSearchService.PatientSuggestion] {
        guard var components = URLComponents(string: Config.patientSearchEndpoint) else {
            throw SyncError.invalidURL
        }
        components.queryItems = [URLQueryItem(name: "q", value: query)]

        guard let url = components.url else { throw SyncError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(Config.apiKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        if httpResponse.statusCode != 200 {
            throw SyncError.httpError(httpResponse.statusCode, "Patient search failed")
        }

        let decoded = try JSONDecoder().decode(PatientSearchResponse.self, from: data)
        return decoded.patients
    }
}
