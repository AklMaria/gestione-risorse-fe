export type UUID = string;

export interface AvailabilityDto {
  id: UUID;
  resourceId: UUID;
  slotId: UUID;
  capacity: number;
  consumed: number;
}

export interface CreateAvailabilityRequest {
  resourceId: UUID;
  slotId: UUID;
  capacity: number;
}

export interface UpdateAvailabilityRequest {
  capacity: number;
}
