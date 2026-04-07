import { sendBookingConfirmationEmail, sendBookingConfirmedEmail, sendBookingDeclinedEmail } from './email';
import { sendBookingConfirmationSms, sendBookingConfirmedSms, sendBookingDeclinedSms } from './sms';

interface BookingSubmittedParams {
  email?: string;
  phone?: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  setting: string;
  visitType: string;
}

interface BookingConfirmedParams {
  email?: string;
  phone?: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  meetLink?: string;
  setting: string;
  providerName: string;
}

interface BookingDeclinedParams {
  email?: string;
  phone?: string;
  patientName: string;
  date: string;
  time: string;
  providerName: string;
}

export async function notifyBookingSubmitted(params: BookingSubmittedParams): Promise<void> {
  const results = await Promise.allSettled([
    params.email && sendBookingConfirmationEmail(params.email, params),
    params.phone && sendBookingConfirmationSms(params.phone, params),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[booking-notifications] Submitted notification failed:', result.reason);
    }
  }
}

export async function notifyBookingConfirmed(params: BookingConfirmedParams): Promise<void> {
  const results = await Promise.allSettled([
    params.email && sendBookingConfirmedEmail(params.email, params),
    params.phone && sendBookingConfirmedSms(params.phone, params),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[booking-notifications] Confirmed notification failed:', result.reason);
    }
  }
}

export async function notifyBookingDeclined(params: BookingDeclinedParams): Promise<void> {
  const results = await Promise.allSettled([
    params.email && sendBookingDeclinedEmail(params.email, params),
    params.phone && sendBookingDeclinedSms(params.phone, params),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[booking-notifications] Declined notification failed:', result.reason);
    }
  }
}
