import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';

import { describeError } from '../../core/api-error';
import { BookitApi } from '../../core/bookit-api';
import { AgendaItem, Business, DAYS, DayName, Provider, ServiceItem } from '../../core/models';
import { addDays, formatDay, isValidDate, localDate, localTime, todayIn } from '../../core/time';
import { Badge } from '../../shared/badge';

@Component({
  selector: 'app-business-page',
  imports: [ReactiveFormsModule, RouterLink, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/dashboard" class="back">← My businesses</a>

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else if (loadError(); as message) {
      <p class="alert" role="alert">{{ message }}</p>
    } @else if (business(); as shop) {
      <header class="page-header">
        <div>
          <h1>{{ shop.name }}</h1>
          <p class="muted">Time zone: {{ shop.timeZoneId }}</p>
        </div>
      </header>

      <div class="stack">
        <section class="card stack">
          <h2>Booking link</h2>
          <p class="muted">Share this link with your customers. They do not need an account.</p>
          <div class="share">
            <input readonly [value]="shareUrl()" aria-label="Booking link" />
            <button type="button" class="btn" (click)="copy()">{{ copied() ? 'Copied' : 'Copy' }}</button>
          </div>
          <a [routerLink]="['/b', shop.id]">Open the booking page</a>
        </section>

        <section class="card stack">
          <h2>Agenda</h2>

          <div class="row">
            <div class="field">
              <label for="from">From</label>
              <input id="from" type="date" [value]="from()" (change)="onFrom($event)" />
            </div>
            <div class="field">
              <label for="to">To</label>
              <input id="to" type="date" [value]="to()" (change)="onTo($event)" />
            </div>
            <button type="button" class="btn btn--primary" [disabled]="agendaLoading()" (click)="loadAgenda()">
              {{ agendaLoading() ? 'Loading…' : 'Show' }}
            </button>
          </div>

          @if (agendaError(); as message) {
            <p class="alert" role="alert">{{ message }}</p>
          } @else if (agenda().length === 0 && !agendaLoading()) {
            <p class="notice">No appointments in this range.</p>
          }

          @for (group of agendaDays(); track group.date) {
            <h3 class="day-title">{{ day(group.date) }}</h3>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Provider</th>
                    <th>Service</th>
                    <th>Customer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of group.items; track item.id) {
                    <tr>
                      <td>{{ time(item.localStartsAt) }}</td>
                      <td>{{ item.providerName }}</td>
                      <td>{{ item.serviceName }}</td>
                      <td>
                        {{ item.customerName }}<br /><small class="muted">{{ item.customerEmail }}</small>
                      </td>
                      <td><app-badge [value]="item.status" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="card stack">
          <h2>Services</h2>

          @if (services().length === 0) {
            <p class="notice">No services yet. Add the first one.</p>
          } @else {
            <ul class="list">
              @for (service of services(); track service.id) {
                <li>
                  <span>{{ service.name }}</span>
                  <span class="muted">{{ service.durationMinutes }} min</span>
                </li>
              }
            </ul>
          }

          @if (serviceError(); as message) {
            <p class="alert" role="alert">{{ message }}</p>
          }

          <form [formGroup]="serviceForm" (ngSubmit)="addService()" novalidate>
            <div class="row">
              <div class="field">
                <label for="serviceName">Name</label>
                <input id="serviceName" type="text" formControlName="name" />
                @if (serviceForm.controls.name.touched && serviceForm.controls.name.invalid) {
                  <small class="field-error">Enter a name (up to 100 characters).</small>
                }
              </div>
              <div class="field">
                <label for="duration">Minutes</label>
                <input id="duration" type="number" formControlName="durationMinutes" min="5" max="480" step="5" />
                @if (serviceForm.controls.durationMinutes.invalid) {
                  <small class="field-error">Between 5 and 480.</small>
                }
              </div>
              <button type="submit" class="btn btn--primary" [disabled]="serviceSaving()">Add service</button>
            </div>
          </form>
        </section>

        <section class="card stack">
          <h2>Providers</h2>

          @if (providers().length === 0) {
            <p class="notice">No providers yet. Add the first one with their weekly hours.</p>
          } @else {
            <ul class="list">
              @for (provider of providers(); track provider.id) {
                <li>
                  <strong>{{ provider.name }}</strong>
                  <span class="muted">{{ hours(provider) }}</span>
                </li>
              }
            </ul>
          }

          @if (providerError(); as message) {
            <p class="alert" role="alert">{{ message }}</p>
          }

          <form [formGroup]="providerForm" (ngSubmit)="addProvider()" novalidate>
            <div class="field">
              <label for="providerName">Name</label>
              <input id="providerName" type="text" formControlName="name" />
              @if (providerForm.controls.name.touched && providerForm.controls.name.invalid) {
                <small class="field-error">Enter a name (up to 100 characters).</small>
              }
            </div>

            <p><strong>Weekly hours</strong> <span class="muted">(local time of the business)</span></p>

            <div formArrayName="periods">
              @for (period of periods.controls; track $index; let i = $index) {
                <div class="period" [formGroupName]="i">
                  <select formControlName="day" [attr.aria-label]="'Day of period ' + (i + 1)">
                    @for (dayName of days; track dayName) {
                      <option [value]="dayName">{{ dayName }}</option>
                    }
                  </select>
                  <input type="time" formControlName="start" [attr.aria-label]="'Start of period ' + (i + 1)" />
                  <input type="time" formControlName="end" [attr.aria-label]="'End of period ' + (i + 1)" />
                  <button
                    type="button"
                    class="btn btn--ghost"
                    [disabled]="periods.length === 1"
                    (click)="removePeriod(i)"
                  >
                    Remove
                  </button>
                </div>
              }
            </div>

            <div class="actions">
              <button type="button" class="btn" (click)="addPeriod()">Add another period</button>
              <button type="submit" class="btn btn--primary" [disabled]="providerSaving()">Add provider</button>
            </div>
          </form>
        </section>
      </div>
    }
  `,
})
export class BusinessPage {
  private readonly api = inject(BookitApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly businessId = input.required<string>();

  protected readonly days = DAYS;
  protected readonly time = localTime;
  protected readonly day = formatDay;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly business = signal<Business | null>(null);
  protected readonly services = signal<ServiceItem[]>([]);
  protected readonly providers = signal<Provider[]>([]);

  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly agenda = signal<AgendaItem[]>([]);
  protected readonly agendaLoading = signal(false);
  protected readonly agendaError = signal<string | null>(null);

  protected readonly copied = signal(false);

  protected readonly serviceSaving = signal(false);
  protected readonly serviceError = signal<string | null>(null);
  protected readonly providerSaving = signal(false);
  protected readonly providerError = signal<string | null>(null);

  protected readonly serviceForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    durationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(480)]],
  });

  protected readonly providerForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    periods: this.fb.array([this.newPeriod()]),
  });

  protected readonly periods = this.providerForm.controls.periods;

  protected readonly agendaDays = computed(() => {
    const groups = new Map<string, AgendaItem[]>();

    for (const item of this.agenda()) {
      const key = localDate(item.localStartsAt);
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    return [...groups.entries()].map(([date, items]) => ({ date, items }));
  });

  constructor() {
    toObservable(this.businessId)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap((id) =>
          forkJoin({
            mine: this.api.listMine(),
            business: this.api.getBusiness(id),
            services: this.api.listServices(id),
            providers: this.api.listProviders(id),
          }).pipe(
            catchError((error: unknown) => {
              this.loadError.set(describeError(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.loading.set(false);

        if (!data) {
          return;
        }

        if (!data.mine.some((candidate) => candidate.id === data.business.id)) {
          this.loadError.set('This business does not belong to your account.');
          return;
        }

        this.business.set(data.business);
        this.services.set(data.services);
        this.providers.set(data.providers);

        const today = todayIn(data.business.timeZoneId);
        this.from.set(today);
        this.to.set(addDays(today, 6));
        this.loadAgenda();
      });
  }

  protected shareUrl(): string {
    const shop = this.business();

    try {
      return shop ? new URL(`b/${shop.id}`, document.baseURI).href : '';
    } catch {
      return '';
    }
  }

  protected copy(): void {
    try {
      void navigator.clipboard
        .writeText(this.shareUrl())
        .then(() => this.copied.set(true))
        .catch(() => this.copied.set(false));
    } catch {
      // Clipboard access needs a secure context; the field stays selectable for a manual copy.
    }
  }

  protected hours(provider: Provider): string {
    if (provider.workingPeriods.length === 0) {
      return 'No hours set';
    }

    return provider.workingPeriods
      .map((period) => `${period.day.slice(0, 3)} ${period.start}–${period.end}`)
      .join(', ');
  }

  protected onFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  protected onTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  protected loadAgenda(): void {
    const shop = this.business();

    if (!shop) {
      return;
    }

    if (!isValidDate(this.from()) || !isValidDate(this.to()) || this.from() > this.to()) {
      this.agendaError.set('Choose a valid range: the first day cannot be after the last one.');
      return;
    }

    this.agendaLoading.set(true);
    this.agendaError.set(null);

    this.api.getAgenda(shop.id, this.from(), this.to()).subscribe({
      next: (items) => {
        this.agenda.set(items);
        this.agendaLoading.set(false);
      },
      error: (error: unknown) => {
        this.agendaError.set(describeError(error));
        this.agendaLoading.set(false);
      },
    });
  }

  protected addService(): void {
    const shop = this.business();

    if (!shop) {
      return;
    }

    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    if (this.serviceSaving()) {
      return;
    }

    this.serviceSaving.set(true);
    this.serviceError.set(null);

    this.api.createService(shop.id, this.serviceForm.getRawValue()).subscribe({
      next: (service) => {
        this.services.update((list) => [...list, service]);
        this.serviceForm.reset({ name: '', durationMinutes: 30 });
        this.serviceSaving.set(false);
      },
      error: (error: unknown) => {
        this.serviceError.set(describeError(error));
        this.serviceSaving.set(false);
      },
    });
  }

  protected addPeriod(): void {
    this.periods.push(this.newPeriod());
  }

  protected removePeriod(index: number): void {
    if (this.periods.length > 1) {
      this.periods.removeAt(index);
    }
  }

  protected addProvider(): void {
    const shop = this.business();

    if (!shop) {
      return;
    }

    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }

    const { name, periods } = this.providerForm.getRawValue();

    if (periods.some((period) => !period.start || !period.end || period.start >= period.end)) {
      this.providerError.set('Each period must end after it starts.');
      return;
    }

    if (this.providerSaving()) {
      return;
    }

    this.providerSaving.set(true);
    this.providerError.set(null);

    this.api.createProvider(shop.id, { name, workingPeriods: periods }).subscribe({
      next: (provider) => {
        this.providers.update((list) => [...list, provider]);
        this.providerForm.controls.name.reset('');
        this.periods.clear();
        this.periods.push(this.newPeriod());
        this.providerSaving.set(false);
      },
      error: (error: unknown) => {
        this.providerError.set(describeError(error));
        this.providerSaving.set(false);
      },
    });
  }

  private newPeriod() {
    return this.fb.group({
      day: this.fb.control<DayName>('Monday'),
      start: this.fb.control('09:00'),
      end: this.fb.control('17:00'),
    });
  }
}