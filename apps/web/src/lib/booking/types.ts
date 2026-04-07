export interface BookingSlot {
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm
  durationMinutes: number;
}

export interface PatientBookingInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;   // YYYY-MM-DD
  email: string;
  phone: string;
  memberId?: string;
}

export interface BookingRequest {
  slot: BookingSlot;
  patient: PatientBookingInfo;
  payerId: string;
}

export interface BookingConfirmation {
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  meetLink?: string;
  setting: string;
  visitType: string;
  patientName: string;
}

export interface ProviderAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  setting: string;
  visit_type: string;
  slot_duration_minutes: number;
  is_active: boolean;
}
