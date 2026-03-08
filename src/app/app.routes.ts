import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell';
import { CatalogueComponent } from './pages/catalogue/catalogue';
import { BookingsComponent } from './pages/bookings/bookings';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: 'bookings', component: BookingsComponent },

      // Solo admin
      { path: 'catalogue', component: CatalogueComponent, canActivate: [adminGuard] },

      //  user apre direttamente bookings
      { path: '', pathMatch: 'full', redirectTo: 'bookings' },
    ],
  },

  { path: '**', redirectTo: 'bookings' },
];
