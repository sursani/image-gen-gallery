import { describe, it, expect, vi } from 'vitest';

vi.mock('react-dom/client', () => ({
  __esModule: true,
  createRoot: () => ({ render: () => {} }),
}));

describe('main entrypoint', () => {
  it('imports without crashing', async () => {
    await import('../main');
    expect(true).toBe(true);
  });
});