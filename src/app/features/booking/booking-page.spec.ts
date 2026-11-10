import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { BookingPage } from './booking-page';

describe('BookingPage', () => {
  const base = `${environment.apiUrl}/api`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('shows the business with its services and providers', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BookingPage);
    fixture.componentRef.setInput('businessId', 'b1');
    fixture.detectChanges();

    http.expectOne(`${base}/businesses/b1`).flush({
      id: 'b1',
      name: 'Barber Shop',
      timeZoneId: 'America/Guayaquil',
      createdAt: '2026-11-07T14:00:00Z',
    });
    http.expectOne(`${base}/businesses/b1/services`).flush([
      { id: 's1', businessId: 'b1', name: 'Haircut', durationMinutes: 30 },
    ]);
    http.expectOne(`${base}/businesses/b1/providers`).flush([
      { id: 'p1', businessId: 'b1', name: 'Carlos', workingPeriods: [] },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Barber Shop');
    expect(text).toContain('Haircut (30 min)');
    expect(text).toContain('Carlos');
  });

  it('shows a clear message when the business does not exist', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BookingPage);
    fixture.componentRef.setInput('businessId', 'missing');
    fixture.detectChanges();

    // When one request of the group fails, the page cancels the other two on purpose,
    // so only the failing request is answered here.
    http.expectOne(`${base}/businesses/missing`).flush({}, { status: 404, statusText: 'Not Found' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('not found');
  });
});