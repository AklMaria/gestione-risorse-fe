import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { SlotsService } from '../services/slots.service';
import { SlotDto, UUID } from '../dto/slots.dto';

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slots.html',
  styleUrls: ['./slots.scss'],
})
export class Slots implements OnInit {
  private readonly service = inject(SlotsService);

  loading = signal(false);
  slots = signal<SlotDto[]>([]);

  // Create form (datetime-local strings)
  newStartLocal = '';
  newEndLocal = '';

  // Edit state
  editingId: UUID | null = null;
  editStartLocal = '';
  editEndLocal = '';

  // Delete modal state
  deleteOpen = signal(false);
  deleteTarget = signal<SlotDto | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  // ---------- helpers ----------
  private localToIso(localValue: string): string {
    return new Date(localValue).toISOString();
  }

  private isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  formatNice(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  durationMinutes(s: SlotDto): number {
    const a = new Date(s.startDate).getTime();
    const b = new Date(s.endDate).getTime();
    return Math.max(0, Math.round((b - a) / 60000));
  }

  // ---------- validations ----------
  canCreate(): boolean {
    if (this.loading()) return false;
    if (!this.newStartLocal || !this.newEndLocal) return false;

    const start = new Date(this.newStartLocal).getTime();
    const end = new Date(this.newEndLocal).getTime();
    return isFinite(start) && isFinite(end) && end > start;
  }

  canSaveEdit(): boolean {
    if (this.loading() || !this.editingId) return false;
    if (!this.editStartLocal || !this.editEndLocal) return false;

    const start = new Date(this.editStartLocal).getTime();
    const end = new Date(this.editEndLocal).getTime();
    return isFinite(start) && isFinite(end) && end > start;
  }

  isEditing(s: SlotDto): boolean {
    return this.editingId === s.id;
  }

  // ---------- CRUD ----------
  refresh(): void {
    this.loading.set(true);
    this.service
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((items) => this.slots.set(items ?? []));
  }

  create(): void {
    if (!this.canCreate()) return;

    const startDate = this.localToIso(this.newStartLocal);
    const endDate = this.localToIso(this.newEndLocal);

    this.loading.set(true);
    this.service
      .create({ startDate, endDate })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        // reset form subito (così sembra reattivo)
        this.newStartLocal = '';
        this.newEndLocal = '';
        // refresh con overlay loader (no "salto" percepito)
        this.refresh();
      });
  }

  startEdit(s: SlotDto): void {
    this.editingId = s.id;
    this.editStartLocal = this.isoToLocalInput(s.startDate);
    this.editEndLocal = this.isoToLocalInput(s.endDate);
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editStartLocal = '';
    this.editEndLocal = '';
  }

  saveEdit(): void {
    if (!this.canSaveEdit() || !this.editingId) return;

    const id = this.editingId;
    const startDate = this.localToIso(this.editStartLocal);
    const endDate = this.localToIso(this.editEndLocal);

    this.loading.set(true);
    this.service
      .update(id, { startDate, endDate })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        this.cancelEdit();
        this.refresh();
      });
  }

  // ---------- Delete modal flow ----------
  openDelete(s: SlotDto): void {
    this.deleteTarget.set(s);
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.loading()) return;

    this.loading.set(true);
    this.service
      .delete(target.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        if (this.editingId === target.id) this.cancelEdit();
        this.closeDelete();
        this.refresh();
      });
  }
}
