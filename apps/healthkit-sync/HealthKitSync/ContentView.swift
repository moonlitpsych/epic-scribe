import SwiftUI

struct ContentView: View {
    @EnvironmentObject var healthKit: HealthKitManager
    @EnvironmentObject var syncManager: SyncManager
    @Environment(\.scenePhase) private var scenePhase

    @State private var scannedCode: String?
    @State private var showScanner = false
    @State private var showManualEntry = false
    @State private var manualPatientId = ""
    @State private var pairedPatient: ScannedPatient? = ScannedPatient.loadSaved()
    @State private var showSyncSuccess = false
    @State private var showUnpairConfirmation = false

    var body: some View {
        TabView {
            RecordingView()
                .tabItem {
                    Label("Record", systemImage: "mic.fill")
                }

            HealthKitView()
                .tabItem {
                    Label("Health Data", systemImage: "heart.text.square")
                }
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .active, pairedPatient != nil, healthKit.isAuthorized {
                Task { await syncManager.performSync() }
            }
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
            // Auto-sync immediately after pairing
            Task { await syncManager.performSync() }
        }
    }

    // MARK: - Step 1: Authorize

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

    // MARK: - Step 2: Pair Patient

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

                // Manual entry fallback
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

    // MARK: - Dashboard (Paired)

    private var dashboardView: some View {
        VStack(spacing: 16) {
            // Patient card
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
                        Button(action: { showUnpairConfirmation = true }) {
                            Text("Unpair")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        .alert("Unpair Patient?", isPresented: $showUnpairConfirmation) {
                            Button("Cancel", role: .cancel) {}
                            Button("Unpair", role: .destructive) { unpair() }
                        } message: {
                            Text("This will disconnect your health records from \(patient.name). You can re-pair by scanning a new QR code.")
                        }
                    }
                } label: {
                    Label("Patient", systemImage: "person.fill")
                }
            }

            // Sync status
            GroupBox {
                VStack(alignment: .leading, spacing: 8) {
                    // Last sync time
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

                    // Auto-sync indicator
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(.green)
                        Text("Auto-sync enabled")
                            .font(.callout)
                    }

                    // Last result
                    if let result = syncManager.lastSyncResult {
                        HStack(alignment: .top) {
                            switch result {
                            case .success(let summary):
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text(summary)
                                    .font(.caption)
                            case .error(let message):
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(alignment: .top) {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text(message)
                                            .font(.caption)
                                            .foregroundColor(.red)
                                    }
                                    Text("Tap 'Sync Now' to try again")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }

                    // Success checkmark animation
                    if showSyncSuccess {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.title2)
                            Text("Sync complete!")
                                .font(.callout)
                                .foregroundColor(.green)
                        }
                        .transition(.opacity.combined(with: .scale))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } label: {
                Label("Sync Status", systemImage: "arrow.up.arrow.down")
            }

            // Sync Now button
            Button(action: {
                Task {
                    let success = await syncManager.performSync()
                    if success {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            showSyncSuccess = true
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            withAnimation(.easeOut(duration: 0.5)) {
                                showSyncSuccess = false
                            }
                        }
                    }
                }
            }) {
                HStack(spacing: 8) {
                    if syncManager.isSyncing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    }
                    Label(syncManager.isSyncing ? "Syncing..." : "Sync Now",
                          systemImage: syncManager.isSyncing ? "" : "arrow.clockwise")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .disabled(syncManager.isSyncing)

            // Clinical data preview
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
}

#Preview {
    ContentView()
        .environmentObject(HealthKitManager())
        .environmentObject(SyncManager(healthKit: HealthKitManager()))
        .environmentObject(RecordingManager())
        .environmentObject(TranscriptionManager())
        .environmentObject(TranscriptSyncManager())
}
