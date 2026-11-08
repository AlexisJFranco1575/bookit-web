import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Bookit',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'b/:businessId',
    title: 'Book an appointment',
    loadComponent: () => import('./features/booking/booking-page').then((m) => m.BookingPage),
  },
  {
    path: 'appointment/:id',
    title: 'Your appointment',
    loadComponent: () => import('./features/booking/appointment-page').then((m) => m.AppointmentPage),
  },
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'My businesses',
        loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: ':businessId',
        title: 'Manage business',
        loadComponent: () => import('./features/dashboard/business-page').then((m) => m.BusinessPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];