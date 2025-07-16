/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@google/gemini-cli-core';
import { loadEnvironment } from './settings.js';

export const validateAuthMethod = (authMethod: string): string | null => {
  loadEnvironment();
  
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    if (!process.env.GEMINI_API_KEY) {
      return 'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    // Check for enterprise mode (custom endpoint)
    const hasEnterpriseConfig = !!(
      process.env.GOOGLE_GENAI_BASE_URL &&
      (process.env.GOOGLE_GENAI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT) &&
      (process.env.GOOGLE_GENAI_LOCATION || process.env.GOOGLE_CLOUD_LOCATION)
    );
    
    // Check for standard Vertex AI mode
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
    
    // Check for SSO authentication in enterprise mode
    const hasSsoConfig = !!(
      process.env.SSO_SERVER &&
      (process.env.ADA_GENAI_SSO_ID || process.env.ONE_BANK_ID) &&
      (process.env.ADA_GENAI_SSO_PASSWORD || process.env.ONE_BANK_PASSWORD)
    );
    
    // Check for explicit access token
    const hasAccessToken = !!process.env.GOOGLE_ACCESS_TOKEN;
    
    if (hasEnterpriseConfig) {
      // In enterprise mode, we need either SSO config, access token, or API key
      if (hasSsoConfig || hasAccessToken || hasGoogleApiKey) {
        return null;
      } else {
        return (
          'When using Vertex AI in enterprise mode, you must specify either:\n' +
          '• SSO authentication (SSO_SERVER, ADA_GENAI_SSO_ID, ADA_GENAI_SSO_PASSWORD)\n' +
          '• GOOGLE_ACCESS_TOKEN environment variable\n' +
          '• GOOGLE_API_KEY environment variable\n' +
          'Update your environment and try again (no reload needed if using .env)!'
        );
      }
    } else {
      // Standard Vertex AI mode
      if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
        return (
          'When using Vertex AI, you must specify either:\n' +
          '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
          '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
          'Update your environment and try again (no reload needed if using .env)!'
        );
      }
      return null;
    }
  }

  return 'Invalid auth method selected.';
};
