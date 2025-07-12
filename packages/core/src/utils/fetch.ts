/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorMessage, isNodeError } from './errors.js';
import { URL } from 'url';

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^127\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export class FetchError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export function isPrivateIp(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
  } catch (_e) {
    return false;
  }
}

/**
 * Create a custom HTTPS agent with CA bundle support for enterprise environments
 */
function createHttpsAgent() {
  // Only create agent in Node.js environment
  if (typeof window !== 'undefined') {
    return undefined;
  }

  // Check for CA bundle environment variable
  const caBundlePath = process.env.REQUESTS_CA_BUNDLE;
  
  if (!caBundlePath) {
    return undefined;
  }

  try {
    // Use synchronous require for Node.js modules to avoid memory issues
    const https = require('https');
    const fs = require('fs');

    if (fs.existsSync(caBundlePath)) {
      console.debug(`[CA Bundle] Using CA bundle from: ${caBundlePath}`);
      
      // Read the CA bundle file
      const caBundle = fs.readFileSync(caBundlePath, 'utf8');
      
      // Create HTTPS agent with custom CA bundle
      return new https.Agent({
        ca: caBundle,
        rejectUnauthorized: true,
      });
    } else {
      console.warn(`[CA Bundle] CA bundle file not found: ${caBundlePath}`);
    }
  } catch (error) {
    console.debug('[CA Bundle] Could not create HTTPS agent:', error instanceof Error ? error.message : String(error));
  }

  return undefined;
}

/**
 * Get fetch options with CA bundle support
 */
function getFetchOptions(signal?: AbortSignal): RequestInit {
  const httpsAgent = createHttpsAgent();
  
  if (httpsAgent) {
    return {
      signal,
      // @ts-ignore - Node.js specific property
      agent: httpsAgent,
    };
  }
  
  return { signal };
}

export async function fetchWithTimeout(
  url: string,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions = getFetchOptions(controller.signal);
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ABORT_ERR') {
      throw new FetchError(`Request timed out after ${timeout}ms`, 'ETIMEDOUT');
    }
    throw new FetchError(getErrorMessage(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Enhanced fetch function with CA bundle support
 */
export async function fetchWithCaBundle(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const httpsAgent = createHttpsAgent();
  
  if (httpsAgent && init) {
    // @ts-ignore - Node.js specific property
    init.agent = httpsAgent;
  } else if (httpsAgent) {
    // @ts-ignore - Node.js specific property
    init = { agent: httpsAgent };
  }
  
  return fetch(input, init);
}
