import Foundation
import Combine

/// Debounced patient name autocomplete against the backend.
class PatientSearchService: ObservableObject {
    @Published var suggestions: [PatientSuggestion] = []
    @Published var isSearching = false

    private var searchTask: Task<Void, Never>?

    struct PatientSuggestion: Codable, Identifiable {
        let id: String
        let firstName: String
        let lastName: String

        var fullName: String { "\(firstName) \(lastName)" }
    }

    /// Search for patients matching the query (debounced 300ms).
    func search(query: String) {
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count < 2 {
            suggestions = []
            return
        }

        searchTask = Task {
            // Debounce
            try? await Task.sleep(nanoseconds: 300_000_000)
            if Task.isCancelled { return }

            await MainActor.run { isSearching = true }

            do {
                let results = try await APIClient.searchPatients(query: trimmed)
                if !Task.isCancelled {
                    await MainActor.run {
                        self.suggestions = results
                        self.isSearching = false
                    }
                }
            } catch {
                if !Task.isCancelled {
                    await MainActor.run { self.isSearching = false }
                }
            }
        }
    }

    func clear() {
        searchTask?.cancel()
        suggestions = []
    }
}
