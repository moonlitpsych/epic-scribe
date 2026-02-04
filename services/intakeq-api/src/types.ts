/**
 * IntakeQ API Types
 * Based on IntakeQ API documentation
 */

/**
 * IntakeQ client/patient record
 */
export interface IntakeQClient {
  ClientId: number;
  Guid: string;              // Used for client profile URL navigation
  ClientName: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  DateOfBirth?: string;
  DateCreated?: string;
}

/**
 * Summary of an IntakeQ note (returned from list endpoint)
 */
export interface IntakeQNoteSummary {
  Id: string;
  ClientId: number;
  ClientName: string;
  PractitionerId: string;
  PractitionerName: string;
  NoteName: string;
  DateCreated: string;
  Status: 'Draft' | 'Locked';
  AppointmentId?: string;
}

/**
 * A question/answer pair in an IntakeQ note
 */
export interface IntakeQQuestion {
  Id: string;
  Text: string;
  Answer?: string;
  QuestionType: string;
  OfficeUse?: boolean;
  ColumnIndex?: number;
  Rows?: IntakeQMatrixRow[];
}

/**
 * A row in a matrix question
 */
export interface IntakeQMatrixRow {
  Text: string;
  Cells?: IntakeQMatrixCell[];
}

/**
 * A cell in a matrix row
 */
export interface IntakeQMatrixCell {
  Selected?: boolean;
  Value?: string;
  ColumnIndex: number;
}

/**
 * Full IntakeQ note with questions
 */
export interface IntakeQFullNote {
  Id: string;
  ClientId: number;
  ClientName: string;
  PractitionerId: string;
  PractitionerName: string;
  NoteName: string;
  DateCreated: string;
  Status: 'Draft' | 'Locked';
  AppointmentId?: string;
  Questions: IntakeQQuestion[];
}

/**
 * Options for fetching client notes
 */
export interface GetClientNotesOptions {
  status?: 'Draft' | 'Locked';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * IntakeQ API client configuration
 */
export interface IntakeQApiConfig {
  apiKey: string;
  baseUrl?: string;
}
