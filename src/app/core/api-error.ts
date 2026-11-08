import { HttpErrorResponse } from '@angular/common/http';

interface ProblemBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

function isProblemBody(value: unknown): value is ProblemBody {
  return typeof value === 'object' && value !== null;
}

/** Turns any error into a short message that is safe to show to the user. */
export function describeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  if ([502, 503, 504].includes(error.status)) {
    return 'The server is starting up. Wait a few seconds and try again.';
  }

  if (error.status === 429) {
    return 'Too many requests. Wait a minute and try again.';
  }

  const body: unknown = error.error;

  if (isProblemBody(body)) {
    if (body.errors) {
      const messages = Object.values(body.errors).flat();
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    if (body.detail) {
      return body.detail;
    }

    if (body.title) {
      return body.title;
    }
  }

  switch (error.status) {
    case 401:
      return 'Your session is not valid. Please sign in again.';
    case 403:
      return 'You are not allowed to do that.';
    case 404:
      return 'The requested item was not found.';
    default:
      return `The request failed (${error.status}).`;
  }
}