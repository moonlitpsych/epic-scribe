/**
 * PHI Redaction utilities for HIPAA compliance
 * Ensures no PHI is stored in logs or database
 */

// Common PHI patterns to detect and redact
const PHI_PATTERNS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  MRN: /\b[A-Z]{2,3}\d{6,10}\b/g,
  DOB: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
  PHONE: /\b(\+?1?\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};

/**
 * Redact potential PHI from a string
 * @param text - Text that may contain PHI
 * @param placeholder - Replacement text for redacted content
 * @returns Redacted text
 */
export function redactPHI(text: string, placeholder: string = '[REDACTED]'): string {
  let redacted = text;

  // Apply all PHI pattern redactions
  Object.values(PHI_PATTERNS).forEach(pattern => {
    redacted = redacted.replace(pattern, placeholder);
  });

  return redacted;
}

/**
 * Check if text contains potential PHI
 * @param text - Text to check
 * @returns true if PHI patterns detected
 */
export function containsPHI(text: string): boolean {
  return Object.values(PHI_PATTERNS).some(pattern => pattern.test(text));
}

/**
 * Redact patient names from text
 * @param text - Text containing patient names
 * @param patientNames - List of patient names to redact
 * @returns Text with patient names redacted
 */
export function redactPatientNames(text: string, patientNames: string[]): string {
  let redacted = text;

  patientNames.forEach(name => {
    // Create case-insensitive pattern for each name
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    redacted = redacted.replace(pattern, '[PATIENT_NAME]');
  });

  return redacted;
}

/**
 * Create a safe log entry by redacting PHI
 * @param data - Data to log
 * @returns Safe version for logging
 */
export function createSafeLogEntry(data: any): any {
  if (typeof data === 'string') {
    return redactPHI(data);
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Deep clone and redact object
  const safe = JSON.parse(JSON.stringify(data));

  const redactObject = (obj: any): void => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Redact transcript and note content entirely
        if (['transcript', 'priorNote', 'note', 'patientName'].includes(key)) {
          obj[key] = '[PHI_CONTENT_REDACTED]';
        } else {
          obj[key] = redactPHI(obj[key]);
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactObject(obj[key]);
      }
    }
  };

  redactObject(safe);
  return safe;
}

/**
 * Generate a hash for PHI content (for tracking without storing)
 * @param content - PHI content to hash
 * @returns SHA-256 hash of content
 */
export async function hashPHI(content: string): Promise<string> {
  // In a real implementation, use crypto library for SHA-256
  // For now, return a placeholder
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}