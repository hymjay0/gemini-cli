# Environment Variables Reference

This document lists all the environment variables that can be used to configure the Gemini CLI.

## Quick Start

Create a `.env` file in your `.gemini` directory (e.g., `~/.gemini/.env`) with your configuration:

```bash
# Copy this template to ~/.gemini/.env and modify as needed
GEMINI_API_KEY=your-gemini-api-key-here
```

## API Keys and Authentication

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Yes* | `AIzaSyC...` |
| `GOOGLE_API_KEY` | Google Cloud API key (alternative) | Yes* | `AIzaSyC...` |
| `GOOGLE_ACCESS_TOKEN` | Google Cloud access token (enterprise) | Yes* | `ya29.a0...` |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | No | `my-project-123` |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud location | No | `us-central1` |

*Either `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `GOOGLE_ACCESS_TOKEN` is required. The CLI will also try to get an access token from the SSO client if available.

## Enterprise Endpoint Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GOOGLE_GENAI_BASE_URL` | Custom base URL for enterprise endpoints | `https://generativelanguage.googleapis.com` | `https://your-enterprise-proxy.company.com` |
| `GOOGLE_GENAI_PROJECT_ID` | Custom project ID for enterprise endpoints | `GOOGLE_CLOUD_PROJECT` | `your-enterprise-project-id` |
| `GOOGLE_GENAI_LOCATION` | Custom location for enterprise endpoints | `GOOGLE_CLOUD_LOCATION` | `us-central1` |

### SSO Client Integration

The Gemini CLI includes a dummy SSO client for testing purposes. In enterprise environments, this would be replaced with the actual SSO client that integrates with your enterprise authentication system.

**SSO Client Features:**
- Automatic token retrieval via `sso_client.get_token()`
- Token refresh capabilities
- Fallback authentication when `GOOGLE_ACCESS_TOKEN` is not set
- Enterprise-ready authentication flow

**Usage in Enterprise:**
```typescript
// The CLI automatically calls this when no access token is provided
const ssoClient = getSSOClient();
const accessToken = await ssoClient.getToken();
```

### HTTP Interceptor

The Gemini CLI includes an HTTP interceptor that automatically redirects Google Generative AI API requests to your enterprise endpoints. When configured, it transforms URLs from the standard Google API format to your enterprise Vertex AI format.

**URL Transformation Examples:**

**With API Key:**
- **Original:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`
- **Transformed:** `https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent?key=your-api-key`

**With Bearer Token:**
- **Original:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`
- **Transformed:** `https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent`
- **Authorization Header:** `Bearer ya29.a0...`

The interceptor automatically:
- Detects Google Generative AI API requests
- Transforms the URL to use your enterprise endpoint
- Adds your project ID and location
- Adds authentication via API key (query parameter) or Bearer token (Authorization header)
- Maintains the original request method, headers, and body
- Supports CA bundle configuration for enterprise certificates

### Enterprise Endpoint Availability

Configure which endpoints are available in your enterprise environment:

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `GEMINI_ENTERPRISE_GENERATE_CONTENT` | Enable generateContent endpoint | `true` | Usually available |
| `GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM` | Enable generateContentStream endpoint | `false` | Often not available in enterprise |
| `GEMINI_ENTERPRISE_COUNT_TOKENS` | Enable countTokens endpoint | `false` | Falls back to local estimation |
| `GEMINI_ENTERPRISE_EMBED_CONTENT` | Enable embedContent endpoint | `true` | Usually available |

## CA Bundle and HTTPS Configuration

For enterprise environments with custom certificates:

| Variable | Description | Example |
|----------|-------------|---------|
| `REQUESTS_CA_BUNDLE` | Path to custom CA bundle | `/path/to/your/ca-bundle.crt` |
| `NODE_EXTRA_CA_CERTS` | Alternative CA bundle path | `/path/to/your/ca-bundle.crt` |

## Proxy Configuration

For enterprise environments requiring HTTP proxies:

| Variable | Description | Example |
|----------|-------------|---------|
| `HTTP_PROXY` | HTTP proxy URL | `http://proxy.company.com:8080` |
| `HTTPS_PROXY` | HTTPS proxy URL | `http://proxy.company.com:8080` |
| `http_proxy` | HTTP proxy URL (lowercase) | `http://proxy.company.com:8080` |
| `https_proxy` | HTTPS proxy URL (lowercase) | `http://proxy.company.com:8080` |

