import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { timer, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingDto, BookingStatus } from '../bookings.dto';
import { BookingsService } from '../bookings.service';



@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings.html',
  styleUrls: ['./admin-bookings.scss'],
})
export class AdminBookingsComponent implements OnInit, OnDestroy {
  private readonly service = inject(BookingsService);

  loading = signal(false);
  listError = signal<string | null>(null);

  filterStatus: BookingStatus | '' = '';
  filterAvailabilityId = '';

  bookings = signal<BookingDto[]>([]);

  // detail modal
  detailOpen = signal(false);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);
  detail = signal<BookingDto | null>(null);

  // cancel modal
  cancelOpen = signal(false);
  cancelTarget = signal<BookingDto | null>(null);

  // polling
  autoRefresh = signal(true);
  private pollSub: Subscription | null = null;

  ngOnInit(): void {
    this.refresh();
    this.updatePollingState();
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

  refresh(): void {
    this.loading.set(true);
    this.listError.set(null);

    this.service
      .list({ status: this.filterStatus, availabilityId: this.filterAvailabilityId })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.bookings.set(items ?? []);
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

  // detail
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

  // cancel
  openCancel(b: BookingDto): void {
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
    this.service
      .cancel(t.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.closeCancel();
          this.refresh();
        },
        error: (e) => {
          this.listError.set(this.toNiceApiMessage(e));
          this.closeCancel();
        },
      });
  }

  toggleAuto(): void {
    this.autoRefresh.set(!this.autoRefresh());
    this.updatePollingState();
  }

  private hasPending(): boolean {
    return this.bookings().some((b) => b.status === 'PENDING' || b.status === 'CANCEL_PENDING');
  }

  private updatePollingState(): void {
    const should = this.autoRefresh() && this.hasPending();
    if (should) this.startPolling();
    else this.stopPolling();
  }

  private startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = timer(3000, 3000).subscribe(() => {
      if (!this.loading()) this.refresh();
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}
