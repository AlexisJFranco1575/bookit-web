import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { describeError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card auth-card">
      <h1>Create your business account</h1>
      <p class="muted">You will be able to create businesses, services and providers.</p>

      @if (error(); as message) {
        <p class="alert" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="fullName">Full name</label>
          <input id="fullName" type="text" formControlName="fullName" autocomplete="name" />
          @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
            <small class="field-error">Enter your name (up to 100 characters).</small>
          }
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small class="field-error">Enter a valid email address.</small>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="new-password" />
          <small class="muted">At least 10 characters, with a letter and a number.</small>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="field-error">The password must have 10 to 128 characters, a letter and a number.</small>
          }
        </div>

        <button type="submit" class="btn btn--primary btn--block" [disabled]="busy()">
          {{ busy() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="muted">Already registered? <a routerLink="/login">Sign in</a>.</p>
    </section>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(128),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
      ],
    ],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();

    // Create the account, then sign in right away so the owner lands on the dashboard.
    this.auth
      .register(value)
      .pipe(switchMap(() => this.auth.login(value.email, value.password)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/dashboard'),
        error: (error: unknown) => {
          this.error.set(describeError(error));
          this.busy.set(false);
        },
      });
  }
}