import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSlotRequest, SlotDto, UpdateSlotRequest, UUID } from '../dto/slots.dto';

@Injectable({ providedIn: 'root' })
export class SlotsService {
  private readonly base = '/api/catalogue/slots';

  constructor(private http: HttpClient) {}

  list(): Observable<SlotDto[]> {
    return this.http.get<SlotDto[]>(this.base);
  }

  create(body: CreateSlotRequest): Observable<SlotDto> {
    return this.http.post<SlotDto>(this.base, body);
  }

  update(id: UUID, body: UpdateSlotRequest): Observable<SlotDto> {
    return this.http.put<SlotDto>(`${this.base}/${encodeURIComponent(id)}`, body);
  }

  delete(id: UUID): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
