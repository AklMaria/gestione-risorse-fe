export type UUID = string;

export interface SlotDto {
  id: UUID;
  startDate: string; // ISO date-time (TIMESTAMPTZ)
  endDate: string; // ISO date-time (TIMESTAMPTZ)
}

export interface CreateSlotRequest {
  startDate: string; // ISO
  endDate: string; // ISO
}

export interface UpdateSlotRequest {
  startDate: string; // ISO
  endDate: string; // ISO
}
