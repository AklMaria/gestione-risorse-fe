export type UUID = string;

export interface ResourcesDto {
  id: UUID;
  name: string;
  description?: string | null;
}

export interface CreateResourceRequest {
  name: string;
  description?: string | null;
}

export interface UpdateResourceRequest {
  name: string;
  description?: string | null;
}
