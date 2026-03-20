import SwiftUI

/// HealthKit clinical data sync tab — authorize, pair, dashboard.
/// Extracted from the original ContentView (unchanged functionality).
struct HealthKitView: View {
    @EnvironmentObject var healthKit: HealthKitManager
    @EnvironmentObject var syncManager: SyncManager

    @State private var scannedCode: String?
    @State private var showScanner = false
    @State private var showManualEntry = false
    @State private var manualPatientId = ""
    @State private var pairedPatient: ScannedPatient? = ScannedPatient.loadSaved()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 4) {
                        Text("Epic Scribe")
                            .font(.title.bold())
                        Text("HealthKit Clinical Data Sync")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    if !healthKit.isAuthorized {
                        authorizeView
                    } else if pairedPatient == nil {
                        pairingView
                    } else {
                        dashboardView
                    }

                    Spacer(minLength: 40)
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .sheet(isPresented: $showScanner) {
            QRScannerView(scannedCode: $scannedCode)
        }
        .onChange(of: scannedCode) { newValue in
            guard let code = newValue else { return }
            let patient: ScannedPatient
            if let parsed = ScannedPatient.from(qrString: code) {
                patient = parsed
            } else {
                patient = ScannedPatient(id: code, name: "Scanned Patient")
            }
            patient.save()
            pairedPatient = patient
            Task { await syncManager.performSync() }
        }
    }

    // MARK: - Authorize

    private var authorizeView: some View {
        GroupBox("Authorize HealthKit") {
            VStack(alignment: .leading, spacing: 8) {
                Text("Grants read access to your clinical records (medications, conditions, labs, vitals, allergies).")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Button(action: { healthKit.requestAuthorization() }) {
                    Label("Authorize Health Records", systemImage: "heart.text.square")
                }
                .buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Pair Patient

    private var pairingView: some View {
        GroupBox("Link Patient") {
            VStack(alignment: .leading, spacing: 12) {
                Text("Scan the QR code shown on your provider's screen to link your health records.")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Button(action: { showScanner = true }) {
                    Label("Scan QR Code", systemImage: "qrcode.viewfinder")
                }
                .buttonStyle(.borderedProminent)

                if showManualEntry {
                    TextField("Patient UUID", text: $manualPatientId)
                        .textFieldStyle(.roundedBorder)
                        .font(.system(.caption, design: .monospaced))
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    Button(action: {
                        let id = manualPatientId.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !id.isEmpty else { return }
                        let patient = ScannedPatient(id: id, name: "Manual Entry")
                        patient.save()
                        pairedPatient = patient
                        Task { await syncManager.performSync() }
                    }) {
                        Text("Use UUID")
                            .font(.caption)
                    }
                    .disabled(manualPatientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                } else {
                    Button(action: { showManualEntry = true }) {
                        Text("Enter UUID manually")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Dashboard

    private var dashboardView: some View {
        VStack(spacing: 16) {
            if let patient = pairedPatient {
                GroupBox {
                    HStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title)
                            .foregroundColor(.accentColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(patient.name)
                                .font(.headline)
                            Text("Paired")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Button(action: unpair) {
                            Text("Unpair")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                } label: {
                    Label("Patient", systemImage: "person.fill")
                }
            }

            GroupBox {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.secondary)
                        if let lastSync = syncManager.lastSyncDate {
                            Text("Last synced \(lastSync, style: .relative) ago")
                                .font(.callout)
                        } else {
                            Text("Not synced yet")
                                .font(.callout)
                                .foregroundColor(.secondary)
                        }
                    }

                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(.green)
                        Text("Auto-sync enabled")
                            .font(.callout)
                    }

                    if let result = syncManager.lastSyncResult {
                        HStack(alignment: .top) {
                            switch result {
                            case .success(let summary):
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text(summary)
                                    .font(.caption)
                            case .error(let message):
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(message)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } label: {
                Label("Sync Status", systemImage: "arrow.up.arrow.down")
            }

            Button(action: {
                Task { await syncManager.performSync() }
            }) {
                Label(syncManager.isSyncing ? "Syncing..." : "Sync Now",
                      systemImage: "arrow.clockwise")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .disabled(syncManager.isSyncing)

            if let data = healthKit.clinicalData?.data {
                GroupBox {
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
                                Text("  \(lab.name): \(lab.value) \(lab.units ?? "")")
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
                } label: {
                    Label("Clinical Data", systemImage: "heart.text.square")
                }
            }
        }
    }

    private func unpair() {
        ScannedPatient.clearSaved()
        pairedPatient = nil
        scannedCode = nil
    }
}
