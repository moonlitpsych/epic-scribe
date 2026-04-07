import NotifyreAPI from 'notifyre-nodejs-sdk';

const apiKey = process.env.NOTIFYRE_API_KEY || '';
const FROM_NUMBER = process.env.NOTIFYRE_FROM_NUMBER || '+13856228886';

interface SmsResult {
  success: boolean;
  error?: string;
}

/** Convert 10/11-digit US numbers to E.164 format (+1XXXXXXXXXX) */
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return `+1${digits}`;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!apiKey) {
    console.warn('[notifications/sms] NOTIFYRE_API_KEY not set, skipping SMS');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const notifyre = new NotifyreAPI(apiKey);
    const smsService = notifyre.getSmsService();
    const formattedTo = formatPhoneNumber(to);

    await smsService.submitSms({
      body: message,
      from: FROM_NUMBER,
      recipients: [formattedTo],
      scheduledDate: null,
      addUnsubscribeLink: false,
    });

    return { success: true };
  } catch (err) {
    console.error('[notifications/sms] Error:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendBookingConfirmationSms(
  to: string,
  params: { patientName: string; date: string; time: string }
): Promise<SmsResult> {
  return sendSms(
    to,
    `Hi ${params.patientName}, your appointment request for ${params.date} at ${params.time} has been received. We'll confirm shortly. - Moonlit Psychiatry`
  );
}

export async function sendBookingConfirmedSms(
  to: string,
  params: { patientName: string; date: string; time: string; meetLink?: string }
): Promise<SmsResult> {
  const meetPart = params.meetLink ? ` Join: ${params.meetLink}` : '';
  return sendSms(
    to,
    `Hi ${params.patientName}, your appointment on ${params.date} at ${params.time} is confirmed.${meetPart} - Moonlit Psychiatry`
  );
}

export async function sendBookingDeclinedSms(
  to: string,
  params: { patientName: string; date: string; time: string }
): Promise<SmsResult> {
  return sendSms(
    to,
    `Hi ${params.patientName}, unfortunately your requested appointment on ${params.date} at ${params.time} could not be scheduled. Please rebook at your convenience. - Moonlit Psychiatry`
  );
}
