export type UUID = string;

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCEL_PENDING'
  | 'CANCELLED';

export interface BookingDto {
  id: UUID;
  availabilityId: UUID;
  note?: string | null;

  status: BookingStatus;
  reason?: string | null;

  detail?: any | null; // JSON snapshot (quando CONFIRMED)
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBookingRequest {
  availabilityId: UUID;
  note?: string | null;
}
