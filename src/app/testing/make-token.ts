export interface TestClaims {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
}

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function validClaims(overrides: Partial<TestClaims> = {}): TestClaims {
  return {
    sub: 'user-1',
    email: 'ana@example.com',
    name: 'Ana',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

/** Builds a token with the right shape. The signature is fake: the browser never checks it. */
export function makeToken(claims: TestClaims): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  return `${header}.${base64Url(JSON.stringify(claims))}.signature`;
}