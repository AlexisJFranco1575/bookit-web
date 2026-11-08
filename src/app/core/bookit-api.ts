import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AgendaItem,
  Appointment,
  Availability,
  BookRequest,
  Business,
  CreateProviderRequest,
  CreateServiceRequest,
  Provider,
  ServiceItem,
} from './models';

@Injectable({ providedIn: 'root' })
export class BookitApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  // Public: what a customer needs.

  getBusiness(id: string): Observable<Business> {
    return this.http.get<Business>(`${this.base}/businesses/${id}`);
  }

  listServices(businessId: string): Observable<ServiceItem[]> {
    return this.http.get<ServiceItem[]>(`${this.base}/businesses/${businessId}/services`);
  }

  listProviders(businessId: string): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/businesses/${businessId}/providers`);
  }

  getAvailability(providerId: string, serviceId: string, from: string, to: string): Observable<Availability> {
    const params = new HttpParams()
      .set('providerId', providerId)
      .set('serviceId', serviceId)
      .set('from', from)
      .set('to', to);

    return this.http.get<Availability>(`${this.base}/availability`, { params });
  }

  book(request: BookRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/appointments`, request);
  }

  getAppointment(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.base}/appointments/${id}`);
  }

  cancelAppointment(id: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/appointments/${id}/cancel`, null);
  }

  // Owner: these need the bearer token (added by the interceptor).

  listMine(): Observable<Business[]> {
    return this.http.get<Business[]>(`${this.base}/businesses/mine`);
  }

  createBusiness(name: string, timeZoneId: string): Observable<Business> {
    return this.http.post<Business>(`${this.base}/businesses`, { name, timeZoneId });
  }

  createService(businessId: string, request: CreateServiceRequest): Observable<ServiceItem> {
    return this.http.post<ServiceItem>(`${this.base}/businesses/${businessId}/services`, request);
  }

  createProvider(businessId: string, request: CreateProviderRequest): Observable<Provider> {
    return this.http.post<Provider>(`${this.base}/businesses/${businessId}/providers`, request);
  }

  getAgenda(businessId: string, from: string, to: string): Observable<AgendaItem[]> {
    const params = new HttpParams().set('from', from).set('to', to);

    return this.http.get<AgendaItem[]>(`${this.base}/businesses/${businessId}/appointments`, { params });
  }
}