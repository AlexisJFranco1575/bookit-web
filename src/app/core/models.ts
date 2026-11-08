export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const DAYS: readonly DayName[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export type AppointmentStatus = 'Booked' | 'Cancelled' | 'Completed' | 'NoShow';

export interface Business {
  id: string;
  name: string;
  timeZoneId: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  businessId: string;
  name: string;
  durationMinutes: number;
}

/** Times are "HH:mm" in the local time of the business. */
export interface WorkingPeriod {
  day: DayName;
  start: string;
  end: string;
}

export interface Provider {
  id: string;
  businessId: string;
  name: string;
  workingPeriods: WorkingPeriod[];
}

export interface Slot {
  startsAt: string;
  endsAt: string;
  /** The start as wall-clock time of the business, for example 2026-11-16T09:00:00-05:00. */
  localStartsAt: string;
}

export interface Availability {
  providerId: string;
  serviceId: string;
  timeZoneId: string;
  slots: Slot[];
}

export interface BookRequest {
  providerId: string;
  serviceId: string;
  startsAt: string;
  customerName: string;
  customerEmail: string;
}

export interface Appointment {
  id: string;
  providerId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  startsAt: string;
  endsAt: string;
  localStartsAt: string;
  status: AppointmentStatus;
}

export interface CreateServiceRequest {
  name: string;
  durationMinutes: number;
}

export interface CreateProviderRequest {
  name: string;
  workingPeriods: WorkingPeriod[];
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

/** The signed-in owner, read from the claims of the access token. */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  /** Expiry as milliseconds since the Unix epoch. */
  expiresAt: number;
}