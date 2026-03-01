import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AvailabilityDto,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  UUID,
} from '../dto/availabilities.dto';

@Injectable({ providedIn: 'root' })
export class AvailabilitiesService {
  private readonly base = '/api/catalogue';

  constructor(private http: HttpClient) {}

  listByResource(resourceId: UUID): Observable<AvailabilityDto[]> {
    return this.http.get<AvailabilityDto[]>(
      `${this.base}/resources/${encodeURIComponent(resourceId)}/availabilities`,
    );
  }

  create(body: CreateAvailabilityRequest): Observable<AvailabilityDto> {
    return this.http.post<AvailabilityDto>(`${this.base}/availabilities`, body);
  }

  update(id: UUID, body: UpdateAvailabilityRequest): Observable<AvailabilityDto> {
    return this.http.put<AvailabilityDto>(
      `${this.base}/availabilities/${encodeURIComponent(id)}`,
      body,
    );
  }

  delete(id: UUID): Observable<void> {
    return this.http.delete<void>(`${this.base}/availabilities/${encodeURIComponent(id)}`);
  }
}
