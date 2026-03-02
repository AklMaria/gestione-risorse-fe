import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';


import { AdminBookingsComponent } from './admin-bookings/admin-bookings';
import { UserBookingsComponent } from './user-bookings/user-bookings';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, UserBookingsComponent, AdminBookingsComponent],
  templateUrl: './bookings.html',
  styleUrls: ['./bookings.scss'],
})
export class BookingsComponent {
  mode = signal<'user' | 'admin'>('user');

  setMode(m: 'user' | 'admin') {
    this.mode.set(m);
  }
}
