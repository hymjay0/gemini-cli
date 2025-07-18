import { Gaxios, GaxiosOptions, GaxiosResponse } from 'gaxios';
import * as fs from 'fs';
import * as https from 'https';
import { ssoAuth } from '../auth/sso.js';
import {
  ContentGenerator,
  GenerateContentParameters,
  GenerateContentResponse as CoreGenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse as CoreCountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse as CoreEmbedContentResponse,
  GenerateContentResponse,
} from '../core/contentGenerator.js';

export interface LlmHttpClientConfig {
  baseUrl: string;
  project: string;
  location: string;
  model: string;
  accessToken?: string;
  proxy?: string;
  caBundlePath?: string;
  timeoutMs?: number; // Optional, default 30000
  maxAttempts?: number; // Optional, for retry logic
  logging?: boolean; // Enable debug logging
}

export interface GenerateContentRequest {
  contents: any;
  [key: string]: any;
  signal?: AbortSignal;
}

export interface EmbedContentRequest {
  content: any;
  [key: string]: any;
  signal?: AbortSignal;
}

export interface CountTokensRequest {
  model: string;
  contents: any;
  [key: string]: any;
}

export interface CountTokensResponse {
  totalTokens: number;
  [key: string]: any;
}

export class LlmHttpClient implements ContentGenerator {
  private config: LlmHttpClientConfig;
  private gaxios: Gaxios;

  constructor(config: LlmHttpClientConfig) {
    this.config = config;
    this.gaxios = new Gaxios();
  }

  private async getAuthHeaders(): Promise<{ Authorization: string }> {
    let token = this.config.accessToken;
    if (!token) {
      token = await ssoAuth.getToken();
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private getTimeoutMs(): number {
    return this.config.timeoutMs ?? 30000;
  }

  private getCaBundle(): Buffer | undefined {
    if (this.config.caBundlePath) {
      try {
        return fs.readFileSync(this.config.caBundlePath);
      } catch (err) {
        console.warn('[LlmHttpClient] Failed to load CA bundle:', err);
      }
    }
    return undefined;
  }

  private getHttpsAgent(): https.Agent | undefined {
    if (this.config.caBundlePath) {
      try {
        const ca = fs.readFileSync(this.config.caBundlePath);
        return new https.Agent({ ca });
      } catch (err) {
        console.warn('[LlmHttpClient] Failed to load CA bundle:', err);
      }
    }
    return undefined;
  }

  private buildUrl(endpoint: string): string {
    // Example: /v1/projects/{project}/locations/{location}/publishers/google/models/{model}:{endpoint}
    return `${this.config.baseUrl}/v1/projects/${this.config.project}/locations/${this.config.location}/publishers/google/models/${this.config.model}:${endpoint}`;
  }

  private async requestWithHandling(options: GaxiosOptions): Promise<GaxiosResponse> {
    const maxAttempts = (this.config as any).maxAttempts ?? 3;
    const baseDelayMs = 300;
    let attempt = 0;
    let lastError: any;
    while (attempt < maxAttempts) {
      this.logRequest(options);
      try {
        const response = await this.gaxios.request(options);
        this.logResponse(response);
        // Retry on 5xx errors
        if (response.status >= 500 && response.status < 600) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response;
      } catch (error: any) {
        lastError = error;
        // Only retry on network errors or 5xx
        const isNetworkError = !error.response;
        const status = error.response?.status;
        const is5xx = status && status >= 500 && status < 600;
        attempt++;
        if (this.config.logging) {
          const url = options.url;
          const statusMsg = status ? `HTTP ${status}` : 'Network error';
          const respData = error.response?.data ? this.redactSensitive(error.response.data) : undefined;
          // eslint-disable-next-line no-console
          console.error('[LlmHttpClient] Request failed:', {
            url,
            status,
            message: error.message,
            response: respData,
          });
        }
        if (attempt >= maxAttempts || (!isNetworkError && !is5xx)) {
          break;
        }
        // Exponential backoff
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    // Surface clear errors for HTTP failures, timeouts, and invalid responses
    let errorMsg = '[LlmHttpClient] Request failed';
    if (lastError?.response) {
      errorMsg += `: HTTP ${lastError.response.status} ${lastError.response.statusText || ''} at ${lastError.response.config?.url || ''}`;
      if (lastError.response.data) {
        errorMsg += `\nResponse: ${JSON.stringify(this.redactSensitive(lastError.response.data))}`;
      }
    } else if (lastError?.code === 'ECONNABORTED') {
      errorMsg += ': Request timed out';
    } else if (lastError?.message) {
      errorMsg += `: ${lastError.message}`;
    }
    throw new Error(errorMsg);
  }

  private logRequest(options: GaxiosOptions) {
    if (!this.config.logging) return;
    // Redact Authorization and sensitive fields (only for plain object headers)
    let redactedHeaders = options.headers;
    if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
      redactedHeaders = { ...options.headers };
      if ('Authorization' in redactedHeaders) {
        (redactedHeaders as any)['Authorization'] = 'REDACTED';
      }
    }
    const redactedData = this.redactSensitive(options.data);
    // eslint-disable-next-line no-console
    console.debug('[LlmHttpClient] Request:', {
      url: options.url,
      method: options.method,
      headers: redactedHeaders,
      data: redactedData,
    });
  }

  private logResponse(response: GaxiosResponse) {
    if (!this.config.logging) return;
    // Redact sensitive fields
    const redactedData = this.redactSensitive(response.data);
    // eslint-disable-next-line no-console
    console.debug('[LlmHttpClient] Response:', {
      status: response.status,
      url: response.config.url,
      data: redactedData,
    });
  }

  private redactSensitive(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    // Redact common sensitive fields
    const SENSITIVE_KEYS = ['accessToken', 'token', 'id_token', 'password', 'Authorization'];
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSensitive(item));
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.includes(key)) {
        result[key] = 'REDACTED';
      } else {
        result[key] = this.redactSensitive(obj[key]);
      }
    }
    return result;
  }

