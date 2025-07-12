import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { Gaxios } from 'gaxios';

// Set environment variables before importing the module
process.env.SSO_SERVER = 'https://sso.example.com/auth';
process.env.ADA_GENAI_SSO_ID = 'user';
process.env.ADA_GENAI_SSO_PASSWORD = 'pass';

// Now import the module
import { ssoAuth } from './sso.js';

vi.mock('fs');
vi.mock('gaxios');

const TEST_TOKEN = 'test-token';
const TEST_EXPIRES_IN = 3600; // 1 hour
const TEST_SSO_URL = 'https://sso.example.com/auth';
const TEST_CACHE_PATH = '.ssotoken';

function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

describe('SsoAuthClient', () => {
  let origEnv: NodeJS.ProcessEnv;
  let readFileMock: any;
  let writeFileMock: any;
  let existsSyncMock: any;
  let readFileSyncMock: any;
  let gaxiosRequestMock: any;
  let ssoAuth: any;

  beforeEach(async () => {
    origEnv = { ...process.env };
    // Set environment variables for each test
    setEnv({
      SSO_SERVER: TEST_SSO_URL,
      ADA_GENAI_SSO_ID: 'user',
      ADA_GENAI_SSO_PASSWORD: 'pass',
    });
    
    // Create a fresh instance for each test
    const { SsoAuthClient } = await import('./sso.js');
    ssoAuth = new SsoAuthClient();
    
    readFileMock = vi.spyOn(fs.promises, 'readFile');
    writeFileMock = vi.spyOn(fs.promises, 'writeFile');
    existsSyncMock = vi.spyOn(fs, 'existsSync');
    readFileSyncMock = vi.spyOn(fs, 'readFileSync');
    gaxiosRequestMock = vi.spyOn(Gaxios.prototype, 'request');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = origEnv;
  });

  it('returns cached token if not expired', async () => {
    const now = Date.now();
    readFileMock.mockResolvedValue(
      JSON.stringify({ token: TEST_TOKEN, expires_at: now + 10000 })
    );
    const token = await ssoAuth.getToken();
    expect(token).toBe(TEST_TOKEN);
    expect(gaxiosRequestMock).not.toHaveBeenCalled();
  });

  it('makes network request and caches token if no valid cache', async () => {
    // Simulate cache miss
    readFileMock.mockRejectedValue(new Error('no cache'));
    writeFileMock.mockResolvedValue(undefined);
    gaxiosRequestMock.mockResolvedValue({
      data: { id_token: TEST_TOKEN, expires_in: TEST_EXPIRES_IN },
    });
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockReturnValue('');

    const token = await ssoAuth.getToken();
    expect(token).toBe(TEST_TOKEN);
    expect(gaxiosRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: TEST_SSO_URL,
        method: 'POST',
        data: expect.objectContaining({ userid: 'user', password: 'pass' }),
      })
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      TEST_CACHE_PATH,
      expect.stringContaining(TEST_TOKEN)
    );
  });

  it('throws if SSO_SERVER is not set', async () => {
    // Create a new instance without SSO_SERVER
    delete process.env.SSO_SERVER;
    const { SsoAuthClient } = await import('./sso.js');
    const testSsoAuth = new SsoAuthClient();
    
    await expect(testSsoAuth.getToken()).rejects.toThrow('SSO_SERVER environment variable is not set');
  });

  it('throws if network request fails', async () => {
    readFileMock.mockRejectedValue(new Error('no cache'));
    gaxiosRequestMock.mockRejectedValue(new Error('network error'));
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockReturnValue('');
    await expect(ssoAuth.getToken()).rejects.toThrow('SSO Authentication failed');
  });
}); 