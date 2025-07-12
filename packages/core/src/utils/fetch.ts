/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorMessage, isNodeError } from './errors.js';
import { URL } from 'url';
import { Gaxios, GaxiosOptions, GaxiosResponse } from 'gaxios';

// Create a gaxios instance for making requests
const gaxiosInstance = new Gaxios();

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
 * Get gaxios options with CA bundle support
 */
function getGaxiosOptions(signal?: AbortSignal): Partial<GaxiosOptions> {
  const httpsAgent = createHttpsAgent();
  
  const options: Partial<GaxiosOptions> = {};
  
  if (httpsAgent) {
    (options as any).httpsAgent = httpsAgent;
  }
  
  if (signal) {
    options.signal = signal;
  }
  
  return options;
}

/**
 * Convert gaxios response to fetch-like Response interface for compatibility
 */
function createFetchLikeResponse(gaxiosResponse: GaxiosResponse): Response {
  // Convert headers to a plain object for the Headers constructor
  const plainHeaders: Record<string, string> = {};
  for (const key in gaxiosResponse.headers) {
    if (Object.prototype.hasOwnProperty.call(gaxiosResponse.headers, key)) {
      plainHeaders[key] = String(gaxiosResponse.headers[key]);
    }
  }
  return {
    ok: gaxiosResponse.status >= 200 && gaxiosResponse.status < 300,
    status: gaxiosResponse.status,
    statusText: gaxiosResponse.statusText || '',
    headers: new Headers(plainHeaders),
    text: async () => {
      if (typeof gaxiosResponse.data === 'string') {
        return gaxiosResponse.data;
      }
      return JSON.stringify(gaxiosResponse.data);
    },
    json: async () => {
      if (typeof gaxiosResponse.data === 'string') {
        return JSON.parse(gaxiosResponse.data);
      }
      return gaxiosResponse.data;
    },
    arrayBuffer: async () => {
      if (gaxiosResponse.data instanceof ArrayBuffer) {
        return gaxiosResponse.data;
      }
      if (typeof gaxiosResponse.data === 'string') {
        return new TextEncoder().encode(gaxiosResponse.data).buffer;
      }
      return new ArrayBuffer(0);
    },
    body: null,
    bodyUsed: false,
    type: 'default',
    url: gaxiosResponse.config.url || '',
    redirected: false,
    clone: () => createFetchLikeResponse(gaxiosResponse),
  } as unknown as Response;
}

function headersToPlainObject(headers: Headers | Record<string, string> | [string, string][]): Record<string, string> {
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (Array.isArray(headers)) {
    const obj: Record<string, string> = {};
    for (const [key, value] of headers) {
      obj[key] = value;
    }
    return obj;
  }
  return headers as Record<string, string>;
}

export async function fetchWithTimeout(
  url: string,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const gaxiosOptions = getGaxiosOptions(controller.signal);
    const response = await gaxiosInstance.request({
      url,
      method: 'GET',
      timeout,
      ...gaxiosOptions,
    });
    return createFetchLikeResponse(response);
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
 * Enhanced fetch function with CA bundle support using gaxios
 */
export async function fetchWithCaBundle(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = input.toString();
  const method = init?.method || 'GET';
  let headers = init?.headers || {};
  const body = init?.body;
  const signal = init?.signal ?? undefined;

  // Convert headers to a plain object if needed
  headers = headersToPlainObject(headers);
  
  const gaxiosOptions = getGaxiosOptions(signal);
  
  try {
    const response = await gaxiosInstance.request({
      url,
      method: method as any,
      headers,
      data: body,
      ...gaxiosOptions,
    });
    
    return createFetchLikeResponse(response);
  } catch (error) {
    // Convert gaxios error to fetch-like error
    if (error && typeof error === 'object' && 'response' in error) {
      const gaxiosError = error as any;
      if (gaxiosError.response) {
        return createFetchLikeResponse(gaxiosError.response);
      }
    }
    throw new FetchError(getErrorMessage(error));
  }
}