  async generateContent(request: GenerateContentParameters): Promise<CoreGenerateContentResponse> {
    const url = this.buildUrl('generateContent');
    const headers = {
      ...(await this.getAuthHeaders()),
      'Content-Type': 'application/json',
    };

    const { contents, config } = request;
    const {
      systemInstruction,
      safetySettings,
      tools,
      toolConfig,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      abortSignal,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      httpOptions,
      ...generationConfig
    } = config || {};

    const data: any = {
      contents,
      ...(systemInstruction && {
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
      }),
      ...(safetySettings && { safetySettings }),
      ...(tools && { tools }),
      ...(toolConfig && { toolConfig }),
      ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
    };

    // Create a deep copy to avoid any reference issues.
    const requestData = JSON.parse(JSON.stringify(data));

    const options: GaxiosOptions = {
      url,
      method: 'POST',
      headers,
      data: requestData,
      timeout: this.getTimeoutMs(),
      agent: this.getHttpsAgent(),
    };
    const response: GaxiosResponse = await this.requestWithHandling(options);
    const result = new GenerateContentResponse();
    Object.assign(result, response.data);
    return result;
  }

  async embedContent(request: EmbedContentParameters): Promise<CoreEmbedContentResponse> {
    const url = this.buildUrl('embedContent');
    const headers = {
      ...(await this.getAuthHeaders()),
      'Content-Type': 'application/json',
    };
    const options: GaxiosOptions = {
      url,
      method: 'POST',
      headers,
      data: request,
      timeout: this.getTimeoutMs(),
      agent: this.getHttpsAgent(),
    };
    const response: GaxiosResponse = await this.requestWithHandling(options);
    return response.data as CoreEmbedContentResponse;
  }

  async countTokens(request: CountTokensParameters): Promise<CoreCountTokensResponse> {
    const url = `${this.config.baseUrl}/v1/projects/${this.config.project}/locations/${this.config.location}/publishers/google/models/${request.model || this.config.model}:countTokens`;
    const headers = {
      ...(await this.getAuthHeaders()),
      'Content-Type': 'application/json',
    };
    const options: GaxiosOptions = {
      url,
      method: 'POST',
      headers,
      data: { contents: request.contents },
      timeout: this.getTimeoutMs(),
      agent: this.getHttpsAgent(),
    };
    try {
      const response: GaxiosResponse = await this.requestWithHandling(options);
      return response.data as CoreCountTokensResponse;
    } catch (err: any) {
      // Fallback: estimate tokens locally if endpoint is not available
      if (err.message && err.message.includes('404')) {
        return { totalTokens: this.estimateTokenCount(request.contents) };
      }
      throw err;
    }
  }

