import { Routes } from '@angular/router';

// Layout
import { ShellComponent } from './layout/shell/shell';

// Pages
import { CatalogueComponent } from './pages/catalogue/catalogue';
import { BookingsComponent } from './pages/bookings/bookings';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'catalogue', pathMatch: 'full' },
      { path: 'catalogue', component: CatalogueComponent },
      { path: 'bookings', component: BookingsComponent },
    ],
  },
  { path: '**', redirectTo: 'catalogue' },
];
