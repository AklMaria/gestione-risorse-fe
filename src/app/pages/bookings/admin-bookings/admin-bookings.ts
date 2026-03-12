import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription, timer, forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ResourcesService } from '../../catalogue/services/resources.service';
import { SlotsService } from '../../catalogue/services/slots.service';
import { AvailabilitiesService } from '../../catalogue/services/availabilities.service';
import { ResourcesDto } from '../../catalogue/dto/resources.dto';
import { SlotDto } from '../../catalogue/dto/slots.dto';
import { AvailabilityDto } from '../../catalogue/dto/availabilities.dto';
import { BookingsService } from '../bookings.service';
import { BookingDto, BookingStatus } from '../bookings.dto';

type UUID = string;

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings.html',
  styleUrls: ['./admin-bookings.scss'],
})
export class AdminBookingsComponent implements OnInit, OnDestroy {
  private bookingsService = inject(BookingsService);

  // catalogue lookups for labels
  private resourcesService = inject(ResourcesService);
  private slotsService = inject(SlotsService);
  private availService = inject(AvailabilitiesService);

  loading = signal(false);
  listError = signal<string | null>(null);

  bookings = signal<BookingDto[]>([]);

  // filters
  filterStatus: '' | BookingStatus = '';
  filterAvailabilityId = '';

  // lookup cache
  resources = signal<ResourcesDto[]>([]);
  slots = signal<SlotDto[]>([]);
  availById = signal<Map<UUID, AvailabilityDto>>(new Map());
  lookupsLoaded = signal(false);

  // detail modal
  detailOpen = signal(false);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);
  detail = signal<BookingDto | null>(null);

  // cancel modal
  cancelOpen = signal(false);
  cancelTarget = signal<BookingDto | null>(null);

  // silent auto polling
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.loadLookups();
    this.refresh(false);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private toNiceApiMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body: any = err.error;
      const msg =
        (typeof body === 'string' && body) ||
        body?.message ||
        body?.error ||
        body?.detail ||
        err.message ||
        'Request failed';
      return String(msg);
    }
    return 'Unexpected error';
  }

  formatNice(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }

  statusBadgeClass(s: BookingStatus): string {
    switch (s) {
      case 'CONFIRMED':
        return 'text-bg-success';
      case 'PENDING':
      case 'CANCEL_PENDING':
        return 'text-bg-warning';
      case 'CANCELLED':
        return 'text-bg-secondary';
      case 'REJECTED':
      case 'FAILED':
        return 'text-bg-danger';
      default:
        return 'text-bg-light';
    }
  }

  prettyJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  detailObjOf(b: BookingDto | null): unknown {
    return b?.detail ?? null;
  }

  private loadLookups(): void {
    this.lookupsLoaded.set(false);

    forkJoin({
      resources: this.resourcesService.list(),
      slots: this.slotsService.list(),
    }).subscribe({
      next: ({ resources, slots }) => {
        this.resources.set(resources ?? []);
        this.slots.set(slots ?? []);
        this.lookupsLoaded.set(true);
        this.warmAvailabilities();
      },
      error: () => {
        this.lookupsLoaded.set(false);
      },
    });
  }

  private warmAvailabilities(): void {
    const res = this.resources();
    if (!res.length) return;

    forkJoin(res.map((r) => this.availService.listByResource((r as any).id))).subscribe({
      next: (lists) => {
        const map = new Map<UUID, AvailabilityDto>();
        for (const list of lists) {
          for (const a of list ?? []) {
            map.set((a as any).id, a);
          }
        }
        this.availById.set(map);
      },
      error: () => {},
    });
  }

  private resourceById(id: string | null | undefined): ResourcesDto | undefined {
    if (!id) return undefined;
    return this.resources().find((r) => (r as any).id === id);
  }

  private slotById(id: string | null | undefined): SlotDto | undefined {
    if (!id) return undefined;
    return this.slots().find((s) => (s as any).id === id);
  }

  bookingAvailabilityLabel(b: BookingDto): string {
    const d: any = b.detail;
    const fromDetailName = d?.resource?.name || d?.resourceName || '';
    const fromDetailStart = d?.slot?.startDate || d?.startDate || '';
    const fromDetailEnd = d?.slot?.endDate || d?.endDate || '';

    if (fromDetailName && fromDetailStart && fromDetailEnd) {
      return `${fromDetailName} — ${this.formatNice(fromDetailStart)} → ${this.formatNice(fromDetailEnd)}`;
    }

    const availabilityId = String(b.availabilityId || '');
    const a = this.availById().get(availabilityId);

    if (a) {
      const r = this.resourceById((a as any).resourceId);
      const s = this.slotById((a as any).slotId);
      const rn = (r as any)?.name || 'Resource';
      const start = (s as any)?.startDate || '';
      const end = (s as any)?.endDate || '';

      if (start && end) {
        return `${rn} — ${this.formatNice(start)} → ${this.formatNice(end)}`;
      }
      return rn;
    }

    return availabilityId ? `Availability: ${availabilityId.slice(0, 8)}…` : '—';
  }

  private hasPending(): boolean {
    return this.bookings().some((b) => b.status === 'PENDING' || b.status === 'CANCEL_PENDING');
  }

  private startPolling(): void {
    if (this.pollSub) return;

    this.pollSub = timer(3000, 3000).subscribe(() => {
      this.refresh(true);
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private updatePolling(): void {
    if (this.hasPending()) this.startPolling();
    else this.stopPolling();
  }

  refresh(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.listError.set(null);
    }

    this.bookingsService
      .list({
        status: this.filterStatus === '' ? undefined : this.filterStatus,
        availabilityId: this.filterAvailabilityId.trim() || undefined,
      })
      .pipe(
        finalize(() => {
          if (!silent) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (items) => {
          this.bookings.set(items ?? []);
          this.updatePolling();
        },
        error: (e) => {
          if (!silent) this.listError.set(this.toNiceApiMessage(e));
        },
      });
  }

  applyFilters(): void {
    this.refresh(false);
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterAvailabilityId = '';
    this.refresh(false);
  }

  openDetail(b: BookingDto): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.detail.set(null);

    this.bookingsService
      .getById(b.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (x) => this.detail.set(x),
        error: (e) => this.detailError.set(this.toNiceApiMessage(e)),
      });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.detail.set(null);
    this.detailError.set(null);
  }

  canCancel(b: BookingDto): boolean {
    return b.status === 'CONFIRMED';
  }

  openCancel(b: BookingDto): void {
    if (!this.canCancel(b)) return;
    this.cancelTarget.set(b);
    this.cancelOpen.set(true);
  }

  closeCancel(): void {
    this.cancelOpen.set(false);
    this.cancelTarget.set(null);
  }

  confirmCancel(): void {
    const t = this.cancelTarget();
    if (!t || this.loading()) return;

    this.loading.set(true);
    this.bookingsService
      .cancel(t.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.closeCancel();
          this.refresh(true);
        },
        error: (e) => {
          this.listError.set(this.toNiceApiMessage(e));
          this.closeCancel();
        },
      });
  }

  trackById(_: number, x: { id: string }): string {
    return x.id;
  }
}
