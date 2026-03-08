import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/auth/auth.service';
import { UserBookingsComponent } from './user-bookings/user-bookings';
import { AdminBookingsComponent } from './admin-bookings/admin-bookings';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, UserBookingsComponent, AdminBookingsComponent],
  templateUrl: './bookings.html',
  styleUrls: ['./bookings.scss'],
})
export class BookingsComponent {
  auth = inject(AuthService);
}
