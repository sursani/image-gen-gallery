import test from 'node:test';
import assert from 'node:assert/strict';

import apiClient from '../api/axiosSetup.ts';
import { generateImage } from '../api/imageGeneration.ts';
import { editImage } from '../api/imageEditing.ts';

// helper
const makeFile = (name) => new File(['x'], name, { type: 'image/png' });

test('generateImage uses axios client and returns data', async () => {
  const expected = { id: '42' };
  const orig = apiClient.post;
  apiClient.post = async () => ({ data: expected });

  const result = await generateImage({ prompt: 'cat', size: '1024x1024', quality: 'high' });
  assert.deepEqual(result, expected);

  apiClient.post = orig;
});

test('editImage builds form-data and calls axios', async () => {
  const expected = { id: '7' };
  const calls = [];
  const orig = apiClient.post;
  apiClient.post = async (url, body) => {
    calls.push({ url, body });
    return { data: expected };
  };

  const res = await editImage('prompt', makeFile('orig.png'), makeFile('mask.png'), '1024x1024');

  assert.deepEqual(res, expected);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/edit/');
  const fd = calls[0].body;
  assert.ok(fd instanceof FormData);
  ['prompt', 'image', 'mask', 'size'].forEach((k) => assert.ok(fd.has(k)));

  apiClient.post = orig;
});
