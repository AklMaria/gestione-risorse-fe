import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Slots } from './slots/slots';
import { Availabilities } from './availabilities/availabilities';
import { Resources } from './resources/resources';


type CatalogueView = 'resources' | 'slots' | 'availabilities';

type ResourceVm = {
  id: string;
  name: string;
  description?: string;
};

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, FormsModule,Resources, Slots, Availabilities],
  templateUrl: './catalogue.html',
  styleUrls: ['./catalogue.scss'],
})
export class CatalogueComponent {
  view = signal<CatalogueView>('resources');
  setView(v: CatalogueView) {
    this.view.set(v);
  }

  // ---- MOCK RESOURCES (MVP) ----
  resources = signal<ResourceVm[]>([
    { id: 'r-1', name: 'Sala Riunioni A', description: 'Piano 2' },
    { id: 'r-2', name: 'Laptop 01', description: 'MacBook Pro' },
  ]);

  // form (template-driven)
  newName = '';
  newDescription = '';

  canCreate = computed(() => this.newName.trim().length >= 2);

  createResource(): void {
    const name = this.newName.trim();
    const description = this.newDescription.trim();

    if (name.length < 2) return;

    const id = `r-${Date.now()}`;
    const next: ResourceVm = { id, name, description: description || undefined };

    this.resources.set([next, ...this.resources()]);
    this.newName = '';
    this.newDescription = '';
  }

  deleteResource(r: ResourceVm): void {
    if (!confirm(`Eliminare "${r.name}"?`)) return;
    this.resources.set(this.resources().filter((x) => x.id !== r.id));
  }
}
