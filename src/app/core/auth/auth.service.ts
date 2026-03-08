import { Injectable, signal } from '@angular/core';

export type AppRole = 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ✅ Imposta qui il ruolo (per ora hardcoded)
  role = signal<AppRole>('user');

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
