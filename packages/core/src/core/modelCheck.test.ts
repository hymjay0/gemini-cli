import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEffectiveModel } from './modelCheck.js';
import * as fetchUtils from '../utils/fetch.js';

const API_KEY = 'fake-api-key';
const DEFAULT_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-flash';

describe('getEffectiveModel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the currentConfiguredModel if not the default', async () => {
    const result = await getEffectiveModel(API_KEY, 'other-model');
    expect(result).toBe('other-model');
  });

  it('returns fallback model if fetchWithCaBundle returns 429', async () => {
    vi.spyOn(fetchUtils, 'fetchWithCaBundle').mockResolvedValue({
      status: 429,
      ok: false,
      statusText: 'Too Many Requests',
      headers: new Map(),
      text: async () => '',
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
      body: null,
      bodyUsed: false,
      type: 'default',
      url: '',
      redirected: false,
      clone: () => this,
    } as any);
    const result = await getEffectiveModel(API_KEY, DEFAULT_MODEL);
    expect(result).toBe(FALLBACK_MODEL);
  });

  it('returns currentConfiguredModel if fetchWithCaBundle returns 200', async () => {
    vi.spyOn(fetchUtils, 'fetchWithCaBundle').mockResolvedValue({
      status: 200,
      ok: true,
      statusText: 'OK',
      headers: new Map(),
      text: async () => '',
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
      body: null,
      bodyUsed: false,
      type: 'default',
      url: '',
      redirected: false,
      clone: () => this,
    } as any);
    const result = await getEffectiveModel(API_KEY, DEFAULT_MODEL);
    expect(result).toBe(DEFAULT_MODEL);
  });
}); 