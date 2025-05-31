import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchImageMetadata, getImageUrl } from '../api/client.ts';

// tiny helper to craft Response
const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

test('getImageUrl computes endpoint correctly', () => {
  const id = 'xyz';
  assert.equal(getImageUrl(id), `http://localhost:8000/api/images/${id}`);
});

test('fetchImageMetadata returns parsed JSON array', async () => {
  const fake = [{ id: '1', prompt: 'hello', parameters: null, filename: 'a.png', timestamp: new Date().toISOString() }];

  const originalFetch = global.fetch;
  global.fetch = async () => jsonResponse(fake);

  const data = await fetchImageMetadata();
  assert.deepEqual(data, fake);

  global.fetch = originalFetch;
});

test('fetchImageMetadata throws error with detail', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => jsonResponse({ detail: 'boom' }, { status: 500 });

  await assert.rejects(() => fetchImageMetadata(), /boom|500/);

  global.fetch = originalFetch;
});
