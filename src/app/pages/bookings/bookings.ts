import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { timer, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingsService } from './bookings.service';
import { BookingDto, BookingStatus } from './bookings.dto';



@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings.html',
  styleUrls: ['./bookings.scss'],
})
export class BookingsComponent implements OnInit, OnDestroy {
  private readonly service = inject(BookingsService);

  loading = signal(false);

  // Create form
  createAvailabilityId = '';
  createNote = '';
  createError = signal<string | null>(null);

  // Filters
  filterStatus: BookingStatus | '' = '';
  filterAvailabilityId = '';

  // List
  bookings = signal<BookingDto[]>([]);
  listError = signal<string | null>(null);

  // Detail modal
  detailOpen = signal(false);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);
  detail = signal<BookingDto | null>(null);

  // Cancel modal
  cancelOpen = signal(false);
  cancelTarget = signal<BookingDto | null>(null);

  // Polling
  autoRefresh = signal(true);
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.refresh();
    this.setupPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
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
        'Richiesta fallita';
      return String(msg);
    }
    return 'Errore inatteso';
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

  canCreate(): boolean {
    return !this.loading() && this.createAvailabilityId.trim().length > 0;
  }

  canCancel(b: BookingDto): boolean {
    // come da tua regola: solo CONFIRMED
    return b.status === 'CONFIRMED';
  }

  hasPendingInList(): boolean {
    return this.bookings().some((b) => b.status === 'PENDING' || b.status === 'CANCEL_PENDING');
  }

  // ---------- list ----------
  refresh(): void {
    this.loading.set(true);
    this.listError.set(null);

    this.service
      .list({ status: this.filterStatus, availabilityId: this.filterAvailabilityId })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.bookings.set(items ?? []);
          // polling parte/si ferma in base alla lista
          this.updatePollingState();
        },
        error: (e) => {
          this.listError.set(this.toNiceApiMessage(e));
          this.bookings.set([]);
          this.updatePollingState();
        },
      });
  }

  applyFilters(): void {
    this.refresh();
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterAvailabilityId = '';
    this.refresh();
  }

  // ---------- create ----------
  create(): void {
    const availabilityId = this.createAvailabilityId.trim();
    const note = this.createNote.trim();

    if (!availabilityId || this.loading()) return;

    this.createError.set(null);
    this.loading.set(true);

    this.service
      .create({ availabilityId, note: note || null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          // pulisco e aggiorno lista
          this.createAvailabilityId = '';
          this.createNote = '';
          this.refresh();
        },
        error: (e) => {
          this.createError.set(this.toNiceApiMessage(e));
        },
      });
  }

  // ---------- detail ----------
  openDetail(b: BookingDto): void {
    this.detailOpen.set(true);
    this.detail.set(null);
    this.detailError.set(null);

    this.detailLoading.set(true);
    this.service
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

  prettyJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  // ---------- cancel ----------
  openCancel(b: BookingDto): void {
    this.cancelTarget.set(b);
    this.cancelOpen.set(true);
  }

  closeCancel(): void {
    this.cancelOpen.set(false);
    this.cancelTarget.set(null);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target || this.loading()) return;

    this.loading.set(true);
    this.service
      .cancel(target.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.closeCancel();
          this.refresh();
        },
        error: (e) => {
          // mostro errore in alto lista
          this.listError.set(this.toNiceApiMessage(e));
          this.closeCancel();
        },
      });
  }

  // ---------- polling ----------
  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
    this.updatePollingState();
  }

  private setupPolling(): void {
    // crea il meccanismo, ma lo attiviamo solo quando serve
    this.updatePollingState();
  }

  private updatePollingState(): void {
    const shouldPoll = this.autoRefresh() && this.hasPendingInList();
    if (shouldPoll) this.startPolling();
    else this.stopPolling();
  }

  private startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = timer(3000, 3000).subscribe(() => {
      // evita di sovrapporre richieste
      if (!this.loading()) this.refresh();
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}
