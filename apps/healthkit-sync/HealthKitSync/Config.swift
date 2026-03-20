import Foundation

enum Config {
    // Change to production URL when testing against Vercel
    static let apiBaseURL = "https://epic-scribe.vercel.app"
    // static let apiBaseURL = "http://localhost:3002"  // Uncomment for local dev

    static let healthKitSyncEndpoint = "\(apiBaseURL)/api/clinical-data/healthkit"
    static let transcriptSyncEndpoint = "\(apiBaseURL)/api/transcripts/sync"
    static let patientSearchEndpoint = "\(apiBaseURL)/api/transcripts/patients"
    static let apiKey = "0f72604d16001fe62ae158c0e5479556111199d7e138bf9eb61c4ea593994187"
}
