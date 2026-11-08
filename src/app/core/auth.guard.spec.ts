import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { makeToken, validClaims } from '../testing/make-token';
import { authGuard, guestGuard } from './auth.guard';
import { TOKEN_STORAGE_KEY } from './auth.service';

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  function runAuthGuard(url: string): unknown {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  function runGuestGuard(): unknown {
    return TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  }

  it('sends anonymous visitors to the login page and remembers where they were going', () => {
    const result = runAuthGuard('/dashboard/42');

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fdashboard%2F42');
  });

  it('lets signed-in owners reach the dashboard', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, makeToken(validClaims()));

    expect(runAuthGuard('/dashboard')).toBe(true);
  });

  it('lets anonymous visitors see the login page', () => {
    expect(runGuestGuard()).toBe(true);
  });

  it('sends signed-in owners away from the login page', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, makeToken(validClaims()));

    const result = runGuestGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});