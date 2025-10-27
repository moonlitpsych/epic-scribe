import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Epic Scribe
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Psychiatry Note Generator with Epic SmartTools Integration
        </p>

        <div className="grid gap-6">
          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
            <p className="text-gray-600 mb-4">
              Epic Scribe transforms clinical transcripts into Epic-ready psychiatry notes
              with perfect SmartTools formatting. Select your setting and visit type to begin.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>100% Epic SmartTools Compatible</span>
            </div>
          </div>

          {/* Demo Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
            <h2 className="text-2xl font-semibold mb-4 text-blue-900">SmartTools Demo</h2>
            <p className="text-gray-700 mb-4">
              Try our SmartTools parser and transformer. See how Epic elements like @SmartLinks@,
              .DotPhrases, wildcards (***), and SmartLists are identified and transformed in real-time.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <span>Launch Demo</span>
              <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </Link>
          </div>

          {/* Template Manager Card */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border border-purple-200">
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">Template Manager</h2>
            <p className="text-gray-700 mb-4">
              Manage and customize Epic note templates for all 12 configurations. Edit sections, preview SmartTools,
              and ensure perfect formatting for each setting and visit type.
            </p>
            <Link
              href="/templates"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <span>Manage Templates</span>
              <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </Link>
          </div>

          {/* SmartList Manager Card */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg shadow-md p-6 border border-green-200">
            <h2 className="text-2xl font-semibold mb-4 text-green-900">SmartList Manager</h2>
            <p className="text-gray-700 mb-4">
              Define and manage Epic SmartList option sets. Edit values, set defaults, and ensure consistency
              with your Epic configuration for Mental Status Exam, Psychiatric ROS, and custom SmartLists.
            </p>
            <Link
              href="/smartlists"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <span>Manage SmartLists</span>
              <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </Link>
          </div>

          {/* Encounters Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-md p-6 border border-indigo-200">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-900">Encounters</h2>
            <p className="text-gray-700 mb-4">
              View your upcoming calendar appointments, launch Google Meet sessions, and automatically ingest
              transcripts from Google Drive. Zero copy-paste workflow from encounter to note.
            </p>
            <Link
              href="/encounters"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <span>View Encounters</span>
              <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </Link>
          </div>

          {/* Note Generator Card */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow-md p-6 border border-orange-200">
            <h2 className="text-2xl font-semibold mb-4 text-orange-900">Generate Epic Note</h2>
            <p className="text-gray-700 mb-4">
              Transform clinical transcripts into Epic-ready psychiatry notes. Select your setting and visit type,
              paste a transcript, and generate a fully formatted note with SmartTools integration.
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <span>Generate Note</span>
              <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </Link>
          </div>

          {/* Status Card */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Development Status</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">SmartTools Engine:</span>
                <div className="flex items-center">
                  <div className="h-2 w-24 bg-green-500 rounded-full"></div>
                  <span className="ml-2 text-sm text-green-600">Complete</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Template System:</span>
                <div className="flex items-center">
                  <div className="h-2 w-24 bg-green-500 rounded-full"></div>
                  <span className="ml-2 text-sm text-green-600">Complete</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Prompt Builder:</span>
                <div className="flex items-center">
                  <div className="h-2 w-24 bg-green-500 rounded-full"></div>
                  <span className="ml-2 text-sm text-green-600">Complete</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Gemini AI:</span>
                <div className="flex items-center">
                  <div className="h-2 w-24 bg-green-500 rounded-full"></div>
                  <span className="ml-2 text-sm text-green-600">Complete</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Note Generation:</span>
                <div className="flex items-center">
                  <div className="h-2 w-24 bg-yellow-500 rounded-full"></div>
                  <span className="ml-2 text-sm text-yellow-600">Testing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}