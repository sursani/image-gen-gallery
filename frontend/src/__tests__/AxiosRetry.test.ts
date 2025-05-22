import { describe, it, expect, vi } from 'vitest';

let retryOptions: any;
let errInterceptor: any;

// Mock before importing module
vi.mock('axios', () => {
  const instance = { interceptors: { response: { use: (_succ: any, err: any) => { errInterceptor = err; } } } };
  return { default: { create: () => instance } };
});

vi.mock('axios-retry', () => {
  const fn: any = (_client: any, opts: any) => { retryOptions = opts; };
  fn.isNetworkOrIdempotentRequestError = () => true;
  return { default: fn };
});

// Now load module under test
import '../api/axiosSetup';

// @ts-ignore

describe('axiosSetup retry & interceptor logic', () => {
  it('configures retry options correctly', () => {
    expect(retryOptions.retries).toBe(3);
    expect(retryOptions.retryDelay(3)).toBe(3000);
    const netErr: any = new Error('net');
    netErr.response = undefined;
    expect(retryOptions.retryCondition(netErr)).toBe(true);
    netErr.response = { status: 503 };
    expect(retryOptions.retryCondition(netErr)).toBe(true);
    netErr.response.status = 404;
    expect(retryOptions.retryCondition(netErr)).toBe(false);
  });

  it('maps various error shapes to user friendly messages', async () => {
    // detail message
    await expect(errInterceptor({ response: { data: { detail: 'boom' }, status: 500, headers: {} } })).rejects.toThrow('boom');
    // no response
    await expect(errInterceptor({ request: {} })).rejects.toThrow(/no response/i);
    // generic message
    await expect(errInterceptor({ message: 'oops' })).rejects.toThrow('oops');
  });
});