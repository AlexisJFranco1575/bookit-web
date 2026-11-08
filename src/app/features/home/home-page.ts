import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <h1>Appointments without the phone calls</h1>
      <p class="muted">
        Businesses publish their services and working hours. Customers pick a free slot and book it online, with no
        account, and get confirmation and reminder emails.
      </p>

      <div class="actions">
        @if (demoBusinessId) {
          <a class="btn btn--primary" [routerLink]="['/b', demoBusinessId]">Try the live demo</a>
        }

        @if (auth.isAuthenticated()) {
          <a class="btn" routerLink="/dashboard">Go to my businesses</a>
        } @else {
          <a class="btn" routerLink="/register">I run a business</a>
        }
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h2>For customers</h2>
        <p class="muted">Choose a service and a day, see the free times in the business time zone, and book in seconds.</p>
      </article>
      <article class="card">
        <h2>For owners</h2>
        <p class="muted">Create services and providers with weekly hours, share one link, and read your agenda by day.</p>
      </article>
      <article class="card">
        <h2>No double bookings</h2>
        <p class="muted">The server guarantees one booking per slot, even when two people click at the same moment.</p>
      </article>
    </section>
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly demoBusinessId = environment.demoBusinessId;
}