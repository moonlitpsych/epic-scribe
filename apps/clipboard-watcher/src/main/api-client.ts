/**
 * API Client for Epic Scribe
 *
 * Communicates with the Epic Scribe web app to import prior notes.
 */

interface ImportRequest {
  noteContent: string;
  patientFirstName: string;
  patientLastName: string;
  dateOfBirth?: string;
  age?: number;
  setting?: string;
  noteDate?: string;
  providerName?: string;
  importSource?: string;
}

interface ImportResponse {
  success: boolean;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    isNewPatient: boolean;
  };
  priorNote: {
    id: string;
    isDuplicate: boolean;
  };
  message: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async importPriorNote(request: ImportRequest): Promise<ImportResponse> {
    const url = `${this.baseUrl}/api/prior-notes/import`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        importSource: 'clipboard_watcher',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/patients`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