  // Local estimation fallback for token counting
  private estimateTokenCount(contents: any): number {
    // Simple estimation: 1 token per 4 characters (as in contentGenerator.ts)
    if (typeof contents === 'string') {
      return Math.ceil(contents.length / 4);
    }
    if (Array.isArray(contents)) {
      let total = 0;
      for (const item of contents) {
        if (typeof item === 'object' && item !== null && 'parts' in item) {
          for (const part of item.parts || []) {
            if (part.text) total += Math.ceil(part.text.length / 4);
            if (part.functionCall) total += 15;
            if (part.inlineData) total += Math.ceil((part.inlineData.data?.length || 0) / 100);
          }
          if (item.role) total += 5;
        } else {
          total += Math.ceil(String(item).length / 4);
        }
      }
      total += Math.ceil(contents.length * 3);
      return Math.max(1, total);
    }
    return 1;
  }

  async generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<CoreGenerateContentResponse>> {
    const url = this.buildUrl('streamGenerateContent');
    const headers = {
      ...(await this.getAuthHeaders()),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const { contents, config } = request;
    const {
      systemInstruction,
      safetySettings,
      tools,
      toolConfig,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      abortSignal,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      httpOptions,
      ...generationConfig
    } = config || {};

    const data: any = {
      contents,
      ...(systemInstruction && {
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
      }),
      ...(safetySettings && { safetySettings }),
      ...(tools && { tools }),
      ...(toolConfig && { toolConfig }),
      ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
    };

    // Create a deep copy to avoid any reference issues.
    const requestData = JSON.parse(JSON.stringify(data));

    const options: GaxiosOptions = {
      url,
      method: 'POST',
      headers,
      data: requestData,
      timeout: this.getTimeoutMs(),
      agent: this.getHttpsAgent(),
    };

    // // BEGIN: Backup implementation for true streaming
    // // If the Stork endpoint is updated to support true streaming in the future,
    // // comment out the "fake stream" implementation below and uncomment this block.
    //
    // const streamOptions: GaxiosOptions = {
    //   ...options,
    //   responseType: 'stream',
    // };
    // const self = this;
    // async function* streamGenerator() {
    //   try {
    //     const response: GaxiosResponse = await self.requestWithHandling(streamOptions);
    //     if (response.data && typeof response.data.on === 'function') {
    //       const stream = response.data;
    //       let buffer = '';
    //       for await (const chunk of stream) {
    //         buffer += chunk.toString();
    //         let boundary = buffer.indexOf('\n');
    //         while (boundary !== -1) {
    //           const jsonStr = buffer.slice(0, boundary).trim();
    //           buffer = buffer.slice(boundary + 1);
    //           if (jsonStr) {
    //             try {
    //               const result = new GenerateContentResponse();
    //               Object.assign(result, JSON.parse(jsonStr));
    //               yield result;
    //             } catch (e) {
    //               // Ignore parse errors for incomplete chunks
    //             }
    //           }
    //           boundary = buffer.indexOf('\n');
    //         }
    //       }
    //     }
    //   } catch (err: any) {
    //      if (err.message && err.message.includes('404')) {
    //        const single = await self.generateContent(request);
    //        yield single;
    //        return;
    //      }
    //      throw err;
    //   }
    // }
    // return Promise.resolve(streamGenerator());
    //
    // // END: Backup implementation for true streaming


    // BEGIN: Current "fake stream" implementation for Stork endpoint
    const self = this;
    async function* generator() {
      try {
        const response: GaxiosResponse = await self.requestWithHandling(options);
        const responseData = response.data;

        if (Array.isArray(responseData)) {
          for (const item of responseData) {
            const result = new GenerateContentResponse();
            Object.assign(result, item);
            yield result;
          }
        } else if (responseData) {
          const result = new GenerateContentResponse();
          Object.assign(result, responseData);
          yield result;
        }
      } catch (err: any) {
        if (err.message && err.message.includes('404')) {
          const single = await self.generateContent(request);
          yield single;
          return;
        }
        throw err;
      }
    }
    return Promise.resolve(generator());
    // END: Current "fake stream" implementation
  }

  async getTier(): Promise<undefined> {
    return undefined;
  }
}
