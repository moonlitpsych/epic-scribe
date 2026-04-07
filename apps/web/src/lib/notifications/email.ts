import { Resend } from 'resend';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@trymoonlit.com';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#e2e4ec">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="margin-bottom:32px">
      <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:20px;font-weight:600;color:#10b981">moonlit</span>
      <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:20px;color:#6e7280"> psychiatry</span>
    </div>
    <div style="background:#141720;border:1px solid #2a2d3a;border-radius:2px;padding:32px">
      ${content}
    </div>
    <div style="margin-top:24px;font-size:12px;color:#6e7280;text-align:center">
      Moonlit Psychiatry &mdash; Confidential
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn('[notifications/email] RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) {
      console.error('[notifications/email] Send failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[notifications/email] Error:', err);
    return { success: false, error: String(err) };
  }
}

export async function sendBookingConfirmationEmail(
  to: string,
  params: { patientName: string; date: string; time: string; duration: number; setting: string; visitType: string }
): Promise<EmailResult> {
  return sendEmail(
    to,
    'Your appointment request has been received',
    baseTemplate(`
      <h2 style="margin:0 0 16px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;color:#e2e4ec">Appointment Request Received</h2>
      <p style="margin:0 0 16px;color:#a0a4b4;line-height:1.6">Hi ${params.patientName}, your appointment request has been received. We'll review and confirm it shortly.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6e7280;width:100px">Date</td><td style="padding:8px 0;color:#e2e4ec">${params.date}</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Time</td><td style="padding:8px 0;color:#e2e4ec">${params.time}</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Duration</td><td style="padding:8px 0;color:#e2e4ec">${params.duration} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Setting</td><td style="padding:8px 0;color:#e2e4ec">${params.setting}</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Visit Type</td><td style="padding:8px 0;color:#e2e4ec">${params.visitType}</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#6e7280;font-size:13px">You'll receive another email once your appointment is confirmed.</p>
    `)
  );
}

export async function sendBookingConfirmedEmail(
  to: string,
  params: { patientName: string; date: string; time: string; duration: number; meetLink?: string; setting: string; providerName: string }
): Promise<EmailResult> {
  const meetSection = params.meetLink
    ? `<tr><td style="padding:8px 0;color:#6e7280;width:100px">Join Link</td><td style="padding:8px 0"><a href="${params.meetLink}" style="color:#10b981;text-decoration:none">${params.meetLink}</a></td></tr>`
    : '';

  return sendEmail(
    to,
    'Your appointment is confirmed',
    baseTemplate(`
      <h2 style="margin:0 0 16px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;color:#10b981">Appointment Confirmed</h2>
      <p style="margin:0 0 16px;color:#a0a4b4;line-height:1.6">Hi ${params.patientName}, your appointment with ${params.providerName} has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6e7280;width:100px">Date</td><td style="padding:8px 0;color:#e2e4ec">${params.date}</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Time</td><td style="padding:8px 0;color:#e2e4ec">${params.time}</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Duration</td><td style="padding:8px 0;color:#e2e4ec">${params.duration} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#6e7280">Setting</td><td style="padding:8px 0;color:#e2e4ec">${params.setting}</td></tr>
        ${meetSection}
      </table>
      ${params.meetLink ? `<a href="${params.meetLink}" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#10b981;color:#0f1117;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">Join Video Call</a>` : ''}
    `)
  );
}

export async function sendBookingDeclinedEmail(
  to: string,
  params: { patientName: string; date: string; time: string; providerName: string }
): Promise<EmailResult> {
  return sendEmail(
    to,
    'Appointment update',
    baseTemplate(`
      <h2 style="margin:0 0 16px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;color:#e2e4ec">Appointment Update</h2>
      <p style="margin:0 0 16px;color:#a0a4b4;line-height:1.6">Hi ${params.patientName}, unfortunately your requested appointment on ${params.date} at ${params.time} could not be scheduled at this time.</p>
      <p style="margin:0;color:#a0a4b4;line-height:1.6">Please visit our booking page to select another available time.</p>
    `)
  );
}
