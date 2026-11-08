import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { describeError } from '../../core/api-error';
import { BookitApi } from '../../core/bookit-api';
import { Business } from '../../core/models';
import { browserTimeZone, timeZoneOptions } from '../../core/time';

@Component({
  selector: 'app-dashboard-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>My businesses</h1>
    </header>

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else if (loadError(); as message) {
      <p class="alert" role="alert">{{ message }}</p>
    } @else {
      @if (businesses().length === 0) {
        <p class="notice">You have no businesses yet. Create the first one below.</p>
      } @else {
        <div class="grid">
          @for (shop of businesses(); track shop.id) {
            <article class="card stack">
              <h2>{{ shop.name }}</h2>
              <p class="muted">{{ shop.timeZoneId }}</p>
              <div class="actions">
                <a class="btn btn--primary" [routerLink]="['/dashboard', shop.id]">Manage</a>
                <a class="btn" [routerLink]="['/b', shop.id]">Booking page</a>
              </div>
            </article>
          }
        </div>
      }
    }

    <section class="card stack" style="margin-top: 1.5rem">
      <h2>New business</h2>

      @if (createError(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="create()" novalidate>
        <div class="row">
          <div class="field">
            <label for="name">Name</label>
            <input id="name" type="text" formControlName="name" />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <small class="field-error">Enter a name (up to 100 characters).</small>
            }
          </div>

          <div class="field">
            <label for="timeZoneId">Time zone</label>
            <select id="timeZoneId" formControlName="timeZoneId">
              @for (zone of zones; track zone) {
                <option [value]="zone">{{ zone }}</option>
              }
            </select>
          </div>

          <button type="submit" class="btn btn--primary" [disabled]="creating()">
            {{ creating() ? 'Creating…' : 'Create business' }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class DashboardPage {
  private readonly api = inject(BookitApi);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly zones = timeZoneOptions();

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly businesses = signal<Business[]>([]);

  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    timeZoneId: [browserTimeZone(), [Validators.required]],
  });

  constructor() {
    this.api.listMine().subscribe({
      next: (businesses) => {
        this.businesses.set(businesses);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(describeError(error));
        this.loading.set(false);
      },
    });
  }

  protected create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.creating()) {
      return;
    }

    this.creating.set(true);
    this.createError.set(null);

    const { name, timeZoneId } = this.form.getRawValue();

    this.api.createBusiness(name, timeZoneId).subscribe({
      next: (business) => void this.router.navigate(['/dashboard', business.id]),
      error: (error: unknown) => {
        this.createError.set(describeError(error));
        this.creating.set(false);
      },
    });
  }
}