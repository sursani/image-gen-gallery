import { describe, it, expect, vi } from 'vitest';

let retryOptions: any;

vi.isolateModules(() => {
  vi.mock('axios', () => ({
    default: {
      create: () => ({ interceptors: { response: { use: () => {} } } }),
    },
  }));

  vi.mock('axios-retry', () => {
    const fn: any = (_client: any, opts: any) => { retryOptions = opts; };
    fn.isNetworkOrIdempotentRequestError = () => true;
    return { default: fn };
  });

  // @ts-ignore
  require('../api/axiosSetup');
});

describe('axiosSetup retry logic', () => {
  it('defines retryCondition and retryDelay', () => {
    expect(retryOptions.retries).toBe(3);
    expect(retryOptions.retryDelay(2)).toBe(2000);

    // retryCondition should return true for network errors (simulated)
    const err = new Error('net') as any;
    err.response = undefined;
    expect(retryOptions.retryCondition(err)).toBe(true);

    // Should retry 5xx
    err.response = { status: 502 };
    expect(retryOptions.retryCondition(err)).toBe(true);

    // Should not retry 4xx
    err.response.status = 404;
    expect(retryOptions.retryCondition(err)).toBe(false);
  });
});