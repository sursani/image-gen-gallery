import { describe, it, expect, vi } from 'vitest';

// Provide very light mocks — we only need module to exist for import side-effects
vi.mock('axios', () => ({
  default: {
    create: () => ({ interceptors: { response: { use: () => {} } } }),
  },
}));

vi.mock('axios-retry', () => ({ default: () => {} }));

// Now import the modules under test (after mocks)
import axiosSetup from '../api/axiosSetup';
import axiosConfig from '../api/axiosConfig';

describe('axios layer smoke tests', () => {
  it('imports configured clients without error', () => {
    expect(axiosSetup).toBeTruthy();
    expect(axiosConfig).toBeTruthy();
  });
});