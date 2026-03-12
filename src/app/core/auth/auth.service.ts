import { Injectable, signal } from '@angular/core';

export type AppRole = 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Ruolo (per ora hardcoded)
  role = signal<AppRole>('admin');

  setRole(role: AppRole): void {
    this.role.set(role);
  }

  isAdmin(): boolean {
    return this.role() === 'admin';
  }

  isUser(): boolean {
    return this.role() === 'user';
  }
}
