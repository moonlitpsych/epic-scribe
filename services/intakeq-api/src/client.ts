/**
 * IntakeQ API Client
 * Handles communication with the IntakeQ REST API
 *
 * API Docs:
 * - Clients: https://support.intakeq.com/article/251-intakeq-client-api
 * - Notes: https://support.intakeq.com/article/342-intakeq-notes-api
 */

import {
  IntakeQApiConfig,
  IntakeQClient,
  IntakeQNoteSummary,
  IntakeQFullNote,
  GetClientNotesOptions,
} from './types';

const DEFAULT_BASE_URL = 'https://intakeq.com/api/v1';

export class IntakeQApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: IntakeQApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Make an authenticated request to the IntakeQ API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Key': this.apiKey,
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new IntakeQApiError(
        `IntakeQ API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json();
  }

  /**
   * Search for a client by email address
   * IntakeQ API: GET /clients?search=<email>&includeProfile=true
   * Returns null if not found
   */
  async getClientByEmail(email: string): Promise<IntakeQClient | null> {
    try {
      // IntakeQ uses 'search' param (not 'email') and needs includeProfile for ClientId
      const url = `/clients?search=${encodeURIComponent(email)}&includeProfile=true`;

      const clients = await this.request<any[]>(url);

      if (clients && clients.length > 0) {
        const raw = clients[0];
        // IntakeQ returns PascalCase fields
        return {
          ClientId: raw.ClientId,
          ClientName: raw.Name || `${raw.FirstName || ''} ${raw.LastName || ''}`.trim(),
          FirstName: raw.FirstName,
          LastName: raw.LastName,
          Email: raw.Email,
          Phone: raw.Phone,
          DateOfBirth: raw.DateOfBirth,
          DateCreated: raw.DateCreated,
        };
      }

      return null;
    } catch (error) {
      if (error instanceof IntakeQApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all notes for a client
   * IntakeQ API: GET /notes/summary
   * Status: 1 = locked, 2 = unlocked
   */
  async getClientNotes(
    clientId: number,
    options: GetClientNotesOptions = {}
  ): Promise<IntakeQNoteSummary[]> {
    if (clientId === undefined || clientId === null) {
      console.error('[IntakeQ] getClientNotes called with invalid clientId');
      return [];
    }

    const params = new URLSearchParams();
    params.set('clientId', String(clientId));

    // IntakeQ uses numeric status: 1 = locked, 2 = unlocked
    if (options.status) {
      params.set('status', options.status === 'Locked' ? '1' : '2');
    }
    if (options.startDate) {
      params.set('startDate', options.startDate);
    }
    if (options.endDate) {
      params.set('endDate', options.endDate);
    }

    const notes = await this.request<any[]>(
      `/notes/summary?${params.toString()}`
    );

    if (!notes || !Array.isArray(notes)) {
      return [];
    }

    // Normalize field names from IntakeQ response
    return notes.map(raw => ({
      Id: raw.Id,
      ClientId: raw.ClientId,
      ClientName: raw.ClientName,
      PractitionerId: raw.PractitionerId,
      PractitionerName: raw.PractitionerName,
      NoteName: raw.NoteName,
      DateCreated: raw.Date ? new Date(raw.Date).toISOString() : raw.DateCreated,
      Status: raw.Status === 'locked' || raw.Status === 1 ? 'Locked' : 'Draft',
      AppointmentId: raw.AppointmentId,
    }));
  }

  /**
   * Get the full content of a specific note
   * IntakeQ API: GET /notes/[note-id]
   */
  async getFullNote(noteId: string): Promise<IntakeQFullNote> {
    if (!noteId) {
      throw new Error('getFullNote called with invalid noteId');
    }

    const raw = await this.request<any>(`/notes/${noteId}`);

    // Normalize the response
    return {
      Id: raw.Id,
      ClientId: raw.ClientId,
      ClientName: raw.ClientName,
      PractitionerId: raw.PractitionerId,
      PractitionerName: raw.PractitionerName,
      NoteName: raw.NoteName,
      DateCreated: raw.Date ? new Date(raw.Date).toISOString() : raw.DateCreated,
      Status: raw.Status === 'locked' || raw.Status === 1 ? 'Locked' : 'Draft',
      AppointmentId: raw.AppointmentId,
      Questions: raw.Questions ?? [],
    };
  }

  /**
   * Get the most recent locked note for a client
   * Returns null if no locked notes exist
   */
  async getMostRecentLockedNote(
    clientId: number
  ): Promise<IntakeQFullNote | null> {
    if (clientId === undefined || clientId === null) {
      console.error('[IntakeQ] getMostRecentLockedNote called with invalid clientId');
      return null;
    }

    // Fetch locked notes
    const notes = await this.getClientNotes(clientId, {
      status: 'Locked',
    });

    if (!notes || notes.length === 0) {
      return null;
    }

    // Sort by date descending and get the most recent
    const sortedNotes = notes.sort((a, b) => {
      const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
      const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
      return dateB - dateA;
    });

    const mostRecent = sortedNotes[0];

    if (!mostRecent.Id) {
      console.error('[IntakeQ] Most recent note has no Id');
      return null;
    }

    // Fetch the full note content
    return this.getFullNote(mostRecent.Id);
  }
}

/**
 * Custom error class for IntakeQ API errors
 */
export class IntakeQApiError extends Error {
  public statusCode: number;
  public responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = 'IntakeQApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
