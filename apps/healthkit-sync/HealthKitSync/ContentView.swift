import SwiftUI

struct ContentView: View {
    @StateObject private var healthKit = HealthKitManager()
    @State private var patientId = ""
    @State private var syncResult: String?
    @State private var isSyncing = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 4) {
                        Text("Epic Scribe")
                            .font(.title.bold())
                        Text("HealthKit Clinical Data Sync")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Status
                    GroupBox("Status") {
                        Text(healthKit.statusMessage)
                            .font(.callout)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Step 1: Authorize
                    GroupBox("Step 1: Authorize HealthKit") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Grants read access to your clinical records (medications, conditions, labs, vitals, allergies).")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Button(action: { healthKit.requestAuthorization() }) {
                                Label(healthKit.isAuthorized ? "Authorized" : "Authorize Health Records",
                                      systemImage: healthKit.isAuthorized ? "checkmark.circle.fill" : "heart.text.square")
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(healthKit.isAuthorized ? .green : .blue)
                            .disabled(healthKit.isAuthorized)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Step 2: Read records
                    GroupBox("Step 2: Read Clinical Records") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Reads FHIR resources from Apple Health and transforms them for Epic Scribe.")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Button(action: {
                                Task { await healthKit.readAllClinicalRecords() }
                            }) {
                                Label(healthKit.isSyncing ? "Reading..." : "Read Records",
                                      systemImage: "arrow.down.doc")
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(!healthKit.isAuthorized || healthKit.isSyncing)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Data preview
                    if let data = healthKit.clinicalData?.data {
                        GroupBox("Clinical Data Preview") {
                            VStack(alignment: .leading, spacing: 6) {
                                if let meds = data.medications, !meds.isEmpty {
                                    SectionHeader(title: "Medications", count: meds.count)
                                    ForEach(meds.prefix(5)) { med in
                                        Text("  \(med.name) \(med.dose ?? "") \(med.frequency ?? "")")
                                            .font(.caption)
                                    }
                                    if meds.count > 5 { Text("  ... and \(meds.count - 5) more").font(.caption).foregroundColor(.secondary) }
                                }
                                if let conds = data.conditions, !conds.isEmpty {
                                    SectionHeader(title: "Conditions", count: conds.count)
                                    ForEach(conds.prefix(5)) { cond in
                                        Text("  \(cond.displayName) \(cond.icd10Code.map { "(\($0))" } ?? "")")
                                            .font(.caption)
                                    }
                                    if conds.count > 5 { Text("  ... and \(conds.count - 5) more").font(.caption).foregroundColor(.secondary) }
                                }
                                if let labs = data.labResults, !labs.isEmpty {
                                    SectionHeader(title: "Lab Results", count: labs.count)
                                    ForEach(labs.prefix(5)) { lab in
                                        Text("  \(lab.name): \(lab.value) \(lab.units ?? "") \(lab.isAbnormal == true ? "⚠️" : "")")
                                            .font(.caption)
                                    }
                                    if labs.count > 5 { Text("  ... and \(labs.count - 5) more").font(.caption).foregroundColor(.secondary) }
                                }
                                if let vitals = data.vitalSigns, !vitals.isEmpty {
                                    SectionHeader(title: "Vital Signs", count: vitals.count)
                                    ForEach(vitals.prefix(3)) { vital in
                                        Text("  \(vital.name): \(vital.value) \(vital.units ?? "")")
                                            .font(.caption)
                                    }
                                }
                                if let allergies = data.allergies, !allergies.isEmpty {
                                    SectionHeader(title: "Allergies", count: allergies.count)
                                    ForEach(allergies) { allergy in
                                        Text("  \(allergy.substance) \(allergy.reaction.map { "— \($0)" } ?? "")")
                                            .font(.caption)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    // Step 3: Sync to Epic Scribe
                    GroupBox("Step 3: Sync to Epic Scribe") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Enter the patient UUID from Epic Scribe, then sync.")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            TextField("Patient UUID", text: $patientId)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                                .autocapitalization(.none)
                                .disableAutocorrection(true)

                            Button(action: { Task { await syncToEpicScribe() } }) {
                                Label(isSyncing ? "Syncing..." : "Sync to Epic Scribe",
                                      systemImage: "arrow.up.circle")
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.orange)
                            .disabled(healthKit.clinicalData == nil || patientId.isEmpty || isSyncing)

                            if let result = syncResult {
                                Text(result)
                                    .font(.caption)
                                    .foregroundColor(result.contains("Success") ? .green : .red)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Spacer(minLength: 40)
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func syncToEpicScribe() async {
        guard var payload = healthKit.clinicalData else { return }
        payload.patientId = patientId

        isSyncing = true
        syncResult = nil

        do {
            let response = try await APIClient.syncClinicalData(payload)
            if let types = response.syncedTypes {
                let summary = types.map { "\($0.value) \($0.key)" }.joined(separator: ", ")
                syncResult = "Success! Synced: \(summary)"
            } else {
                syncResult = "Success!"
            }
        } catch {
            syncResult = "Error: \(error.localizedDescription)"
        }

        isSyncing = false
    }
}

struct SectionHeader: View {
    let title: String
    let count: Int

    var body: some View {
        Text("\(title) (\(count))")
            .font(.caption.bold())
            .foregroundColor(.accentColor)
            .padding(.top, 4)
    }
}

#Preview {
    ContentView()
}
