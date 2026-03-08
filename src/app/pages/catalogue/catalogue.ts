import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Resources } from './resources/resources';
import { Slots } from './slots/slots';
import { Availabilities } from './availabilities/availabilities'; // se il tuo export è "Availabilities"
// se invece esporti AvailabilitiesComponent, cambia riga in:
// import { AvailabilitiesComponent } from './availabilities/availabilities';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, Resources, Slots, Availabilities],
  // se usi AvailabilitiesComponent: imports: [CommonModule, ResourcesComponent, SlotsComponent, AvailabilitiesComponent],
  templateUrl: './catalogue.html',
  styleUrls: ['./catalogue.scss'],
})
export class CatalogueComponent {
  view = signal<'resources' | 'slots' | 'availabilities'>('resources');

  setView(v: 'resources' | 'slots' | 'availabilities') {
    this.view.set(v);
  }
}
