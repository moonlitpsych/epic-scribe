import Foundation

struct ScannedPatient: Codable {
    let id: String
    let name: String

    static func from(qrString: String) -> ScannedPatient? {
        guard let data = qrString.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(ScannedPatient.self, from: data)
    }
}
