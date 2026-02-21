import Foundation
import HealthKit

/// Reads clinical records from HealthKit and transforms FHIR R4 resources
/// into the ClinicalDataPayload shape expected by the Epic Scribe backend.
class HealthKitManager: ObservableObject {
    private let healthStore = HKHealthStore()

    @Published var isAuthorized = false
    @Published var statusMessage = "Tap 'Authorize' to connect to Health Records"
    @Published var clinicalData: ClinicalDataPayload?
    @Published var isSyncing = false

    // All clinical record types we want to read
    private let clinicalTypes: [(HKClinicalTypeIdentifier, String)] = [
        (.allergyRecord, "Allergies"),
        (.conditionRecord, "Conditions"),
        (.labResultRecord, "Lab Results"),
        (.medicationRecord, "Medications"),
        (.vitalSignRecord, "Vital Signs"),
        (.procedureRecord, "Procedures"),
    ]

    // MARK: - Authorization

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            statusMessage = "Health data not available on this device"
            return
        }

        var readTypes = Set<HKObjectType>()
        for (identifier, _) in clinicalTypes {
            if let type = HKObjectType.clinicalType(forIdentifier: identifier) {
                readTypes.insert(type)
            }
        }

        // Also request clinical note records if available (iOS 16.4+)
        if #available(iOS 16.4, *) {
            if let noteType = HKObjectType.clinicalType(forIdentifier: .clinicalNoteRecord) {
                readTypes.insert(noteType)
            }
        }

        healthStore.requestAuthorization(toShare: nil, read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                if success {
                    self?.isAuthorized = true
                    self?.statusMessage = "Authorized! Tap 'Read Records' to fetch clinical data."
                } else {
                    self?.statusMessage = "Authorization denied: \(error?.localizedDescription ?? "unknown error")"
                }
            }
        }
    }

    // MARK: - Read Clinical Records

    func readAllClinicalRecords() async {
        await MainActor.run {
            isSyncing = true
            statusMessage = "Reading clinical records..."
        }

        var medications: [MedicationSummary] = []
        var conditions: [ConditionSummary] = []
        var labResults: [LabResultSummary] = []
        var vitalSigns: [VitalSignSummary] = []
        var allergies: [AllergySummary] = []
        var procedures: [ProcedureSummary] = []
        var clinicalNotes: [ClinicalNoteSummary] = []

        for (identifier, label) in clinicalTypes {
            guard let clinicalType = HKObjectType.clinicalType(forIdentifier: identifier) else { continue }

            await MainActor.run {
                statusMessage = "Reading \(label)..."
            }

            do {
                let records = try await fetchClinicalRecords(type: clinicalType)

                for record in records {
                    guard let fhirResource = record.fhirResource,
                          let json = try? JSONSerialization.jsonObject(with: fhirResource.data) as? [String: Any]
                    else { continue }

                    let resourceType = json["resourceType"] as? String ?? ""

                    switch identifier {
                    case .medicationRecord:
                        if let med = parseMedication(json: json, resourceType: resourceType) {
                            medications.append(med)
                        }
                    case .conditionRecord:
                        if let cond = parseCondition(json: json) {
                            conditions.append(cond)
                        }
                    case .labResultRecord:
                        if let lab = parseLabResult(json: json) {
                            labResults.append(lab)
                        }
                    case .vitalSignRecord:
                        if let vital = parseVitalSign(json: json) {
                            vitalSigns.append(vital)
                        }
                    case .allergyRecord:
                        if let allergy = parseAllergy(json: json) {
                            allergies.append(allergy)
                        }
                    case .procedureRecord:
                        if let proc = parseProcedure(json: json) {
                            procedures.append(proc)
                        }
                    default:
                        break
                    }
                }
            } catch {
                print("Error reading \(label): \(error)")
            }
        }

        // Read clinical notes if available (iOS 16.4+)
        if #available(iOS 16.4, *) {
            if let noteType = HKObjectType.clinicalType(forIdentifier: .clinicalNoteRecord) {
                await MainActor.run { statusMessage = "Reading Clinical Notes..." }
                do {
                    let records = try await fetchClinicalRecords(type: noteType)
                    for record in records {
                        guard let fhirResource = record.fhirResource,
                              let json = try? JSONSerialization.jsonObject(with: fhirResource.data) as? [String: Any]
                        else { continue }

                        if let note = parseClinicalNote(json: json) {
                            clinicalNotes.append(note)
                        }
                    }
                } catch {
                    print("Error reading clinical notes: \(error)")
                }
            }
        }

        // Build payload
        var data = HealthKitClinicalDataPayload()
        if !medications.isEmpty { data.medications = medications }
        if !conditions.isEmpty { data.conditions = conditions }
        if !labResults.isEmpty { data.labResults = labResults }
        if !vitalSigns.isEmpty { data.vitalSigns = vitalSigns }
        if !allergies.isEmpty { data.allergies = allergies }
        if !procedures.isEmpty { data.procedures = procedures }
        if !clinicalNotes.isEmpty { data.clinicalNotes = clinicalNotes }

        let payload = ClinicalDataPayload(
            patientId: "", // Set by ContentView before syncing
            data: data,
            syncTimestamp: ISO8601DateFormatter().string(from: Date())
        )

        await MainActor.run {
            self.clinicalData = payload
            self.isSyncing = false

            let counts = [
                medications.isEmpty ? nil : "\(medications.count) meds",
                conditions.isEmpty ? nil : "\(conditions.count) conditions",
                labResults.isEmpty ? nil : "\(labResults.count) labs",
                vitalSigns.isEmpty ? nil : "\(vitalSigns.count) vitals",
                allergies.isEmpty ? nil : "\(allergies.count) allergies",
                procedures.isEmpty ? nil : "\(procedures.count) procedures",
                clinicalNotes.isEmpty ? nil : "\(clinicalNotes.count) notes",
            ].compactMap { $0 }.joined(separator: ", ")

            if counts.isEmpty {
                statusMessage = "No clinical records found. Make sure Health Records are connected."
            } else {
                statusMessage = "Found: \(counts)"
            }
        }
    }

    // MARK: - HealthKit Query Helper

    private func fetchClinicalRecords(type: HKClinicalType) async throws -> [HKClinicalRecord] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: nil,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: (samples as? [HKClinicalRecord]) ?? [])
                }
            }
            healthStore.execute(query)
        }
    }

    // MARK: - FHIR Resource Parsers

    private func extractDisplay(_ codeableConcept: [String: Any]?) -> String {
        guard let cc = codeableConcept else { return "Unknown" }
        if let text = cc["text"] as? String { return text }
        if let codings = cc["coding"] as? [[String: Any]] {
            for c in codings {
                if let display = c["display"] as? String { return display }
            }
        }
        return "Unknown"
    }

    private func extractCode(_ codings: [[String: Any]], system: String) -> String? {
        codings.first { ($0["system"] as? String)?.contains(system) == true }?["code"] as? String
    }

    private func parseMedication(json: [String: Any], resourceType: String) -> MedicationSummary? {
        // Name: medicationReference.display → medicationCodeableConcept → contained Medication
        var name: String
        if let medRef = json["medicationReference"] as? [String: Any], let display = medRef["display"] as? String {
            name = display
        } else {
            name = extractDisplay(json["medicationCodeableConcept"] as? [String: Any])
        }
        if name == "Unknown", let contained = json["contained"] as? [[String: Any]] {
            for item in contained {
                if item["resourceType"] as? String == "Medication", let code = item["code"] as? [String: Any] {
                    name = extractDisplay(code)
                    break
                }
            }
        }
        if name == "Unknown" { name = "Unknown medication" }

        // RxNorm: from medicationCodeableConcept or contained Medication
        var rxNormCode: String?
        let medCodings = (json["medicationCodeableConcept"] as? [String: Any])?["coding"] as? [[String: Any]] ?? []
        rxNormCode = extractCode(medCodings, system: "rxnorm")
        if rxNormCode == nil, let contained = json["contained"] as? [[String: Any]] {
            for item in contained {
                if item["resourceType"] as? String == "Medication",
                   let codeCodings = (item["code"] as? [String: Any])?["coding"] as? [[String: Any]] {
                    rxNormCode = extractCode(codeCodings, system: "rxnorm")
                    if rxNormCode != nil { break }
                }
            }
        }

        let dosageKey = resourceType == "MedicationStatement" ? "dosage" : "dosageInstruction"
        let dosage = (json[dosageKey] as? [[String: Any]])?.first

        // Dose: doseQuantity → doseRange
        var dose: String?
        if let doseAndRate = dosage?["doseAndRate"] as? [[String: Any]], let first = doseAndRate.first {
            if let dq = first["doseQuantity"] as? [String: Any] {
                let val = dq["value"] as? NSNumber ?? 0
                let unit = dq["unit"] as? String ?? dq["code"] as? String ?? ""
                dose = "\(val) \(unit)".trimmingCharacters(in: .whitespaces)
            } else if let dr = first["doseRange"] as? [String: Any],
                      let low = (dr["low"] as? [String: Any])?["value"] as? NSNumber,
                      let high = (dr["high"] as? [String: Any])?["value"] as? NSNumber {
                let unit = (dr["low"] as? [String: Any])?["unit"] as? String ?? ""
                dose = low == high ? "\(low) \(unit)".trimmingCharacters(in: .whitespaces)
                                   : "\(low)-\(high) \(unit)".trimmingCharacters(in: .whitespaces)
            }
        }

        // Route
        let route = (dosage?["route"] as? [String: Any])?["text"] as? String

        // Frequency: normalized from timing
        var frequency: String?
        if let timing = dosage?["timing"] as? [String: Any] {
            if let codeText = (timing["code"] as? [String: Any])?["text"] as? String {
                frequency = codeText
            } else if let rep = timing["repeat"] as? [String: Any],
                      let freq = rep["frequency"] as? Int,
                      let period = rep["period"] as? NSNumber,
                      let periodUnit = rep["periodUnit"] as? String {
                if periodUnit == "d" && period.intValue == 1 {
                    frequency = freq == 1 ? "once daily" : freq == 2 ? "twice daily" : "\(freq) times daily"
                } else if periodUnit == "h" {
                    frequency = "every \(period) hours"
                } else if periodUnit == "min" {
                    frequency = "every \(period) minutes"
                } else {
                    frequency = "\(freq) times per \(period) \(periodUnit)"
                }
            }
        }

        // PRN
        let prn = dosage?["asNeededBoolean"] as? Bool == true ? true : nil

        // Sig (full prescriber sig, verbatim)
        let sig = dosage?["text"] as? String

        // Instructions (clinical notes from sig, excluding first line and dispensing)
        var instructions: String?
        if let sigText = sig {
            let lines = sigText.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            if lines.count > 1 {
                let instrLines = Array(lines.dropFirst()).filter { line in
                    let lower = line.lowercased()
                    if lower.hasPrefix("disp-") || lower.hasPrefix("disp–") || lower.hasPrefix("disp—") { return false }
                    if lower.hasPrefix("use rx discount") { return false }
                    if lower.range(of: "bin:\\d+.*pcn:", options: .regularExpression) != nil { return false }
                    return true
                }
                if !instrLines.isEmpty {
                    instructions = instrLines.joined(separator: "\n")
                }
            }
        }

        // Dispensing from dispenseRequest
        var dispensing: String?
        if let dr = json["dispenseRequest"] as? [String: Any] {
            var parts: [String] = []
            if let qty = dr["quantity"] as? [String: Any] {
                parts.append("\(qty["value"] as? NSNumber ?? 0) \(qty["unit"] as? String ?? "")")
            }
            if let dur = dr["expectedSupplyDuration"] as? [String: Any] {
                parts.append("\(dur["value"] as? NSNumber ?? 0)-\((dur["unit"] as? String ?? "day").lowercased()) supply")
            }
            if let refills = dr["numberOfRepeatsAllowed"] as? Int {
                parts.append("\(refills) refills")
            }
            if !parts.isEmpty { dispensing = parts.joined(separator: ", ") }
        }

        let status = json["status"] as? String ?? "active"

        return MedicationSummary(
            name: name,
            dose: dose,
            route: route,
            frequency: frequency,
            prn: prn,
            rxNormCode: rxNormCode,
            status: ["active", "on-hold"].contains(status) ? status : (status == "stopped" || status == "completed" ? "stopped" : "active"),
            startDate: json["authoredOn"] as? String ?? json["dateAsserted"] as? String,
            sig: sig,
            instructions: instructions,
            dispensing: dispensing
        )
    }

    private func parseCondition(json: [String: Any]) -> ConditionSummary? {
        let code = json["code"] as? [String: Any]
        let displayName = extractDisplay(code)
        let codings = code?["coding"] as? [[String: Any]] ?? []
        let icd10Code = extractCode(codings, system: "icd")
        let snomedCode = extractCode(codings, system: "snomed")

        let clinicalStatus: String
        if let csObj = json["clinicalStatus"] as? [String: Any],
           let csCoding = (csObj["coding"] as? [[String: Any]])?.first {
            clinicalStatus = csCoding["code"] as? String ?? "active"
        } else {
            clinicalStatus = "active"
        }

        return ConditionSummary(
            displayName: displayName,
            icd10Code: icd10Code,
            snomedCode: snomedCode,
            clinicalStatus: clinicalStatus,
            onsetDate: json["onsetDateTime"] as? String
        )
    }

    private func parseLabResult(json: [String: Any]) -> LabResultSummary? {
        let code = json["code"] as? [String: Any]
        let name = extractDisplay(code)
        let codings = code?["coding"] as? [[String: Any]] ?? []
        let loincCode = extractCode(codings, system: "loinc")

        var value: String
        var units: String?
        if let vq = json["valueQuantity"] as? [String: Any] {
            value = "\(vq["value"] as? NSNumber ?? 0)"
            units = vq["unit"] as? String ?? vq["code"] as? String
        } else if let vs = json["valueString"] as? String {
            value = vs
        } else {
            return nil
        }

        var referenceRange: String?
        if let rrs = json["referenceRange"] as? [[String: Any]], let rr = rrs.first {
            if let text = rr["text"] as? String {
                referenceRange = text
            } else if let low = rr["low"] as? [String: Any], let high = rr["high"] as? [String: Any] {
                referenceRange = "\(low["value"] ?? "")-\(high["value"] ?? "")"
            }
        }

        let isAbnormal: Bool?
        if let interp = json["interpretation"] as? [[String: Any]],
           let interpCode = (interp.first?["coding"] as? [[String: Any]])?.first?["code"] as? String {
            isAbnormal = !["N", "normal"].contains(interpCode)
        } else {
            isAbnormal = nil
        }

        return LabResultSummary(
            name: name,
            value: value,
            units: units,
            referenceRange: referenceRange,
            loincCode: loincCode,
            collectionDate: json["effectiveDateTime"] as? String ?? json["issued"] as? String,
            isAbnormal: isAbnormal
        )
    }

    private func parseVitalSign(json: [String: Any]) -> VitalSignSummary? {
        let code = json["code"] as? [String: Any]
        let name = extractDisplay(code)
        let codings = code?["coding"] as? [[String: Any]] ?? []
        let loincCode = extractCode(codings, system: "loinc")

        var value: String
        var units: String?

        if let components = json["component"] as? [[String: Any]], !components.isEmpty {
            let parts = components.map { c -> String in
                let cName = extractDisplay(c["code"] as? [String: Any])
                let cVal = (c["valueQuantity"] as? [String: Any])?["value"] as? NSNumber ?? 0
                let cUnit = (c["valueQuantity"] as? [String: Any])?["unit"] as? String ?? ""
                return "\(cName): \(cVal) \(cUnit)".trimmingCharacters(in: .whitespaces)
            }
            value = parts.joined(separator: ", ")
        } else if let vq = json["valueQuantity"] as? [String: Any] {
            value = "\(vq["value"] as? NSNumber ?? 0)"
            units = vq["unit"] as? String ?? vq["code"] as? String
        } else {
            return nil
        }

        return VitalSignSummary(
            name: name,
            value: value,
            units: units,
            loincCode: loincCode,
            recordedDate: json["effectiveDateTime"] as? String
        )
    }

    private func parseAllergy(json: [String: Any]) -> AllergySummary? {
        let code = json["code"] as? [String: Any]
        let substance = extractDisplay(code)

        var reaction: String?
        var severity: String?
        if let reactions = json["reaction"] as? [[String: Any]], let first = reactions.first {
            if let manifestations = first["manifestation"] as? [[String: Any]] {
                reaction = manifestations.map { extractDisplay($0) }.joined(separator: ", ")
            }
            severity = first["severity"] as? String
        }

        return AllergySummary(
            substance: substance,
            reaction: reaction,
            severity: severity,
            onsetDate: json["onsetDateTime"] as? String
        )
    }

    private func parseProcedure(json: [String: Any]) -> ProcedureSummary? {
        let code = json["code"] as? [String: Any]
        let name = extractDisplay(code)
        let codings = code?["coding"] as? [[String: Any]] ?? []
        let cptCode = extractCode(codings, system: "cpt")
        let snomedCode = extractCode(codings, system: "snomed")

        return ProcedureSummary(
            name: name,
            date: json["performedDateTime"] as? String,
            cptCode: cptCode,
            snomedCode: snomedCode
        )
    }

    private func parseClinicalNote(json: [String: Any]) -> ClinicalNoteSummary? {
        let typeObj = json["type"] as? [String: Any]
        let title = extractDisplay(typeObj)
        let date = json["date"] as? String ?? ""

        var author: String?
        if let authors = json["author"] as? [[String: Any]], let first = authors.first {
            author = first["display"] as? String
        }

        var narrativeText = ""
        if let contents = json["content"] as? [[String: Any]] {
            for content in contents {
                if let attachment = content["attachment"] as? [String: Any] {
                    if let data = attachment["data"] as? String,
                       let decoded = Data(base64Encoded: data),
                       let text = String(data: decoded, encoding: .utf8) {
                        narrativeText = text
                        break
                    }
                }
            }
        }
        if narrativeText.isEmpty, let text = json["text"] as? [String: Any], let div = text["div"] as? String {
            narrativeText = div.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        }

        guard !narrativeText.isEmpty else { return nil }

        return ClinicalNoteSummary(
            title: title,
            date: date,
            author: author,
            narrativeText: narrativeText,
            encounterType: nil
        )
    }
}
