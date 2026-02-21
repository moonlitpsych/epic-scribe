import Foundation

struct ScannedPatient: Codable {
    let id: String
    let name: String

    private static let userDefaultsKey = "savedPatient"

    static func from(qrString: String) -> ScannedPatient? {
        guard let data = qrString.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(ScannedPatient.self, from: data)
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.userDefaultsKey)
        }
    }

    static func loadSaved() -> ScannedPatient? {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey) else { return nil }
        return try? JSONDecoder().decode(ScannedPatient.self, from: data)
    }

    static func clearSaved() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
    }
}
