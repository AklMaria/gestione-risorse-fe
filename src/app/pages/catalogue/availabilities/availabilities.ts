import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { AvailabilitiesService } from '../services/availabilities.service';
import { ResourcesService } from '../services/resources.service';
import { SlotsService } from '../services/slots.service';

import { AvailabilityDto, UUID } from '../dto/availabilities.dto';
import { SlotDto } from '../dto/slots.dto';
import { ResourcesDto } from '../dto/resources.dto';

@Component({
  selector: 'app-availabilities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availabilities.html',
  styleUrls: ['./availabilities.scss'],
})
export class Availabilities implements OnInit {
  private readonly availService = inject(AvailabilitiesService);
  private readonly resourcesService = inject(ResourcesService);
  private readonly slotsService = inject(SlotsService);

  loading = signal(false);

  resources = signal<ResourcesDto[]>([]);
  slots = signal<SlotDto[]>([]);

  selectedResourceId = signal<UUID | ''>('');
  availabilities = signal<AvailabilityDto[]>([]);

  // Create modal state
  createOpen = signal(false);
  createSlotId = '';
  createCapacity: number | null = null;

  // Edit capacity inline
  editingId: UUID | null = null;
  editCapacity: number | null = null;

  // Delete modal
  deleteOpen = signal(false);
  deleteTarget = signal<AvailabilityDto | null>(null);

  ngOnInit(): void {
    this.loadReferenceData();
  }

  // ---------- helpers ----------
  formatNice(iso: string): string {
    // “02/03/2026, 11:00” in IT locale
    return new Date(iso).toLocaleString();
  }

  selectedResourceName(): string {
    const rid = this.selectedResourceId();
    if (!rid) return '';
    return this.resources().find((r) => r.id === rid)?.name ?? '';
  }

  slotRange(slotId: UUID): string {
    const s = this.slots().find((x) => x.id === slotId);
    if (!s) return '';
    // solo range, senza UUID
    return `${this.formatNice(s.startDate)} → ${this.formatNice(s.endDate)}`;
  }

  availabilityLabel(a: AvailabilityDto): string {
    const resourceName = this.selectedResourceName();
    const range = this.slotRange(a.slotId);
    // es: "Room A — 02/03/2026, 11:00 → 02/03/2026, 13:00"
    if (resourceName && range) return `${resourceName} — ${range}`;
    return range || resourceName || '';
  }

  available(a: AvailabilityDto): number {
    return Math.max(0, (a.capacity ?? 0) - (a.consumed ?? 0));
  }

  isEditing(a: AvailabilityDto): boolean {
    return this.editingId === a.id;
  }

  canSaveEdit(): boolean {
    if (this.loading() || !this.editingId) return false;
    if (this.editCapacity === null || this.editCapacity === undefined) return false;
    return Number.isFinite(this.editCapacity) && this.editCapacity >= 0;
  }

  canOpenCreate(): boolean {
    return !!this.selectedResourceId() && !this.loading();
  }

  canCreate(): boolean {
    if (this.loading()) return false;
    if (!this.selectedResourceId()) return false;
    if (!this.createSlotId) return false;
    if (this.createCapacity === null || this.createCapacity === undefined) return false;
    return Number.isFinite(this.createCapacity) && this.createCapacity >= 0;
  }

  // ---------- load ----------
  loadReferenceData(): void {
    this.loading.set(true);
    let done = 0;
    const finishOne = () => {
      done += 1;
      if (done === 2) this.loading.set(false);
    };

    this.resourcesService.list().subscribe({
      next: (items) => this.resources.set(items ?? []),
      error: () => {},
      complete: finishOne,
    });

    this.slotsService.list().subscribe({
      next: (items) => this.slots.set(items ?? []),
      error: () => {},
      complete: finishOne,
    });
  }

  refreshAvailabilities(): void {
    const rid = this.selectedResourceId();
    if (!rid) {
      this.availabilities.set([]);
      return;
    }

    this.loading.set(true);
    this.availService
      .listByResource(rid)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((items) => this.availabilities.set(items ?? []));
  }

  onSelectResource(resourceId: string): void {
    this.selectedResourceId.set(resourceId as any);
    this.cancelEdit();
    this.closeCreate();
    this.refreshAvailabilities();
  }

  // ---------- create modal flow ----------
  openCreate(): void {
    if (!this.canOpenCreate()) return;
    this.createSlotId = '';
    this.createCapacity = null;
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
    this.createSlotId = '';
    this.createCapacity = null;
  }

  create(): void {
    const rid = this.selectedResourceId();
    if (!rid || !this.canCreate()) return;

    this.loading.set(true);
    this.availService
      .create({
        resourceId: rid,
        slotId: this.createSlotId as UUID,
        capacity: Number(this.createCapacity),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        this.closeCreate();
        this.refreshAvailabilities();
      });
  }

  // ---------- edit capacity ----------
  startEdit(a: AvailabilityDto): void {
    this.editingId = a.id;
    this.editCapacity = a.capacity;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editCapacity = null;
  }

  saveEdit(): void {
    if (!this.canSaveEdit() || !this.editingId) return;

    const id = this.editingId;
    const cap = Number(this.editCapacity);

    this.loading.set(true);
    this.availService
      .update(id, { capacity: cap })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        this.cancelEdit();
        this.refreshAvailabilities();
      });
  }

  // ---------- delete modal ----------
  openDelete(a: AvailabilityDto): void {
    this.deleteTarget.set(a);
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
    this.availService
      .delete(target.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        if (this.editingId === target.id) this.cancelEdit();
        this.closeDelete();
        this.refreshAvailabilities();
      });
  }

  trackById(_: number, x: { id: string }) {
    return x.id;
  }
}
