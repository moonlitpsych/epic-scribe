import SwiftUI

/// Main recording UI tab — enter patient name, record, transcribe, sync.
struct RecordingView: View {
    @EnvironmentObject var recordingManager: RecordingManager
    @EnvironmentObject var transcriptionManager: TranscriptionManager
    @EnvironmentObject var transcriptSync: TranscriptSyncManager
    @StateObject private var patientSearch = PatientSearchService()

    @State private var patientName = ""
    @State private var selectedPatientId: String?
    @State private var recordingStartTime: Date?
    @State private var audioFileURL: URL?
    @State private var showTranscript = false
    @State private var phase: RecordingPhase = .idle

    enum RecordingPhase {
        case idle
        case recording
        case transcribing
        case done
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    headerView
                    modelStatusView
                    patientNameSection
                    recordingSection
                    recentTranscriptsSection
                    Spacer(minLength: 40)
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Header

    private var headerView: some View {
        VStack(spacing: 4) {
            Text("Epic Scribe")
                .font(.title.bold())
            Text("Visit Recorder")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.top)
    }

    // MARK: - Model Status

    private var modelStatusView: some View {
        Group {
            if let error = transcriptionManager.modelLoadError {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Whisper: \(error)")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            } else if !transcriptionManager.isModelLoaded {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text(transcriptionManager.transcriptionProgress.isEmpty
                         ? "Loading Whisper model..."
                         : transcriptionManager.transcriptionProgress)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Whisper ready")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    // MARK: - Patient Name

    private var patientNameSection: some View {
        GroupBox("Patient") {
            VStack(alignment: .leading, spacing: 8) {
                TextField("Patient name", text: $patientName)
                    .textFieldStyle(.roundedBorder)
                    .autocapitalization(.words)
                    .disableAutocorrection(true)
                    .onChange(of: patientName) { newValue in
                        selectedPatientId = nil
                        patientSearch.search(query: newValue)
                    }

                // Autocomplete suggestions
                if !patientSearch.suggestions.isEmpty && selectedPatientId == nil {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(patientSearch.suggestions) { patient in
                            Button(action: {
                                patientName = patient.fullName
                                selectedPatientId = patient.id
                                patientSearch.clear()
                            }) {
                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.accentColor)
                                        .font(.caption)
                                    Text(patient.fullName)
                                        .font(.callout)
                                    Spacer()
                                }
                                .padding(.vertical, 6)
                                .padding(.horizontal, 8)
                            }
                            .buttonStyle(.plain)
                            Divider()
                        }
                    }
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }

                if let id = selectedPatientId {
                    HStack {
                        Image(systemName: "link")
                            .foregroundColor(.green)
                            .font(.caption2)
                        Text("Linked to patient record")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Recording

    private var recordingSection: some View {
        GroupBox("Record") {
            VStack(spacing: 16) {
                switch phase {
                case .idle:
                    idleView
                case .recording:
                    recordingActiveView
                case .transcribing:
                    transcribingView
                case .done:
                    doneView
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var idleView: some View {
        VStack(spacing: 12) {
            Button(action: startRecording) {
                Label("Record Visit", systemImage: "mic.fill")
                    .font(.title2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
            .disabled(patientName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                      || !transcriptionManager.isModelLoaded)

            if patientName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
                Text("Enter patient name to start recording")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var recordingActiveView: some View {
        VStack(spacing: 16) {
            // Timer
            Text(recordingManager.formattedDuration)
                .font(.system(size: 48, weight: .light, design: .monospaced))
                .foregroundColor(.red)

            // Waveform bars
            HStack(spacing: 3) {
                ForEach(0..<20, id: \.self) { i in
                    let height = waveformHeight(for: i)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.red.opacity(0.7))
                        .frame(width: 4, height: height)
                        .animation(.easeInOut(duration: 0.05), value: recordingManager.audioLevel)
                }
            }
            .frame(height: 40)

            // Recording indicator
            HStack {
                Circle()
                    .fill(Color.red)
                    .frame(width: 10, height: 10)
                    .opacity(recordingManager.elapsedSeconds % 2 == 0 ? 1 : 0.3)
                Text("Recording...")
                    .font(.callout)
                    .foregroundColor(.red)
            }

            Button(action: stopRecording) {
                Label("Stop", systemImage: "stop.fill")
                    .font(.title3)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .tint(.gray)
        }
    }

    private var transcribingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.2)
            Text(transcriptionManager.transcriptionProgress.isEmpty
                 ? "Transcribing..."
                 : transcriptionManager.transcriptionProgress)
                .font(.callout)
                .foregroundColor(.secondary)
            Text("Audio stays on this device")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 20)
    }

    private var doneView: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)
                Text("Transcription Complete")
                    .font(.headline)
            }

            // Word count + duration
            HStack(spacing: 16) {
                Label("\(transcriptionManager.transcript.split(separator: " ").count) words",
                      systemImage: "text.word.spacing")
                    .font(.caption)
                if let start = recordingStartTime {
                    let seconds = Int(Date().timeIntervalSince(start))
                    Label("\(seconds / 60)m \(seconds % 60)s recorded",
                          systemImage: "clock")
                        .font(.caption)
                }
            }
            .foregroundColor(.secondary)

            // Sync status
            if let pending = transcriptSync.pendingTranscripts.first {
                HStack {
                    if pending.synced {
                        Image(systemName: "checkmark.icloud.fill")
                            .foregroundColor(.green)
                        Text("Synced to Epic Scribe")
                            .font(.caption)
                            .foregroundColor(.green)
                    } else if transcriptSync.isSyncing {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Syncing...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Image(systemName: "exclamationmark.icloud")
                            .foregroundColor(.orange)
                        Text("Pending sync")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
            }

            // Transcript preview
            if showTranscript {
                ScrollView {
                    Text(transcriptionManager.transcript)
                        .font(.caption)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                }
                .frame(maxHeight: 200)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }

            HStack(spacing: 12) {
                Button(action: { showTranscript.toggle() }) {
                    Label(showTranscript ? "Hide" : "Preview",
                          systemImage: showTranscript ? "eye.slash" : "eye")
                        .font(.caption)
                }
                .buttonStyle(.bordered)

                Button(action: newRecording) {
                    Label("New Recording", systemImage: "mic.badge.plus")
                        .font(.caption)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: - Recent Transcripts

    private var recentTranscriptsSection: some View {
        Group {
            if !transcriptSync.pendingTranscripts.isEmpty {
                GroupBox("Recent") {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(transcriptSync.pendingTranscripts.prefix(5)) { t in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(t.patientName)
                                        .font(.callout.bold())
                                    HStack(spacing: 8) {
                                        Text("\(t.wordCount) words")
                                        Text("\(t.durationSeconds / 60)m")
                                        Text(t.recordedAt, style: .relative)
                                    }
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: t.synced ? "checkmark.icloud.fill" : "icloud.slash")
                                    .foregroundColor(t.synced ? .green : .orange)
                                    .font(.caption)
                            }
                            Divider()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    // MARK: - Actions

    private func startRecording() {
        recordingStartTime = Date()
        showTranscript = false
        transcriptionManager.clear()

        Task {
            let started = await recordingManager.startRecording()
            if started {
                phase = .recording
            }
        }
    }

    private func stopRecording() {
        guard let url = recordingManager.stopRecording() else { return }
        audioFileURL = url
        phase = .transcribing

        Task {
            if let text = await transcriptionManager.transcribe(audioURL: url) {
                phase = .done

                // Queue for sync
                transcriptSync.queue(
                    patientName: patientName.trimmingCharacters(in: .whitespacesAndNewlines),
                    patientId: selectedPatientId,
                    transcript: text,
                    durationSeconds: recordingManager.elapsedSeconds,
                    recordedAt: recordingStartTime ?? Date(),
                    transcribedAt: Date()
                )

                // Clean up audio file
                recordingManager.deleteRecording()
            } else {
                // Transcription failed — go back to idle
                phase = .idle
            }
        }
    }

    private func newRecording() {
        phase = .idle
        patientName = ""
        selectedPatientId = nil
        showTranscript = false
        transcriptionManager.clear()
    }

    // MARK: - Helpers

    private func waveformHeight(for index: Int) -> CGFloat {
        let base = CGFloat(recordingManager.audioLevel)
        let variance = sin(Double(index) * 0.8 + Double(recordingManager.elapsedSeconds) * 2) * 0.3
        let height = max(4, (base + CGFloat(variance)) * 40)
        return min(height, 40)
    }
}

#Preview {
    RecordingView()
        .environmentObject(RecordingManager())
        .environmentObject(TranscriptionManager())
        .environmentObject(TranscriptSyncManager())
}
