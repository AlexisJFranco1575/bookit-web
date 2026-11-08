import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { CurrentUser, LoginResponse, RegisterRequest } from './models';

export const TOKEN_STORAGE_KEY = 'bookit.token';

interface TokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
}

/**
 * Reads the identity out of a JWT. The signature is NOT verified here: the browser only uses
 * these claims to decide what to show, and the API validates the token on every request.
 */
export function decodeToken(token: string): CurrentUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
    const claims = JSON.parse(json) as TokenClaims;

    if (!claims.sub || typeof claims.exp !== 'number') {
      return null;
    }

    return {
      id: claims.sub,
      email: claims.email ?? '',
      name: claims.name ?? '',
      expiresAt: claims.exp * 1000,
    };
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return null;
    }

    const user = decodeToken(token);
    if (user && user.expiresAt > Date.now()) {
      return token;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); behave as signed out.
  }

  return null;
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore: the session then lasts only until the page is reloaded.
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenState = signal<string | null>(readStoredToken());

  readonly token = this.tokenState.asReadonly();

  readonly user = computed<CurrentUser | null>(() => {
    const token = this.tokenState();
    return token ? decodeToken(token) : null;
  });

  /** True when there is a token that has not expired yet. Checked at call time, not cached. */
  isAuthenticated(): boolean {
    const user = this.user();
    return user !== null && user.expiresAt > Date.now();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, { email, password })
      .pipe(tap((response) => this.setToken(response.accessToken)));
  }

  register(request: RegisterRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/auth/register`, request);
  }

  logout(): void {
    this.setToken(null);
    void this.router.navigate(['/login']);
  }

  private setToken(token: string | null): void {
    writeStoredToken(token);
    this.tokenState.set(token);
  }
}