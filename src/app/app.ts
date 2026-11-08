import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="container topbar__inner">
        <a routerLink="/" class="brand">Bookit</a>

        @if (auth.user(); as user) {
          <nav aria-label="Main">
            <a routerLink="/dashboard" routerLinkActive="active">My businesses</a>
          </nav>

          <div class="topbar__user">
            <span>{{ user.name || user.email }}</span>
            <button type="button" class="btn btn--ghost" (click)="auth.logout()">Sign out</button>
          </div>
        } @else {
          <nav aria-label="Main">
            <a routerLink="/login" routerLinkActive="active">Business sign in</a>
            <a routerLink="/register" routerLinkActive="active">Create account</a>
          </nav>
        }
      </div>
    </header>

    <main class="container">
      <router-outlet />
    </main>

    <footer class="footer">Appointment booking demo: Angular, .NET 10 and Azure SQL.</footer>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
}