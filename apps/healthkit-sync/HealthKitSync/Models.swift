import Foundation

// MARK: - Payload types (matching @epic-scribe/types)

struct ClinicalDataPayload: Codable {
    var patientId: String
    var data: HealthKitClinicalDataPayload
    var syncTimestamp: String
}

struct HealthKitClinicalDataPayload: Codable {
    var medications: [MedicationSummary]?
    var conditions: [ConditionSummary]?
    var labResults: [LabResultSummary]?
    var vitalSigns: [VitalSignSummary]?
    var allergies: [AllergySummary]?
    var clinicalNotes: [ClinicalNoteSummary]?
    var procedures: [ProcedureSummary]?
}

struct MedicationSummary: Codable, Identifiable {
    var id: String { "\(name)-\(dose ?? "")-\(startDate ?? "")" }
    // Structured fields (FHIR R4 sources)
    let name: String
    var dose: String?
    var route: String?
    var frequency: String?
    var prn: Bool?
    var rxNormCode: String?
    var status: String?
    var startDate: String?
    // Rich context (normalized from sig)
    var sig: String?
    var instructions: String?
    var dispensing: String?
}

struct ConditionSummary: Codable, Identifiable {
    var id: String { "\(displayName)-\(icd10Code ?? "")" }
    let displayName: String
    var icd10Code: String?
    var snomedCode: String?
    var clinicalStatus: String?
    var onsetDate: String?
}

struct LabResultSummary: Codable, Identifiable {
    var id: String { "\(name)-\(collectionDate ?? "")-\(value)" }
    let name: String
    let value: String
    var units: String?
    var referenceRange: String?
    var loincCode: String?
    var collectionDate: String?
    var isAbnormal: Bool?
}

struct VitalSignSummary: Codable, Identifiable {
    var id: String { "\(name)-\(recordedDate ?? "")" }
    let name: String
    let value: String
    var units: String?
    var loincCode: String?
    var recordedDate: String?
}

struct AllergySummary: Codable, Identifiable {
    var id: String { substance }
    let substance: String
    var reaction: String?
    var severity: String?
    var onsetDate: String?
}

struct ClinicalNoteSummary: Codable, Identifiable {
    var id: String { "\(title)-\(date)" }
    let title: String
    let date: String
    var author: String?
    let narrativeText: String
    var encounterType: String?
}

struct ProcedureSummary: Codable, Identifiable {
    var id: String { "\(name)-\(date ?? "")" }
    let name: String
    var date: String?
    var cptCode: String?
    var snomedCode: String?
}
