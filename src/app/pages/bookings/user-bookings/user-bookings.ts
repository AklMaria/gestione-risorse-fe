import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin, Subscription, timer } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';



import { ResourcesService } from '../../catalogue/services/resources.service';
import { SlotsService } from '../../catalogue/services/slots.service';
import { AvailabilitiesService } from '../../catalogue/services/availabilities.service';

import { ResourcesDto } from '../../catalogue/dto/resources.dto';
import { SlotDto } from '../../catalogue/dto/slots.dto';
import { AvailabilityDto } from '../../catalogue/dto/availabilities.dto';
import { BookingsService } from '../bookings.service';
import { BookingDto, BookingStatus } from '../bookings.dto';

type AvailabilityCardVm = {
  availabilityId: string;
  resourceName: string;
  startDate: string;
  endDate: string;
  capacity: number;
  consumed: number;
  available: number;
};

@Component({
  selector: 'app-user-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-bookings.html',
  styleUrls: ['./user-bookings.scss'],
})
export class UserBookingsComponent implements OnInit, OnDestroy {
  private bookingsService = inject(BookingsService);
  private resourcesService = inject(ResourcesService);
  private slotsService = inject(SlotsService);
  private availService = inject(AvailabilitiesService);

  view = signal<'browse' | 'my'>('browse');

  // bookable section
  loading = signal(false);
  error = signal<string | null>(null);
  toast = signal<string | null>(null);

  resources = signal<ResourcesDto[]>([]);
  slots = signal<SlotDto[]>([]);
  cards = signal<AvailabilityCardVm[]>([]);
  search = signal('');
  onlyAvailable = signal(true);

  // book modal
  bookOpen = signal(false);
  bookTarget = signal<AvailabilityCardVm | null>(null);
  bookNote = '';
  bookError = signal<string | null>(null);

  // my bookings section
  myLoading = signal(false);
  myError = signal<string | null>(null);
  myBookings = signal<BookingDto[]>([]);
  myAuto = signal(true);
  private myPollSub: Subscription | null = null;

  // cancel modal
  cancelOpen = signal(false);
  cancelTarget = signal<BookingDto | null>(null);

  ngOnInit(): void {
    this.loadBookable();
    this.loadMyBookings();
  }

  ngOnDestroy(): void {
    this.stopMyPolling();
  }

  setView(v: 'browse' | 'my') {
    this.view.set(v);
    this.toast.set(null);
    if (v === 'my') this.loadMyBookings();
  }

  // ---------- helpers ----------
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

  isBusyStatus(s: BookingStatus): boolean {
    return s === 'PENDING' || s === 'CANCEL_PENDING';
  }

  busyLabel(s: BookingStatus): string {
    if (s === 'PENDING') return 'Processing…';
    if (s === 'CANCEL_PENDING') return 'Cancelling…';
    return '';
  }

