import { describe, it, expect, beforeEach } from 'vitest';
import { SSOClient, createSSOClient, getSSOClient, SSOToken } from './ssoClient.js';

describe('SSOClient', () => {
  let ssoClient: SSOClient;

  beforeEach(() => {
    ssoClient = new SSOClient();
  });

  it('should create a dummy SSO client', () => {
    expect(ssoClient).toBeInstanceOf(SSOClient);
  });

  it('should return a dummy access token', async () => {
    const token = await ssoClient.getToken();
    
    expect(token).toHaveProperty('access_token');
    expect(token).toHaveProperty('token_type');
    expect(token).toHaveProperty('expires_in');
    expect(token.access_token).toMatch(/^ya29\.a0/);
    expect(token.token_type).toBe('Bearer');
    expect(token.expires_in).toBe(3600);
  });

  it('should return access token string', async () => {
    const accessToken = await ssoClient.getAccessToken();
    
    expect(typeof accessToken).toBe('string');
    expect(accessToken).toMatch(/^ya29\.a0/);
  });

  it('should refresh token and return new token', async () => {
    const originalToken = await ssoClient.getToken();
    const refreshedToken = await ssoClient.refreshToken();
    
    expect(refreshedToken.access_token).not.toBe(originalToken.access_token);
    expect(refreshedToken.access_token).toMatch(/^ya29\.a0/);
    expect(refreshedToken.token_type).toBe('Bearer');
  });

  it('should allow setting custom dummy token', () => {
    const customToken: SSOToken = {
      access_token: 'custom_token_123',
      token_type: 'Bearer',
      expires_in: 1800,
      scope: 'custom_scope',
    };
    
    ssoClient.setDummyToken(customToken);
    const currentToken = ssoClient.getCurrentToken();
    
    expect(currentToken).toEqual(customToken);
  });

  it('should indicate token is not expired (dummy implementation)', () => {
    expect(ssoClient.isTokenExpired()).toBe(false);
  });
});

describe('SSO Client Factory Functions', () => {
  it('should create SSO client with createSSOClient', () => {
    const client = createSSOClient();
    expect(client).toBeInstanceOf(SSOClient);
  });

  it('should return singleton instance with getSSOClient', () => {
    const client1 = getSSOClient();
    const client2 = getSSOClient();
    
    expect(client1).toBe(client2);
  });

  it('should create SSO client with custom config', () => {
    const config = {
      clientId: 'test-client-id',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    };
    
    const client = createSSOClient(config);
    expect(client).toBeInstanceOf(SSOClient);
  });
}); 