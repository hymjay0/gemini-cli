/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dummy SSO Client for testing purposes
 * In enterprise environments, this would be replaced with the actual SSO client
 */

export interface SSOToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface SSOClientConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

export class SSOClient {
  private config: SSOClientConfig;
  private dummyToken: SSOToken;

  constructor(config: SSOClientConfig = {}) {
    this.config = config;
    
    // Create a dummy token that looks like a real Google OAuth token
    this.dummyToken = {
      access_token: 'ya29.a0AfB_byC...dummy_token_for_testing...',
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    };
  }

  /**
   * Get an access token (dummy implementation)
   * In enterprise environments, this would call the actual SSO service
   */
  async getToken(): Promise<SSOToken> {
    console.debug('[SSO Client] Getting dummy access token for testing');
    
    // Simulate some network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.dummyToken;
  }

  /**
   * Refresh the access token (dummy implementation)
   */
  async refreshToken(): Promise<SSOToken> {
    console.debug('[SSO Client] Refreshing dummy access token for testing');
    
    // Simulate some network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return a new dummy token
    this.dummyToken = {
      access_token: `ya29.a0AfB_byC...dummy_refreshed_token_${Date.now()}...`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    };
    
    return this.dummyToken;
  }

  /**
   * Check if the current token is expired
   */
  isTokenExpired(): boolean {
    // For dummy implementation, always return false
    // In real implementation, this would check the actual expiration
    return false;
  }

  /**
   * Get the current access token string
   */
  async getAccessToken(): Promise<string> {
    const token = await this.getToken();
    return token.access_token;
  }

  /**
   * Set a custom dummy token for testing
   */
  setDummyToken(token: SSOToken): void {
    this.dummyToken = token;
  }

  /**
   * Get the current dummy token
   */
  getCurrentToken(): SSOToken {
    return this.dummyToken;
  }
}

/**
 * Create a default SSO client instance
 */
export function createSSOClient(config?: SSOClientConfig): SSOClient {
  return new SSOClient(config);
}

/**
 * Get a singleton SSO client instance
 */
let ssoClientInstance: SSOClient | null = null;

export function getSSOClient(config?: SSOClientConfig): SSOClient {
  if (!ssoClientInstance) {
    ssoClientInstance = new SSOClient(config);
  }
  return ssoClientInstance;
} 