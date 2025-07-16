# Enterprise Adaptation for Gemini CLI (2024)

This document describes how the Gemini CLI is adapted for enterprise environments using a direct HTTP client for LLM calls, replacing the previous HTTP interceptor approach.

## Problem Statement

Enterprise environments often require:
- Custom endpoints for LLM API calls (not public Google endpoints)
- SSO or custom authentication
- Proxy and CA bundle support
- Disabled telemetry
- Graceful handling of unavailable endpoints (e.g., streaming, token counting)

## Solution Overview

### Direct HTTP Client (LlmHttpClient)
- All LLM API calls (`generateContent`, `embedContent`, `generateContentStream`, `countTokens`) go through a dedicated HTTP client (`LlmHttpClient`) in enterprise mode.
- The client is activated when `GOOGLE_GENAI_BASE_URL` is set.
- All config (base URL, project, location, model, access token, proxy, CA bundle) is provided via environment variables.
- No HTTP interceptor is used; all logic is centralized in the client.

### Endpoint Gating and Fallbacks
- Endpoint availability is controlled by environment variables:
  - `GEMINI_ENTERPRISE_GENERATE_CONTENT`
  - `GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM`
  - `GEMINI_ENTERPRISE_COUNT_TOKENS`
  - `GEMINI_ENTERPRISE_EMBED_CONTENT`
- If an endpoint is disabled or not available, the CLI provides graceful fallbacks:
  - Streaming falls back to non-streaming
  - Token counting falls back to local estimation
  - Required endpoints (generateContent, embedContent) throw clear errors if disabled

### Authentication
- SSO authentication is used by default to obtain a Bearer token for API requests.
- Alternatively, `GOOGLE_ACCESS_TOKEN` can be set directly.
- Proxy and CA bundle support is provided via `HTTPS_PROXY` and `REQUESTS_CA_BUNDLE`.

### Model Configuration
- Model names are preserved as configured (no transformation).
- Main model is configurable via `GEMINI_MODEL`.

### Security and Telemetry
- All telemetry is disabled by default in enterprise mode.
- No external network calls are made except to the configured enterprise endpoint.

## Configuration Example

```bash
# Required for enterprise mode
export GOOGLE_GENAI_BASE_URL="https://your-enterprise-proxy.company.com"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"

# SSO authentication (default)
export SSO_SERVER="https://your-sso-server.company.com/auth"
export ADA_GENAI_SSO_ID="your-sso-username"
export ADA_GENAI_SSO_PASSWORD="your-sso-password"

# Alternatively, set GOOGLE_ACCESS_TOKEN directly
# export GOOGLE_ACCESS_TOKEN="your-access-token"

# Model configuration
export GEMINI_MODEL="gemini-2.5-pro-0506"

# Endpoint gating (optional)
export GEMINI_ENTERPRISE_GENERATE_CONTENT="true"
export GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM="false"
export GEMINI_ENTERPRISE_COUNT_TOKENS="false"
export GEMINI_ENTERPRISE_EMBED_CONTENT="true"

# Proxy and CA bundle (if needed)
export HTTPS_PROXY="http://proxy.company.com:8080"
export REQUESTS_CA_BUNDLE="/path/to/your/ca-bundle.crt"
```

## User Experience
- On startup, the CLI displays the enterprise endpoint configuration and which endpoints are enabled/disabled.
- When a fallback is used (e.g., streaming disabled), a one-time warning is shown.
- If a required endpoint is disabled, a clear error is thrown.

## Migration Summary
- The HTTP interceptor is fully removed.
- All enterprise LLM calls use the new HTTP client.
- Endpoint gating and fallbacks are handled via environment variables and the client wrapper.
- Security, proxy, and CA bundle support are built-in.

## Benefits
- **Simplicity:** All logic is centralized in the HTTP client.
- **Security:** No external telemetry, all requests go through the enterprise proxy.
- **Flexibility:** Per-endpoint configuration and graceful fallbacks.
- **Maintainability:** No global HTTP interception, easier to debug and extend.

## Troubleshooting
- Ensure all required environment variables are set.
- If an endpoint is unavailable, check the corresponding `GEMINI_ENTERPRISE_*` variable.
- For authentication issues, verify SSO credentials or access token.
- For network issues, check proxy and CA bundle configuration.

---

This adaptation makes the Gemini CLI robust and secure for enterprise deployment, with clear configuration and graceful handling of limited endpoint availability. 