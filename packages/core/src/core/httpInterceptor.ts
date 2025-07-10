/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HTTP Interceptor to redirect Google API requests to custom enterprise endpoints
 */

interface InterceptorConfig {
  baseURL: string;
  projectId: string;
  location: string;
  apiKey?: string;
}

export class CustomHttpInterceptor {
  private originalFetch: typeof fetch;
  private config: InterceptorConfig;
  private isIntercepted: boolean = false;

  constructor(config: InterceptorConfig) {
    this.config = config;
    this.originalFetch = global.fetch;
  }

  /**
   * Start intercepting HTTP requests
   */
  public intercept(): void {
    if (this.isIntercepted) {
      return; // Already intercepted
    }

    // Store the original fetch function
    const originalFetch = this.originalFetch;

    // Replace the global fetch with our custom version
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      
      // Check if this is a Google Generative AI API request
      if (this.isGoogleGenAIRequest(url)) {
        console.debug(`[HTTP Interceptor] Intercepting request to: ${url.toString()}`);
        
        // Transform the URL to use our custom endpoint
        const transformedUrl = this.transformGoogleGenAIUrl(url);
        console.debug(`[HTTP Interceptor] Redirecting to: ${transformedUrl}`);
        
        // Make the request to our custom endpoint
        return originalFetch(transformedUrl, init);
      }
      
      // For all other requests, use the original fetch
      return originalFetch(input, init);
    };

    this.isIntercepted = true;
    console.debug('[HTTP Interceptor] Interceptor activated');
  }

  /**
   * Check if the request is going to Google's Generative AI API
   */
  private isGoogleGenAIRequest(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    
    // Check for standard Google Generative AI endpoints
    return (
      hostname === 'generativelanguage.googleapis.com' ||
      (hostname.includes('googleapis.com') && pathname.includes('/v1beta/models/')) ||
      (hostname.includes('googleapis.com') && pathname.includes('/v1/models/'))
    );
  }

  /**
   * Transform Google Generative AI URL to custom enterprise endpoint
   */
  private transformGoogleGenAIUrl(originalUrl: URL): string {
    const pathParts = originalUrl.pathname.split('/');
    
    // Extract the model name from the original URL
    // Original: /v1beta/models/gemini-pro:generateContent
    // We want: gemini-pro
    let modelName = '';
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'models' && i + 1 < pathParts.length) {
        modelName = pathParts[i + 1];
        break;
      }
    }

    // Remove any method suffix (like :generateContent, :countTokens, etc.)
    if (modelName.includes(':')) {
      modelName = modelName.split(':')[0];
    }

    // Construct the new URL for Vertex AI format
    const newPath = `/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${modelName}`;
    
    // Preserve the original method and query parameters
    const method = this.extractMethod(originalUrl.pathname);
    // Add API key to query parameters
    let newUrl = `${this.config.baseURL}${newPath}${method}${originalUrl.search}`;
    if (this.config.apiKey) {
      const hasQuery = originalUrl.search && originalUrl.search.length > 0;
      const separator = hasQuery ? '&' : '?';
      newUrl += `${separator}key=${this.config.apiKey}`;
    }
    return newUrl;
  }

  /**
   * Extract the method from the original URL path
   */
  private extractMethod(pathname: string): string {
    // Look for method suffixes like :generateContent, :countTokens, :embedContent
    const methodMatch = pathname.match(/:([^/]+)$/);
    return methodMatch ? `:${methodMatch[1]}` : ':generateContent';
  }

  /**
   * Restore the original fetch function
   */
  public restore(): void {
    if (!this.isIntercepted) {
      return;
    }

    global.fetch = this.originalFetch;
    this.isIntercepted = false;
    console.debug('[HTTP Interceptor] Interceptor deactivated');
  }
} 