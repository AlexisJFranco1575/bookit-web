import { HttpErrorResponse } from '@angular/common/http';

import { describeError } from './api-error';

describe('describeError', () => {
  it('explains that the server cannot be reached', () => {
    expect(describeError(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the server');
  });

  it('asks the user to wait when the API is starting', () => {
    expect(describeError(new HttpErrorResponse({ status: 503 }))).toContain('starting up');
  });

  it('explains the rate limit', () => {
    expect(describeError(new HttpErrorResponse({ status: 429 }))).toContain('Too many requests');
  });

  it('prefers the validation messages of the API', () => {
    const error = new HttpErrorResponse({ status: 400, error: { errors: { Email: ['Email is required.'] } } });

    expect(describeError(error)).toBe('Email is required.');
  });

  it('falls back to the detail of the problem', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'That time is no longer available.' } });

    expect(describeError(error)).toBe('That time is no longer available.');
  });

  it('is safe with errors that are not HTTP errors', () => {
    expect(describeError(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});