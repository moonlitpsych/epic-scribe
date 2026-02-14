/**
 * Setting Abbreviation Mapping
 *
 * Maps calendar hold abbreviations to full setting names.
 * Calendar holds follow format: [First Name] [Last Name] - [Abbr] [note type]
 */

export const SETTING_ABBREVIATIONS: Record<string, string> = {
  'RCC': 'HMHI Downtown RCC',
  'MHI': 'Redwood Clinic MHI',
  'DBH': 'Davis Behavioral Health',
  'Moonlit': 'Moonlit Psychiatry',
  'BHIDC': 'BHIDC therapy',
  'Teenscope': 'Teenscope South',
};

const VISIT_TYPE_ALIASES: Record<string, string> = {
  'intake': 'Intake',
  'fu': 'Follow-up',
  'followup': 'Follow-up',
  'follow-up': 'Follow-up',
  'toc': 'Transfer of Care',
  'consult': 'Consultation',
  'consultation': 'Consultation',
  'first': 'First Visit',
  'first visit': 'First Visit',
};

/**
 * Parse a Google Calendar hold title into patient name + setting + visit type.
 * Expected format: "John Smith - RCC Follow-up"
 */
export function parseCalendarHold(title: string): {
  firstName: string;
  lastName: string;
  setting: string | null;
  visitType: string | null;
} | null {
  const dashIndex = title.indexOf(' - ');
  if (dashIndex === -1) return null;

  const namePart = title.slice(0, dashIndex).trim();
  const infoPart = title.slice(dashIndex + 3).trim();

  // Parse name (at least first + last)
  const nameParts = namePart.split(/\s+/);
  if (nameParts.length < 2) return null;

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Parse setting abbreviation (first word of info part)
  const infoWords = infoPart.split(/\s+/);
  const abbr = infoWords[0];
  const setting = SETTING_ABBREVIATIONS[abbr] || null;

  // Parse visit type (remaining words)
  const visitTypeRaw = infoWords.slice(1).join(' ').toLowerCase();
  const visitType = VISIT_TYPE_ALIASES[visitTypeRaw] || null;

  return { firstName, lastName, setting, visitType };
}
