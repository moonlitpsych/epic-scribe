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
}
