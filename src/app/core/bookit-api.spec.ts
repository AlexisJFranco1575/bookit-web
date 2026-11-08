import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { BookitApi } from './bookit-api';

describe('BookitApi', () => {
  const base = `${environment.apiUrl}/api`;

  function setup(): { api: BookitApi; http: HttpTestingController } {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });

    return { api: TestBed.inject(BookitApi), http: TestBed.inject(HttpTestingController) };
  }

  it('asks for the free times of one provider and service on a day', () => {
    const { api, http } = setup();

    api.getAvailability('p1', 's1', '2026-11-16', '2026-11-16').subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${base}/availability`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('providerId')).toBe('p1');
    expect(request.request.params.get('serviceId')).toBe('s1');
    expect(request.request.params.get('from')).toBe('2026-11-16');
    expect(request.request.params.get('to')).toBe('2026-11-16');
    request.flush({ providerId: 'p1', serviceId: 's1', timeZoneId: 'America/Guayaquil', slots: [] });
  });

  it('books with a POST to /api/appointments', () => {
    const { api, http } = setup();
    const body = {
      providerId: 'p1',
      serviceId: 's1',
      startsAt: '2026-11-16T14:00:00Z',
      customerName: 'Ana Perez',
      customerEmail: 'ana@example.com',
    };

    api.book(body).subscribe();

    const request = http.expectOne(`${base}/appointments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('cancels with a POST to the cancel route of the appointment', () => {
    const { api, http } = setup();

    api.cancelAppointment('a1').subscribe();

    const request = http.expectOne(`${base}/appointments/a1/cancel`);
    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('loads the agenda of a business for a range of days', () => {
    const { api, http } = setup();

    api.getAgenda('b1', '2026-11-16', '2026-11-22').subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${base}/businesses/b1/appointments`);
    expect(request.request.params.get('from')).toBe('2026-11-16');
    expect(request.request.params.get('to')).toBe('2026-11-22');
    request.flush([]);
  });
});