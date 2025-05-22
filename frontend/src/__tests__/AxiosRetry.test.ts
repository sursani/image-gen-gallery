import { describe, it, expect, vi, beforeAll } from 'vitest';
import { AxiosError } from 'axios';

let retryOptions: any;
let errInterceptor: any;

// Mock before importing module
vi.mock('axios', () => {
  // This function will be called when axios is imported by axiosSetup
  const mockCreate = vi.fn(() => ({
    interceptors: {
      response: {
        use: vi.fn((_succ: any, err: any) => { errInterceptor = err; })
      }
    }
  }));
  return { default: { create: mockCreate } };
});

vi.mock('axios-retry', () => {
  // This function will be called when axios-retry is imported by axiosSetup
  const mockAxiosRetry = vi.fn((_client: any, opts: any) => { 
    retryOptions = opts; 
  });
  // @ts-ignore
  // Make the mock more specific for testing the retryCondition parts
  mockAxiosRetry.isNetworkOrIdempotentRequestError = (error: AxiosError) => {
    // Simulate true for actual network errors (no response)
    // and false otherwise for this test, to allow testing the status code logic.
    return !error.response; 
  };
  return { default: mockAxiosRetry };
});

describe('axiosSetup retry & interceptor logic', () => {
  beforeAll(async () => {
    // Reset variables before each test suite run, especially if mocks are stateful or tests might interfere
    retryOptions = undefined;
    errInterceptor = undefined;
    // Dynamically import the module under test AFTER mocks are set up
    // This ensures that when axiosSetup runs, it uses our mocks
    await import('../api/axiosSetup');
    // Vitest might require a small delay for mocks to fully propagate in some complex scenarios, though usually not needed.
    // await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('configures retry options correctly', () => {
    expect(retryOptions).toBeDefined();
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