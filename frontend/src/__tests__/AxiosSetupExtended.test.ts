import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

// Mock axios and axios-retry
vi.mock('axios');
vi.mock('axios-retry');

const mockAxios = axios as any;
const mockAxiosRetry = axiosRetry as any;

describe('Axios Setup Extended Coverage', () => {
  let mockCreate: any;
  let mockInterceptors: any;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock interceptors
    mockInterceptors = {
      response: {
        use: vi.fn()
      }
    };
    
    // Setup mock API client
    mockApiClient = {
      interceptors: mockInterceptors
    };
    
    // Setup mock axios.create
    mockCreate = vi.fn().mockReturnValue(mockApiClient);
    mockAxios.create = mockCreate;
    
    // Setup mock axios-retry
    mockAxiosRetry.mockImplementation(() => {});
    mockAxiosRetry.isNetworkOrIdempotentRequestError = vi.fn().mockReturnValue(true);
  });

  it('creates axios instance with correct base URL', async () => {
    // Re-import to trigger the setup
    await import('../api/axiosSetup');
    
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: 'http://localhost:8000/api'
    });
  });

  it('configures axios-retry with correct settings', async () => {
    await import('../api/axiosSetup');
    
    expect(mockAxiosRetry).toHaveBeenCalledWith(mockApiClient, {
      retries: 3,
      retryDelay: expect.any(Function),
      retryCondition: expect.any(Function)
    });
  });

  it('sets up response interceptor', async () => {
    await import('../api/axiosSetup');
    
    expect(mockInterceptors.response.use).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
  });

  describe('Retry logic', () => {
    let retryDelay: any;
    let retryCondition: any;

    beforeEach(async () => {
      await import('../api/axiosSetup');
      
      const callArgs = mockAxiosRetry.mock.calls[0][1];
      retryDelay = callArgs.retryDelay;
      retryCondition = callArgs.retryCondition;
    });

    it('calculates retry delay correctly', () => {
      expect(retryDelay(1)).toBe(1000);
      expect(retryDelay(2)).toBe(2000);
      expect(retryDelay(3)).toBe(3000);
    });

    it('logs retry attempts', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      retryDelay(2);
      
      expect(consoleSpy).toHaveBeenCalledWith('Retry attempt: 2');
      consoleSpy.mockRestore();
    });

    it('retries on network errors', () => {
      const networkError = new Error('Network Error') as AxiosError;
      mockAxiosRetry.isNetworkOrIdempotentRequestError.mockReturnValue(true);
      
      expect(retryCondition(networkError)).toBe(true);
    });

    it('retries on 500+ server errors', () => {
      const serverError = {
        response: { status: 500 }
      } as AxiosError;
      mockAxiosRetry.isNetworkOrIdempotentRequestError.mockReturnValue(false);
      
      expect(retryCondition(serverError)).toBe(true);
    });

    it('retries on 502 server errors', () => {
      const serverError = {
        response: { status: 502 }
      } as AxiosError;
      mockAxiosRetry.isNetworkOrIdempotentRequestError.mockReturnValue(false);
      
      expect(retryCondition(serverError)).toBe(true);
    });

    it('does not retry on 4xx client errors', () => {
      const clientError = {
        response: { status: 400 }
      } as AxiosError;
      mockAxiosRetry.isNetworkOrIdempotentRequestError.mockReturnValue(false);
      
      expect(retryCondition(clientError)).toBe(false);
    });

    it('does not retry on 404 errors', () => {
      const notFoundError = {
        response: { status: 404 }
      } as AxiosError;
      mockAxiosRetry.isNetworkOrIdempotentRequestError.mockReturnValue(false);
      
      expect(retryCondition(notFoundError)).toBe(false);
    });
  });

  describe('Response interceptor', () => {
    let successHandler: any;
    let errorHandler: any;

    beforeEach(async () => {
      await import('../api/axiosSetup');
      
      const interceptorArgs = mockInterceptors.response.use.mock.calls[0];
      successHandler = interceptorArgs[0];
      errorHandler = interceptorArgs[1];
    });

    it('passes through successful responses', () => {
      const response = { data: { id: '1' }, status: 200 };
      
      const result = successHandler(response);
      
      expect(result).toBe(response);
    });

    describe('Error handling', () => {
      let consoleErrorSpy: any;

      beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      it('handles response errors with detail message', async () => {
        const error = {
          response: {
            status: 400,
            data: { detail: 'Validation failed' },
            headers: {}
          }
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('Validation failed');
        expect(consoleErrorSpy).toHaveBeenCalledWith('API Error Interceptor Caught:', error);
      });

      it('handles response errors without detail message', async () => {
        const error = {
          response: {
            status: 500,
            data: {},
            headers: {}
          }
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('Server responded with status 500');
      });

      it('handles request errors (no response)', async () => {
        const error = {
          request: new XMLHttpRequest(),
          message: 'Network Error'
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('No response received from server. Check network connection.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('API Request Error:', error.request);
      });

      it('handles setup errors', async () => {
        const error = {
          message: 'Request setup failed'
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('Request setup failed');
        expect(consoleErrorSpy).toHaveBeenCalledWith('API Setup Error:', 'Request setup failed');
      });

      it('handles response errors with non-object data', async () => {
        const error = {
          response: {
            status: 400,
            data: 'Plain text error',
            headers: {}
          }
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('Server responded with status 400');
      });

      it('handles response errors with null data', async () => {
        const error = {
          response: {
            status: 500,
            data: null,
            headers: {}
          }
        } as AxiosError;

        const result = errorHandler(error);
        
        await expect(result).rejects.toThrow('Server responded with status 500');
      });

      it('logs all relevant error information', async () => {
        const error = {
          response: {
            status: 422,
            data: { detail: 'Unprocessable entity' },
            headers: { 'content-type': 'application/json' }
          }
        } as AxiosError;

        await errorHandler(error).catch(() => {});
        
        expect(consoleErrorSpy).toHaveBeenCalledWith('API Response Error Data:', error.response.data);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Status:', 422);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Headers:', error.response.headers);
      });
    });
  });
});