## Development and Debugging

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `false` |
| `DEBUG_PORT` | Debug port for Node.js inspector | `9229` |
| `GEMINI_CLI_TELEMETRY_DISABLED` | Disable telemetry | `false` |

## Model Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_MODEL` | Default model to use | `gemini-2.5-pro` |

## Sandbox Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SANDBOX` | Enable sandbox mode | `false` |
| `GEMINI_SANDBOX_IMAGE` | Sandbox image | `default` |

## Other Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `NO_COLOR` | Disable color output | `false` |
| `CLOUD_SHELL` | Cloud Shell environment | `false` |
| `CLI_VERSION` | CLI version | `0.1.9` |

## Example Configuration Files

### Basic Configuration
```bash
# ~/.gemini/.env
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-pro
```

### Enterprise Configuration
```bash
# ~/.gemini/.env
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_GENAI_PROJECT_ID=your-enterprise-project-id
GOOGLE_GENAI_LOCATION=us-central1

# Disable unavailable endpoints
GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM=false
GEMINI_ENTERPRISE_COUNT_TOKENS=false

# Custom CA bundle for enterprise certificates
REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt

# Proxy configuration (if needed)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

### HTTP Interceptor Configuration

**With API Key Authentication:**
```bash
# ~/.gemini/.env
# HTTP Interceptor automatically redirects Google API requests to your enterprise endpoints

# Enterprise endpoint configuration
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_GENAI_PROJECT_ID=your-enterprise-project-id
GOOGLE_GENAI_LOCATION=us-central1
GOOGLE_API_KEY=your-api-key

# The interceptor will automatically transform URLs like:
# https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent
# to:
# https://your-enterprise-proxy.company.com/v1/projects/your-enterprise-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent?key=your-api-key

# CA bundle for enterprise HTTPS connections
REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt

# Enterprise endpoint availability (disable unavailable endpoints)
GEMINI_ENTERPRISE_GENERATE_CONTENT=true
GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM=false
GEMINI_ENTERPRISE_COUNT_TOKENS=false
GEMINI_ENTERPRISE_EMBED_CONTENT=true
```

**With Bearer Token Authentication (Enterprise):**
```bash
# ~/.gemini/.env
# HTTP Interceptor with Bearer token authentication for enterprise environments

# Enterprise endpoint configuration
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_GENAI_PROJECT_ID=your-enterprise-project-id
GOOGLE_GENAI_LOCATION=us-central1
GOOGLE_ACCESS_TOKEN=ya29.a0...  # Get with: gcloud auth print-access-token

# The interceptor will automatically transform URLs like:
# https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent
# to:
# https://your-enterprise-proxy.company.com/v1/projects/your-enterprise-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent
# with Authorization: Bearer ya29.a0... header

# CA bundle for enterprise HTTPS connections
REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt

# Enterprise endpoint availability (disable unavailable endpoints)
GEMINI_ENTERPRISE_GENERATE_CONTENT=true
GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM=false
GEMINI_ENTERPRISE_COUNT_TOKENS=false
GEMINI_ENTERPRISE_EMBED_CONTENT=true
```

**With SSO Client Authentication (Enterprise):**
```bash
# ~/.gemini/.env
# HTTP Interceptor with SSO client authentication for enterprise environments

# Enterprise endpoint configuration
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_GENAI_PROJECT_ID=your-enterprise-project-id
GOOGLE_GENAI_LOCATION=us-central1
# No GOOGLE_ACCESS_TOKEN needed - the CLI will get it from the SSO client

# The CLI will automatically:
# 1. Call sso_client.get_token() to get an access token
# 2. Transform URLs to use your enterprise endpoint
# 3. Add Authorization: Bearer <token> header

# CA bundle for enterprise HTTPS connections
REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt

# Enterprise endpoint availability (disable unavailable endpoints)
GEMINI_ENTERPRISE_GENERATE_CONTENT=true
GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM=false
GEMINI_ENTERPRISE_COUNT_TOKENS=false
GEMINI_ENTERPRISE_EMBED_CONTENT=true
```

### Development Configuration
```bash
# ~/.gemini/.env
GEMINI_API_KEY=your-gemini-api-key-here
DEBUG=true
DEBUG_PORT=9229
GEMINI_CLI_TELEMETRY_DISABLED=true
```

## File Locations

The CLI looks for `.env` files in the following order:

1. `./.gemini/.env` (current directory)
2. `./.env` (current directory)
3. `~/.gemini/.env` (home directory)
4. `~/.env` (home directory)

The first `.env` file found will be used. 