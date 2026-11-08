import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';

import { describeError } from '../../core/api-error';
import { BookitApi } from '../../core/bookit-api';
import { Appointment, Business, Provider, ServiceItem } from '../../core/models';
import { formatInstant } from '../../core/time';
import { Badge } from '../../shared/badge';

interface BusinessContext {
  business: Business;
  services: ServiceItem[];
  providers: Provider[];
}

@Component({
  selector: 'app-appointment-page',
  imports: [Badge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else if (loadError(); as message) {
      <p class="alert" role="alert">{{ message }}</p>
    } @else if (appointment(); as item) {
      <section class="card stack">
        <div class="page-header">
          <h1>Your appointment</h1>
          <app-badge [value]="item.status" />
        </div>

        @if (item.status === 'Booked') {
          <p class="notice">
            You are booked. We emailed a confirmation to <strong>{{ item.customerEmail }}</strong> and will send a
            reminder a day before.
          </p>
        }

        <dl class="details">
          @if (serviceName(); as service) {
            <dt>Service</dt>
            <dd>{{ service }}</dd>
          }
          @if (providerName(); as provider) {
            <dt>With</dt>
            <dd>{{ provider }}</dd>
          }
          <dt>When</dt>
          <dd>{{ when() }}</dd>
          <dt>Name</dt>
          <dd>{{ item.customerName }}</dd>
        </dl>

        @if (!context()) {
          <p class="muted">Times are shown in the time zone of this device.</p>
        }

        @if (actionError(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        @if (item.status === 'Booked') {
          @if (confirming()) {
            <div class="actions">
              <span>Cancel this appointment?</span>
              <button type="button" class="btn btn--danger" [disabled]="cancelling()" (click)="cancel()">
                {{ cancelling() ? 'Cancelling…' : 'Yes, cancel it' }}
              </button>
              <button type="button" class="btn btn--ghost" (click)="confirming.set(false)">Keep it</button>
            </div>
          } @else {
            <button type="button" class="btn btn--danger" (click)="confirming.set(true)">Cancel appointment</button>
          }

          <p class="muted">Keep this page address: it is the only way to see or cancel your appointment.</p>
        }

        @if (context(); as ctx) {
          <a [routerLink]="['/b', ctx.business.id]">Book another appointment</a>
        }
      </section>
    }
  `,
  styles: `
    .details {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.4rem 1.5rem;
      margin: 0;
    }

    .details dt {
      color: var(--muted);
    }

    .details dd {
      margin: 0;
    }
  `,
})
export class AppointmentPage {
  private readonly api = inject(BookitApi);

  readonly id = input.required<string>();
  /** The business id, from the ?business= query parameter. It lets the page show names and the right time zone. */
  readonly business = input<string>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly appointment = signal<Appointment | null>(null);
  protected readonly context = signal<BusinessContext | null>(null);

  protected readonly confirming = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly serviceName = computed(() => {
    const item = this.appointment();
    return this.context()?.services.find((service) => service.id === item?.serviceId)?.name ?? '';
  });

  protected readonly providerName = computed(() => {
    const item = this.appointment();
    return this.context()?.providers.find((provider) => provider.id === item?.providerId)?.name ?? '';
  });

  protected readonly when = computed(() => {
    const item = this.appointment();
    return item ? formatInstant(item.startsAt, this.context()?.business.timeZoneId) : '';
  });

  private readonly request = computed(() => ({ id: this.id(), business: this.business() }));

  constructor() {
    toObservable(this.request)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap(({ id, business }) =>
          forkJoin({
            appointment: this.api.getAppointment(id),
            context: business
              ? forkJoin({
                  business: this.api.getBusiness(business),
                  services: this.api.listServices(business),
                  providers: this.api.listProviders(business),
                }).pipe(catchError(() => of<BusinessContext | null>(null)))
              : of<BusinessContext | null>(null),
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
          this.appointment.set(data.appointment);
          this.context.set(data.context);
        }
      });
  }

  protected cancel(): void {
    if (this.cancelling()) {
      return;
    }

    this.cancelling.set(true);
    this.actionError.set(null);

    this.api.cancelAppointment(this.id()).subscribe({
      next: (updated) => {
        this.appointment.set(updated);
        this.confirming.set(false);
        this.cancelling.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(describeError(error));
        this.cancelling.set(false);
      },
    });
  }
}