import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateResourceRequest,
  ResourcesDto,
  UpdateResourceRequest,
  UUID,
} from '../dto/resources.dto';


@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly base = '/api/catalogue/resources';

  constructor(private http: HttpClient) {}

  list(): Observable<ResourcesDto[]> {
    return this.http.get<ResourcesDto[]>(this.base);
  }

  create(body: CreateResourceRequest): Observable<ResourcesDto> {
    return this.http.post<ResourcesDto>(this.base, body);
  }

  update(id: UUID, body: UpdateResourceRequest): Observable<ResourcesDto> {
    return this.http.put<ResourcesDto>(`${this.base}/${encodeURIComponent(id)}`, body);
  }

  delete(id: UUID): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
