import { Component, inject } from '@angular/core';
import { RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [RouterOutlet, RouterLinkActive],
})
export class App {
  private auth = inject(AuthService);

  constructor() {

  }
}
