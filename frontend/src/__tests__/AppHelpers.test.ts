import { describe, it, expect } from 'vitest';

import { default as AppModule } from '../App';
// App exports are default component only; we need to re-import functions by hacking.
// We access helpers via eval (not ideal) but simpler: re-import via TS path since they are file-scoped.

// Re-import raw source to access functions using require cache trick
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
// @ts-ignore
import * as AppRaw from '../App';

// The helpers are not exported, replicate their logic to assert equivalence.
// We'll assert round-trip consistency using window.history simulation through navigation tests already but explicit unit test.

describe('App helper converters', () => {
  it('converts path <-> view symmetrically', () => {
    // @ts-ignore
    const pathToView = AppRaw.pathToView ?? ((p: string) => 'gallery');
    // @ts-ignore
    const viewToPath = AppRaw.viewToPath ?? ((v: string) => '/');

    const views = ['gallery', 'create', 'edit'] as const;
    views.forEach(v => {
      const path = viewToPath(v);
      const viewBack = pathToView(path);
      expect(viewBack).toBe(v);
    });
  });
});