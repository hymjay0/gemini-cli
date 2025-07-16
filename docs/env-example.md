# Environment Variables Reference

This document lists all the environment variables that can be used to configure the Gemini CLI.

## Quick Start

Create a `.env` file in your `.gemini` directory (e.g., `~/.gemini/.env`) with your configuration:

```bash
# Copy this template to ~/.gemini/.env and modify as needed
# Enterprise endpoint configuration
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_CLOUD_PROJECT=your-enterprise-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# SSO authentication (automatically gets access token)
SSO_SERVER=https://your-sso-server.company.com/auth
ADA_GENAI_SSO_ID=your-sso-username
ADA_GENAI_SSO_PASSWORD=your-sso-password

# Model configuration
GEMINI_MODEL=gemini-2.5-pro-0506
```

## API Keys and Authentication

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Yes* | `AIzaSyC...` |
| `GOOGLE_API_KEY` | Google Cloud API key (alternative) | Yes* | `AIzaSyC...` |
| `GOOGLE_ACCESS_TOKEN` | Google Cloud access token (enterprise) | No** | `your-access-token` |
| `SSO_SERVER` | SSO authentication endpoint (enterprise) | Yes*** | `https://your-sso-server.company.com/auth` |
| `ADA_GENAI_SSO_ID` | SSO username (enterprise) | Yes*** | `your-sso-username` |
| `ADA_GENAI_SSO_PASSWORD` | SSO password (enterprise) | Yes*** | `your-sso-password` |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | Yes*** | `my-project-123` |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud location | Yes*** | `us-central1` |

*Either `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or SSO authentication is required.
**`GOOGLE_ACCESS_TOKEN` is optional for enterprise environments - the CLI will automatically use SSO authentication if not provided.
***Required for Vertex AI authentication (SSO is recommended for enterprise).

## Enterprise Endpoint Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GOOGLE_GENAI_BASE_URL` | Custom base URL for enterprise endpoints | `https://generativelanguage.googleapis.com` | `https://your-enterprise-proxy.company.com` |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID for enterprise endpoints |  | `your-enterprise-project-id` |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud location for enterprise endpoints |  | `us-central1` |

### SSO Client Integration

The Gemini CLI includes an SSO client for enterprise authentication. When using Vertex AI (`vertex_ai=true`), the CLI automatically uses SSO authentication to obtain Bearer tokens for API requests.

**SSO Client Features:**
- Automatic token retrieval via `ssoAuth.getToken()`
- Token caching with expiration handling
- Enterprise proxy and CA bundle support
- Automatic Bearer token generation for API requests

**Authentication Flow:**
1. **Default Flow**: SSO authentication automatically gets access token → used as Bearer token
2. **Alternative Flow**: If `GOOGLE_ACCESS_TOKEN` is set explicitly, this token is used directly as a Bearer token, bypassing SSO authentication

**SSO Configuration:**
```bash
# SSO server URL (required for SSO authentication)
export SSO_SERVER=https://your-sso-server.company.com/auth

# SSO credentials (if not using environment-based auth)
export ADA_GENAI_SSO_ID=your-sso-username
export ADA_GENAI_SSO_PASSWORD=your-sso-password
# OR
export ONE_BANK_ID=your-sso-username
export ONE_BANK_PASSWORD=your-sso-password

# Enterprise proxy support
export HTTPS_PROXY=http://proxy.company.com:8080
export REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt
```

**Usage in Enterprise:**
```typescript
// The CLI automatically calls this when using Vertex AI without an access token
const accessToken = await ssoAuth.getToken();
```

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
# Enterprise endpoint configuration
GOOGLE_GENAI_BASE_URL=https://your-enterprise-proxy.company.com
GOOGLE_CLOUD_PROJECT=your-enterprise-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# SSO authentication (automatically gets access token)
SSO_SERVER=https://your-sso-server.company.com/auth
ADA_GENAI_SSO_ID=your-sso-username
ADA_GENAI_SSO_PASSWORD=your-sso-password

# Alternative: Set GOOGLE_ACCESS_TOKEN explicitly to bypass SSO
# GOOGLE_ACCESS_TOKEN=your-access-token  # Get with: gcloud auth print-access-token

# Disable unavailable endpoints
GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM=false
GEMINI_ENTERPRISE_COUNT_TOKENS=false

# Custom CA bundle for enterprise certificates
REQUESTS_CA_BUNDLE=/path/to/your/ca-bundle.crt

# Proxy configuration (if needed)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

## File Locations

The CLI looks for `.env` files in the following order:

1. `./.gemini/.env` (current directory)
2. `./.env` (current directory)
3. `~/.gemini/.env` (home directory)
4. `~/.env` (home directory)

The first `.env` file found will be used. 