  // ---------- BOOKABLE ----------
  loadBookable(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      resources: this.resourcesService.list(),
      slots: this.slotsService.list(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ resources, slots }) => {
          this.resources.set(resources ?? []);
          this.slots.set(slots ?? []);
          this.loadAllAvailabilities();
        },
        error: (e) => this.error.set(this.toNiceApiMessage(e)),
      });
  }

  refreshPrenotabili(): void {
    this.loadBookable();
  }

  private loadAllAvailabilities(): void {
    const res = this.resources();
    if (res.length === 0) {
      this.cards.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin(res.map((r) => this.availService.listByResource(r.id as any)))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (lists: AvailabilityDto[][]) => {
          const slotsById = new Map(this.slots().map((s) => [s.id, s]));
          const out: AvailabilityCardVm[] = [];

          for (let i = 0; i < res.length; i++) {
            const r = res[i];
            const avs = lists[i] ?? [];
            for (const a of avs) {
              const slot = slotsById.get((a as any).slotId);
              if (!slot) continue;

              const capacity = (a as any).capacity ?? 0;
              const consumed = (a as any).consumed ?? 0;
              const available = Math.max(0, capacity - consumed);

              out.push({
                availabilityId: (a as any).id,
                resourceName: (r as any).name,
                startDate: slot.startDate,
                endDate: slot.endDate,
                capacity,
                consumed,
                available,
              });
            }
          }

          out.sort((x, y) => new Date(x.startDate).getTime() - new Date(y.startDate).getTime());
          this.cards.set(out);
        },
        error: (e) => this.error.set(this.toNiceApiMessage(e)),
      });
  }

  filteredCards(): AvailabilityCardVm[] {
    const q = this.search().trim().toLowerCase();
    return this.cards()
      .filter((c) => (this.onlyAvailable() ? c.available > 0 : true))
      .filter((c) =>
        q
          ? c.resourceName.toLowerCase().includes(q) ||
            this.formatNice(c.startDate).toLowerCase().includes(q)
          : true,
      );
  }

  // book modal
  openBook(c: AvailabilityCardVm): void {
    this.toast.set(null);
    this.bookError.set(null);
    this.bookTarget.set(c);
    this.bookNote = '';
    this.bookOpen.set(true);
  }

  closeBook(): void {
    this.bookOpen.set(false);
    this.bookTarget.set(null);
    this.bookNote = '';
    this.bookError.set(null);
  }

  private saveMyBookingId(id: string) {
    const key = 'myBookingIds';
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    if (!existing.includes(id)) existing.unshift(id);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 200)));
  }

  confirmBook(): void {
    const t = this.bookTarget();
    if (!t || this.loading()) return;

    this.loading.set(true);
    this.bookError.set(null);

    this.bookingsService
      .create({ availabilityId: t.availabilityId, note: this.bookNote.trim() || null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (b: BookingDto) => {
          if (b?.id) this.saveMyBookingId(b.id);
          this.toast.set('Booking requested (PENDING). Check “My bookings”.');
          this.closeBook();
          this.loadMyBookings();
        },
        error: (e) => this.bookError.set(this.toNiceApiMessage(e)),
      });
  }

  // ---------- MY BOOKINGS ----------
  private getMyIds(): string[] {
    return JSON.parse(localStorage.getItem('myBookingIds') || '[]') as string[];
  }

  private setMyIds(ids: string[]) {
    localStorage.setItem('myBookingIds', JSON.stringify(ids));
  }

  loadMyBookings(): void {
    const ids = this.getMyIds();
    if (ids.length === 0) {
      this.myBookings.set([]);
      this.stopMyPolling();
      return;
    }

    this.myLoading.set(true);
    this.myError.set(null);

    const results: BookingDto[] = [];
    const remainingIds: string[] = [];
    let pending = ids.length;

    const done = () => {
      pending -= 1;
      if (pending > 0) return;

      this.setMyIds(remainingIds);

      const sorted = results.slice().sort((a, b) => {
        const ta = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime();
        const tb = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime();
        return tb - ta;
      });

      this.myBookings.set(sorted);
      this.myLoading.set(false);
      this.updateMyPolling();
    };

    for (const id of ids) {
      this.bookingsService.getById(id).subscribe({
        next: (b) => {
          results.push(b);
          remainingIds.push(id);
          done();
        },
        error: (e) => {
          if (e?.status === 404) {
            done();
            return;
          }
          this.myError.set(this.toNiceApiMessage(e));
          remainingIds.push(id);
          done();
        },
      });
    }
  }

  toggleMyAuto(): void {
    this.myAuto.set(!this.myAuto());
    this.updateMyPolling();
  }

  private hasPendingMine(): boolean {
    return this.myBookings().some((b) => b.status === 'PENDING' || b.status === 'CANCEL_PENDING');
  }

  private updateMyPolling(): void {
    const should = this.myAuto() && this.hasPendingMine();
    if (should) this.startMyPolling();
    else this.stopMyPolling();
  }

  private startMyPolling(): void {
    if (this.myPollSub) return;
    this.myPollSub = timer(3000, 3000).subscribe(() => {
      if (!this.myLoading() && this.view() === 'my') this.loadMyBookings();
    });
  }

  private stopMyPolling(): void {
    this.myPollSub?.unsubscribe();
    this.myPollSub = null;
  }

  canCancelMine(b: BookingDto): boolean {
    return b.status === 'CONFIRMED';
  }

  // Hide is useful after completion (CANCELLED / FAILED / REJECTED)
  canHideMine(b: BookingDto): boolean {
    return b.status !== 'CONFIRMED' && b.status !== 'PENDING' && b.status !== 'CANCEL_PENDING';
  }

  removeFromMine(id: string): void {
    const ids = this.getMyIds().filter((x) => x !== id);
    this.setMyIds(ids);
    this.loadMyBookings();
  }

  // cancel flow
  openCancel(b: BookingDto): void {
    this.cancelTarget.set(b);
    this.cancelOpen.set(true);
  }

  closeCancel(): void {
    this.cancelOpen.set(false);
    this.cancelTarget.set(null);
  }

  // ✅ Keep card, show spinner via CANCEL_PENDING, polling updates status
  confirmCancel(): void {
    const t = this.cancelTarget();
    if (!t || this.myLoading()) return;

    const id = t.id;

    this.myLoading.set(true);
    this.bookingsService
      .cancel(id)
      .pipe(finalize(() => this.myLoading.set(false)))
      .subscribe({
        next: () => {
          this.closeCancel();
          // refresh to fetch CANCEL_PENDING quickly
          this.loadMyBookings();
          this.toast.set('Cancellation requested. Updating status…');
        },
        error: (e) => {
          this.myError.set(this.toNiceApiMessage(e));
          this.closeCancel();
        },
      });
  }

  // detail helpers
  hasDetail(b: BookingDto): boolean {
    return !!(b as any).detail;
  }

  getDetail(b: BookingDto): any {
    return (b as any).detail;
  }

  prettyJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
}
