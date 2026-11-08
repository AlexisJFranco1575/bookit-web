import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';

import { describeError } from '../../core/api-error';
import { BookitApi } from '../../core/bookit-api';
import { Availability, Business, Provider, ServiceItem, Slot } from '../../core/models';
import { addDays, formatDay, isValidDate, localDate, localTime, todayIn } from '../../core/time';

@Component({
  selector: 'app-booking-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else if (loadError(); as message) {
      <p class="alert" role="alert">{{ message }}</p>
    } @else if (business(); as shop) {
      <header class="page-header">
        <div>
          <h1>{{ shop.name }}</h1>
          <p class="muted">Book an appointment online. All times are in {{ shop.timeZoneId }}.</p>
        </div>
      </header>

      @if (services().length === 0 || providers().length === 0) {
        <p class="card">This business has not finished setting up its services yet. Please check back soon.</p>
      } @else {
        <section class="card stack">
          <div class="row">
            <div class="field">
              <label for="service">1. Service</label>
              <select id="service" (change)="onService($event)">
                <option value="">Choose a service…</option>
                @for (service of services(); track service.id) {
                  <option [value]="service.id">{{ service.name }} ({{ service.durationMinutes }} min)</option>
                }
              </select>
            </div>

            <div class="field">
              <label for="provider">2. With</label>
              <select id="provider" (change)="onProvider($event)">
                <option value="">Choose who…</option>
                @for (provider of providers(); track provider.id) {
                  <option [value]="provider.id">{{ provider.name }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label for="date">3. Day</label>
              <input
                id="date"
                type="date"
                [value]="date()"
                [min]="today()"
                [max]="maxDate()"
                (change)="onDate($event)"
              />
            </div>
          </div>

          @if (slotQuery()) {
            <div aria-live="polite">
              <h2>4. Pick a time</h2>

              @if (slotsLoading()) {
                <p class="muted">Looking for free times…</p>
              } @else if (slotsError(); as message) {
                <p class="alert" role="alert">{{ message }}</p>
              } @else if (slots().length === 0) {
                <p class="notice">There are no free times on {{ dayLabel() }}. Try another day.</p>
              } @else {
                <div class="slots">
                  @for (slot of slots(); track slot.startsAt) {
                    <button
                      type="button"
                      class="slot"
                      [class.slot--selected]="selectedSlot()?.startsAt === slot.startsAt"
                      [attr.aria-pressed]="selectedSlot()?.startsAt === slot.startsAt"
                      (click)="selectedSlot.set(slot)"
                    >
                      {{ time(slot.localStartsAt) }}
                    </button>
                  }
                </div>
              }
            </div>
          }
        </section>

        @if (selectedSlot(); as slot) {
          <section class="card stack">
            <h2>5. Your details</h2>
            <p class="notice">
              {{ selectedServiceName() }} with {{ selectedProviderName() }} on
              <strong>{{ day(localDay(slot.localStartsAt)) }}</strong> at <strong>{{ time(slot.localStartsAt) }}</strong>.
            </p>

            @if (submitError(); as message) {
              <p class="alert" role="alert">{{ message }}</p>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="field">
                <label for="customerName">Your name</label>
                <input id="customerName" type="text" formControlName="customerName" autocomplete="name" />
                @if (form.controls.customerName.touched && form.controls.customerName.invalid) {
                  <small class="field-error">Enter your name (up to 100 characters).</small>
                }
              </div>

              <div class="field">
                <label for="customerEmail">Your email</label>
                <input id="customerEmail" type="email" formControlName="customerEmail" autocomplete="email" />
                <small class="muted">We send the confirmation and a reminder here.</small>
                @if (form.controls.customerEmail.touched && form.controls.customerEmail.invalid) {
                  <small class="field-error">Enter a valid email address.</small>
                }
              </div>

              <button type="submit" class="btn btn--primary" [disabled]="submitting()">
                {{ submitting() ? 'Booking…' : 'Confirm booking' }}
              </button>
            </form>
          </section>
        }
      }
    }
  `,
})
export class BookingPage {
  private readonly api = inject(BookitApi);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly businessId = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly business = signal<Business | null>(null);
  protected readonly services = signal<ServiceItem[]>([]);
  protected readonly providers = signal<Provider[]>([]);

  protected readonly serviceId = signal('');
  protected readonly providerId = signal('');
  protected readonly date = signal('');

  protected readonly slots = signal<Slot[]>([]);
  protected readonly slotsLoading = signal(false);
  protected readonly slotsError = signal<string | null>(null);
  protected readonly selectedSlot = signal<Slot | null>(null);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    customerName: ['', [Validators.required, Validators.maxLength(100)]],
    customerEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected readonly time = localTime;
  protected readonly day = formatDay;
  protected readonly localDay = localDate;

  protected readonly today = computed(() => {
    const shop = this.business();
    return shop ? todayIn(shop.timeZoneId) : '';
  });

  protected readonly maxDate = computed(() => (this.today() ? addDays(this.today(), 60) : ''));
  protected readonly dayLabel = computed(() => formatDay(this.date()));

  protected readonly selectedServiceName = computed(
    () => this.services().find((service) => service.id === this.serviceId())?.name ?? '',
  );

  protected readonly selectedProviderName = computed(
    () => this.providers().find((provider) => provider.id === this.providerId())?.name ?? '',
  );

  /** Bumped after a conflict so the free times are loaded again even though nothing else changed. */
  private readonly refreshTick = signal(0);

  protected readonly slotQuery = computed(() => {
    const service = this.serviceId();
    const provider = this.providerId();
    const date = this.date();

    return service && provider && isValidDate(date) ? { service, provider, date, tick: this.refreshTick() } : null;
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

        if (data) {
          this.business.set(data.business);
          this.services.set(data.services);
          this.providers.set(data.providers);
          this.date.set(todayIn(data.business.timeZoneId));
        }
      });

    toObservable(this.slotQuery)
      .pipe(
        tap(() => {
          this.selectedSlot.set(null);
          this.slotsError.set(null);
        }),
        switchMap((query) => {
          if (!query) {
            return of<Availability | null>(null);
          }

          this.slotsLoading.set(true);

          return this.api.getAvailability(query.provider, query.service, query.date, query.date).pipe(
            catchError((error: unknown) => {
              this.slotsError.set(describeError(error));
              return of<Availability | null>(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((availability) => {
        this.slotsLoading.set(false);
        this.slots.set(availability?.slots ?? []);
      });
  }

  protected onService(event: Event): void {
    this.serviceId.set((event.target as HTMLSelectElement).value);
  }

  protected onProvider(event: Event): void {
    this.providerId.set((event.target as HTMLSelectElement).value);
  }

  protected onDate(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const slot = this.selectedSlot();
    const shop = this.business();

    if (!slot || !shop) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const { customerName, customerEmail } = this.form.getRawValue();

    this.api
      .book({
        providerId: this.providerId(),
        serviceId: this.serviceId(),
        startsAt: slot.startsAt,
        customerName,
        customerEmail,
      })
      .subscribe({
        next: (appointment) =>
          void this.router.navigate(['/appointment', appointment.id], { queryParams: { business: shop.id } }),
        error: (error: unknown) => {
          this.submitError.set(describeError(error));
          this.submitting.set(false);
          // Most likely somebody took the slot a moment ago: show the free times again.
          this.refreshTick.update((tick) => tick + 1);
        },
      });
  }
}