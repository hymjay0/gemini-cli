/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
  Content,
  ContentListUnion,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { ssoAuth } from '../auth/sso.js';
import { UserTierId } from '../code_assist/types.js';
import { LlmHttpClient } from '../llm-client/index.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  getTier?(): Promise<UserTierId | undefined>;
}

/**
 * Enterprise endpoint availability configuration
 */
export interface EnterpriseEndpointConfig {
  generateContent: boolean;
  generateContentStream: boolean;
  countTokens: boolean;
  embedContent: boolean;
}

/**
 * Default enterprise endpoint configuration - only generateContent and embedContent available
 */
export const DEFAULT_ENTERPRISE_ENDPOINTS: EnterpriseEndpointConfig = {
  generateContent: true,
  generateContentStream: false,
  countTokens: false,
  embedContent: true,
};

/**
 * Local token estimation for enterprise environments where countTokens endpoint is not available
 * This provides a best-guess approximation based on content analysis
 */
function estimateTokenCount(contents: ContentListUnion): number {
  let totalTokens = 0;
  
  // Handle string case (simple text)
  if (typeof contents === 'string') {
    return Math.ceil(contents.length / 4);
  }
  
  // Handle Content[] case
  if (Array.isArray(contents)) {
    for (const content of contents) {
      // Check if this is a Content object (has parts property)
      if (typeof content === 'object' && content !== null && 'parts' in content) {
        const contentObj = content as Content;
        
        if (contentObj.parts) {
          for (const part of contentObj.parts) {
            if (part.text) {
              // Basic token estimation: ~4 characters per token for English text
              // This is a rough approximation based on typical tokenization patterns
              const textTokens = Math.ceil(part.text.length / 4);
              totalTokens += textTokens;
            }
            
            // Account for function calls and other structured content
            if (part.functionCall) {
              // Function calls typically add ~10-20 tokens for structure
              totalTokens += 15;
            }
            
            if (part.inlineData) {
              // Inline data (images, etc.) typically adds significant tokens
              // For now, estimate based on data size
              const dataSize = part.inlineData.data?.length || 0;
              totalTokens += Math.ceil(dataSize / 100); // Rough estimate
            }
          }
        }
        
        // Account for role and structure overhead
        if (contentObj.role) {
          totalTokens += 5; // Role information adds some tokens
        }
      } else {
        // Handle other types (like PartUnion) - estimate based on string representation
        const contentStr = String(content);
        totalTokens += Math.ceil(contentStr.length / 4);
      }
    }
    
    // Add some overhead for message structure and formatting
    totalTokens += Math.ceil(contents.length * 3);
  }
  
  return Math.max(1, totalTokens); // Ensure at least 1 token
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  accessToken?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  // Add custom endpoint configuration
  customBaseURL?: string;
  customProjectId?: string;
  customLocation?: string;
  // Add enterprise endpoint configuration
  enterpriseEndpoints?: EnterpriseEndpointConfig;
};

/**
 * Enterprise-aware content generator that provides fallbacks for missing endpoints
 */
class EnterpriseContentGenerator implements ContentGenerator {
  private wrappedGenerator: ContentGenerator;
  private endpointConfig: EnterpriseEndpointConfig;
  private warningsShown = new Set<string>();

  constructor(
    wrappedGenerator: ContentGenerator,
    endpointConfig: EnterpriseEndpointConfig,
  ) {
    this.wrappedGenerator = wrappedGenerator;
    this.endpointConfig = endpointConfig;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    if (!this.endpointConfig.generateContent) {
      throw new Error('generateContent endpoint is not available in this enterprise environment');
    }
    return this.wrappedGenerator.generateContent(request);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (!this.endpointConfig.generateContentStream) {
      this.showWarningOnce('generateContentStream', 'Streaming is disabled in this enterprise environment. Using non-streaming mode.');
      // Fallback to non-streaming mode
      const response = await this.wrappedGenerator.generateContent(request);
      return (async function* (): AsyncGenerator<GenerateContentResponse> {
        yield response;
      })();
    }
    return this.wrappedGenerator.generateContentStream(request);
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    if (!this.endpointConfig.countTokens) {
      this.showWarningOnce('countTokens', 'Token counting is disabled in this enterprise environment. Using local estimation.');
      // Return a best-guess estimation based on content analysis
      const estimatedTokens = estimateTokenCount(request.contents);
      return {
        totalTokens: estimatedTokens,
      };
    }
    return this.wrappedGenerator.countTokens(request);
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    if (!this.endpointConfig.embedContent) {
      throw new Error('embedContent endpoint is not available in this enterprise environment');
    }
    return this.wrappedGenerator.embedContent(request);
  }

