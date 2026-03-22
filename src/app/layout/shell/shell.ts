import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss'],
})
export class ShellComponent {
  auth = inject(AuthService);

  setRole(role: 'user' | 'admin') {
    // uses your AuthService as-is (setRole OR signal)
    (this.auth as any).setRole
      ? (this.auth as any).setRole(role)
      : (this.auth as any).role.set(role);
  }
}
