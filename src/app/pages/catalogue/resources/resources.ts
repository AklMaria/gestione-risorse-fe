import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ResourcesService } from '../services/resources.service';
import { ResourcesDto, UUID } from '../dto/resources.dto';


@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resources.html',
  styleUrls: ['./resources.scss'],
})
export class Resources implements OnInit {
  private readonly service = inject(ResourcesService);

  loading = signal(false);
  resources = signal<ResourcesDto[]>([]);

  // Create form
  newName = '';
  newDescription = '';

  // Edit state
  editingId: UUID | null = null;
  editName = '';
  editDescription = '';

  // Delete modal state
  deleteOpen = signal(false);
  deleteTarget = signal<ResourcesDto | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  canCreate(): boolean {
    return !this.loading() && this.newName.trim().length >= 2;
  }

  canSaveEdit(): boolean {
    return !this.loading() && this.editingId !== null && this.editName.trim().length >= 2;
  }

  isEditing(r: ResourcesDto): boolean {
    return this.editingId === r.id;
  }

  refresh(): void {
    this.loading.set(true);
    this.service
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((items) => this.resources.set(items ?? []));
  }

  create(): void {
    const name = this.newName.trim();
    const description = this.newDescription.trim();
    if (name.length < 2 || this.loading()) return;

    this.loading.set(true);
    this.service
      .create({ name, description: description || null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        this.newName = '';
        this.newDescription = '';
        this.refresh();
      });
  }

  startEdit(r: ResourcesDto): void {
    this.editingId = r.id;
    this.editName = r.name ?? '';
    this.editDescription = (r.description ?? '') as string;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName = '';
    this.editDescription = '';
  }

  saveEdit(): void {
    if (!this.canSaveEdit() || this.loading() || !this.editingId) return;

    const id = this.editingId;
    const name = this.editName.trim();
    const description = this.editDescription.trim();

    this.loading.set(true);
    this.service
      .update(id, { name, description: description || null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(() => {
        this.cancelEdit();
        this.refresh();
      });
  }

  // ---- Delete modal flow ----
  openDelete(r: ResourcesDto): void {
    this.deleteTarget.set(r);
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
        // se stavi editando proprio quella risorsa, chiudi edit
        if (this.editingId === target.id) this.cancelEdit();

        this.closeDelete();
        this.refresh();
      });
  }
}