  private showWarningOnce(endpoint: string, message: string): void {
    if (!this.warningsShown.has(endpoint)) {
      console.warn(`[Enterprise Mode] ${message}`);
      this.warningsShown.add(endpoint);
    }
  }
}

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
): Promise<ContentGeneratorConfig> {
  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;
  
  // Get access token for enterprise authentication
  let accessToken = process.env.GOOGLE_ACCESS_TOKEN || undefined;
  
  // Add custom endpoint environment variables
  const customBaseURL = process.env.GOOGLE_GENAI_BASE_URL || undefined;
  const customProjectId = googleCloudProject;
  const customLocation = googleCloudLocation;

  // Check if we're in enterprise mode (custom endpoint configured)
  const isEnterpriseMode = !!(customBaseURL);

  // Use runtime model from config if available, otherwise fallback to parameter or default
  const effectiveModel = model || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_VERTEX_AI) {
    // For Vertex AI, prioritize SSO authentication for enterprise environments
    // If no access token in environment, try to get one from SSO client
    if (!accessToken) {
      try {
        accessToken = await ssoAuth.getToken();
        console.debug('[Enterprise Mode] Retrieved access token from SSO client');
      } catch (error) {
        console.debug('[Enterprise Mode] Could not get access token from SSO client:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Check if we have any form of authentication
    if (!googleApiKey && !accessToken && !(googleCloudProject && googleCloudLocation)) {
      throw new Error('Vertex AI authentication requires either GOOGLE_API_KEY, GOOGLE_ACCESS_TOKEN, or SSO authentication with GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION');
    }
    
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.accessToken = accessToken;
    contentGeneratorConfig.vertexai = true;
    
    // Add custom endpoint configuration
    if (customBaseURL && customProjectId && customLocation) {
      contentGeneratorConfig.customBaseURL = customBaseURL;
      contentGeneratorConfig.customProjectId = customProjectId;
      contentGeneratorConfig.customLocation = customLocation;
      
      // Configure enterprise endpoints based on environment variables or defaults
      const enterpriseEndpoints: EnterpriseEndpointConfig = {
        generateContent: process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT !== 'false',
        generateContentStream: process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM === 'true',
        countTokens: process.env.GEMINI_ENTERPRISE_COUNT_TOKENS === 'true',
        embedContent: process.env.GEMINI_ENTERPRISE_EMBED_CONTENT !== 'false',
      };
      
      contentGeneratorConfig.enterpriseEndpoints = enterpriseEndpoints;
      
      console.log('[Enterprise Mode] Using enterprise endpoint configuration:');
      console.log(`  - generateContent: ${enterpriseEndpoints.generateContent}`);
      console.log(`  - generateContentStream: ${enterpriseEndpoints.generateContentStream}`);
      console.log(`  - countTokens: ${enterpriseEndpoints.countTokens}`);
      console.log(`  - embedContent: ${enterpriseEndpoints.embedContent}`);
    }

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    return createCodeAssistContentGenerator(
      httpOptions,
      config.authType,
      gcConfig,
      sessionId,
    );
  }

  // ENTERPRISE MODE: Use LlmHttpClient if customBaseURL is set
  if (
    (config.authType === AuthType.USE_GEMINI || config.authType === AuthType.USE_VERTEX_AI) &&
    config.customBaseURL && config.customProjectId && config.customLocation
  ) {
    // Instantiate LlmHttpClient
    const llmClient = new LlmHttpClient({
      baseUrl: config.customBaseURL,
      project: config.customProjectId,
      location: config.customLocation,
      model: config.model,
      accessToken: config.accessToken,
      proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY,
      caBundlePath: process.env.REQUESTS_CA_BUNDLE,
      timeoutMs: 30000,
      maxAttempts: 3,
      logging: process.env.DEBUG === 'true',
    });
    // Wrap with EnterpriseContentGenerator for env var gating/fallbacks
    if (config.enterpriseEndpoints) {
      return new EnterpriseContentGenerator(llmClient, config.enterpriseEndpoints);
    }
    return llmClient;
  }

  // NON-ENTERPRISE: Use the standard GoogleGenAI (SDK)
  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
    const baseGenerator = googleGenAI.models;
    if (config.enterpriseEndpoints) {
      return new EnterpriseContentGenerator(baseGenerator, config.enterpriseEndpoints);
    }
    return baseGenerator;
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}

export type { GenerateContentParameters, GenerateContentResponse, CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse };
