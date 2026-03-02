import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-bookings.html',
  styleUrls: ['./user-bookings.scss'],
})
export class UserBookingsComponent {
  view = signal<'browse' | 'my'>('browse');

  setView(v: 'browse' | 'my') {
    this.view.set(v);
  }
}
