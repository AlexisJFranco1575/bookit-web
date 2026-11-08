import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { makeToken, validClaims } from '../testing/make-token';
import { AuthService, TOKEN_STORAGE_KEY, decodeToken } from './auth.service';

describe('decodeToken', () => {
  it('reads the identity from the claims', () => {
    const user = decodeToken(makeToken(validClaims()));

    expect(user?.id).toBe('user-1');
    expect(user?.email).toBe('ana@example.com');
    expect(user?.name).toBe('Ana');
  });

  it('rejects a token without an expiry', () => {
    expect(decodeToken(makeToken(validClaims({ exp: undefined })))).toBeNull();
  });

  it('rejects a token without a subject', () => {
    expect(decodeToken(makeToken(validClaims({ sub: undefined })))).toBeNull();
  });

  it('rejects garbage', () => {
    expect(decodeToken('not-a-token')).toBeNull();
  });
});

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(): { service: AuthService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    return { service: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
  }

  it('starts signed out', () => {
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('signs in, keeps the token and exposes the owner', () => {
    const { service, http } = setup();
    const token = makeToken(validClaims());

    service.login('ana@example.com', 'secret').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@example.com', password: 'secret' });
    request.flush({ accessToken: token });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.name).toBe('Ana');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(token);
  });

  it('restores a valid session from storage', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, makeToken(validClaims()));

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(true);
  });

  it('ignores and removes an expired token from storage', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, makeToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 60 })));

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('signs out, clears storage and goes to the login page', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, makeToken(validClaims()));
    const { service } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});