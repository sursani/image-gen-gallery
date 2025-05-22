import { describe, it, expect } from 'vitest';

describe('main entrypoint', () => {
  it('imports without crashing', async () => {
    await import('../main');
    expect(true).toBe(true);
  });
});