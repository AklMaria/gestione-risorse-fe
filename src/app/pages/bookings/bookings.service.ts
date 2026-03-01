import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingDto, BookingStatus, CreateBookingRequest, UUID } from './bookings.dto';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly base = '/api/booking/bookings';

  constructor(private http: HttpClient) {}

  list(filters?: {
    status?: BookingStatus | '';
    availabilityId?: string;
  }): Observable<BookingDto[]> {
    let params = new HttpParams();

    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.availabilityId)
      params = params.set('availabilityId', filters.availabilityId.trim());

    return this.http.get<BookingDto[]>(this.base, { params });
  }

  create(body: CreateBookingRequest): Observable<BookingDto> {
    return this.http.post<BookingDto>(this.base, body);
  }

  getById(id: UUID): Observable<BookingDto> {
    return this.http.get<BookingDto>(`${this.base}/${encodeURIComponent(id)}`);
  }

  cancel(id: UUID): Observable<BookingDto | void> {
    return this.http.delete<BookingDto | void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
