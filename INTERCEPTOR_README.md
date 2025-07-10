# HTTP Interceptor for Custom Endpoints

This implementation adds an HTTP interceptor to the Gemini CLI that redirects Google API requests to custom enterprise endpoints.

## How It Works

The interceptor:
1. **Captures** all HTTP requests made by the application
2. **Identifies** requests going to Google's Generative AI API
3. **Transforms** the URLs to point to your custom endpoint
4. **Forwards** the requests to your enterprise proxy

## SDK Endpoints Supported

The interceptor handles **4 main endpoints** used by the `@google/genai` SDK:

### **Primary Endpoints:**
1. **`generateContent`** - For generating text responses (main endpoint)
2. **`generateContentStream`** - For streaming responses (internal use)
3. **`countTokens`** - For counting tokens in content
4. **`embedContent`** - For creating embeddings

### **Endpoint Usage:**
- **`generateContent`** is the primary endpoint used for most interactions
- **`generateContentStream`** is used internally for streaming responses
- **`countTokens`** is used for token counting and chat compression
- **`embedContent`** is used for creating embeddings (e.g., for memory features)

## Model Configuration

### **Available Gemini Models**

The Gemini CLI supports multiple model versions. Here are the currently supported models:

#### **Gemini 2.5 Models (Latest)**
- `gemini-2.5-pro` - Default Pro model (1M token limit)
- `gemini-2.5-flash` - Fast Flash model (1M token limit)
- `gemini-2.5-pro-preview-05-06` - Preview version
- `gemini-2.5-pro-preview-06-05` - Preview version
- `gemini-2.5-flash-preview-05-20` - Preview version

#### **Gemini 2.0 Models**
- `gemini-2.0-flash` - Flash model (1M token limit)
- `gemini-2.0-flash-preview-image-generation` - Image generation (32K token limit)

#### **Gemini 1.5 Models**
- `gemini-1.5-pro` - Pro model (2M token limit)
- `gemini-1.5-flash` - Flash model (1M token limit)

#### **Embedding Models**
- `gemini-embedding-001` - Default embedding model

### **Enterprise Model Names**

For enterprise environments, you may have custom model names like:
- `gemini-2.5-pro-0506`
- `gemini-2.5-flash-enterprise`
- `gemini-2.0-pro-custom`

**The interceptor preserves model names exactly as configured** - no transformation is applied.

### **How to Configure Models**

#### **1. Environment Variable (Recommended)**
```bash
# Set your preferred model
export GEMINI_MODEL="gemini-2.5-pro-0506"

# For enterprise environments
export GEMINI_MODEL="your-enterprise-model-name"
```

#### **2. Command Line Argument**
```bash
# Use specific model for this session
gemini --model "gemini-2.5-pro-0506" "Hello world"

# Or with short flag
gemini -m "gemini-2.5-flash" "Hello world"
```

#### **3. Settings File**
Create or edit `~/.gemini/settings.json`:
```json
{
  "model": "gemini-2.5-pro-0506"
}
```

#### **4. Project-Specific Configuration**
Create `.gemini/settings.json` in your project root:
```json
{
  "model": "gemini-2.5-pro-0506"
}
```

### **Model Selection Priority**
1. Command line argument (`--model` or `-m`)
2. Environment variable (`GEMINI_MODEL`)
3. Project settings (`.gemini/settings.json`)
4. Global settings (`~/.gemini/settings.json`)
5. Default model (`gemini-2.5-pro`)

## Files Created/Modified

### New Files
- `packages/core/src/core/httpInterceptor.ts` - The HTTP interceptor implementation
- `test-interceptor.js` - Test script to verify the interceptor works

### Modified Files
- `packages/core/src/core/contentGenerator.ts` - Updated to use the interceptor

## Configuration

### Environment Variables

Set these environment variables to enable the custom endpoint:

```bash
# Standard Vertex AI configuration
export GOOGLE_API_KEY="your-vertex-ai-api-key"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"

# Custom endpoint configuration (your enterprise proxy)
export GOOGLE_GENAI_BASE_URL="https://your-enterprise-proxy.company.com"
export GOOGLE_GENAI_PROJECT_ID="your-project-id"
export GOOGLE_GENAI_LOCATION="us-central1"

# Model configuration
export GEMINI_MODEL="gemini-2.5-pro-0506"

# Proxy configuration (if needed)
export HTTPS_PROXY="http://your-proxy-server:port"
export HTTP_PROXY="http://your-proxy-server:port"
export NO_PROXY="localhost,127.0.0.1,.your-company.com"

# Disable telemetry to prevent external connections
export GEMINI_TELEMETRY_ENABLED="false"
```

### URL Transformation Examples

The interceptor transforms URLs like this:

**Original (Google's endpoint):**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:countTokens
https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
```

**Transformed (Your enterprise endpoint):**
```
https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:generateContent
https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:countTokens
https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-embedding-001:embedContent
```

## Testing

### 1. Test the Interceptor

Run the test script to verify the interceptor works:

```bash
# First, update the environment variables in test-interceptor.js
node test-interceptor.js
```

Expected output:
```
Testing HTTP Interceptor...

[HTTP Interceptor] Interceptor activated
Test 1: Intercepting Google Generative AI request...
[HTTP Interceptor] Intercepting request to: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent
[HTTP Interceptor] Redirecting to: https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:generateContent
Response status: 200
Response URL: https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:generateContent
```

### 2. Test with Gemini CLI

Build and run the CLI with your custom configuration:

```bash
# Build the package
npm run build

# Run with custom endpoint and model
gemini --model "gemini-2.5-pro-0506" "Hello, test the custom endpoint"
```

## How to Use in Enterprise Environment

1. **Set up your environment variables** with your enterprise proxy details
2. **Configure your model name** (e.g., `gemini-2.5-pro-0506`)
3. **Build the package** with `npm run build`
4. **Deploy** the built package to your enterprise environment
5. **Run** the CLI normally - it will automatically use your custom endpoint

## Debugging

To see what's happening, enable debug logging:

```bash
# Enable debug output
DEBUG=* gemini "Hello world"

# Or check the console output for interceptor messages
```

The interceptor will log messages like:
```
[Custom Endpoint] Using custom endpoint: https://your-enterprise-proxy.company.com
[HTTP Interceptor] Interceptor activated
[HTTP Interceptor] Intercepting request to: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent
[HTTP Interceptor] Redirecting to: https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:generateContent
```

## Security Considerations

1. **API Key Security**: Ensure your API keys are stored securely
2. **Network Security**: All requests go through your enterprise proxy
3. **No External Connections**: Disable telemetry to prevent external data transmission
4. **Audit Logging**: Your enterprise proxy can log all API requests
5. **Model Access**: Ensure your enterprise proxy has access to the configured models

## Troubleshooting

### Interceptor Not Working
- Check that all environment variables are set correctly
- Verify the interceptor is being activated (look for debug messages)
- Ensure your enterprise proxy is accessible
- Confirm your model name is valid for your enterprise setup

### Authentication Errors
- Verify your API key is valid
- Check that your enterprise proxy is configured to handle authentication
- Ensure the project ID and location match your Vertex AI setup
- Confirm your model is available in your enterprise environment

### Network Errors
- Check your proxy configuration
- Verify network connectivity to your enterprise proxy
- Ensure firewall rules allow the connection
- Test connectivity to your enterprise proxy directly

### Model Errors
- Verify the model name is correct for your enterprise
- Check that the model is available in your enterprise environment
- Ensure your API key has access to the specified model
- Try using a different model to isolate the issue

## Limitations

1. **Global Interception**: The interceptor affects all HTTP requests in the process
2. **URL Pattern Matching**: Only requests matching Google's API patterns are intercepted
3. **Method Preservation**: The interceptor preserves the original HTTP method and parameters
4. **Error Handling**: Errors from your enterprise proxy will be returned as-is
5. **Model Compatibility**: Ensure your enterprise proxy supports the models you want to use

## Future Enhancements

Potential improvements:
1. **Selective Interception**: Only intercept specific requests
2. **Retry Logic**: Add retry logic for failed requests
3. **Circuit Breaker**: Add circuit breaker pattern for reliability
4. **Metrics**: Add metrics collection for monitoring
5. **Model Validation**: Add validation for model availability
6. **Fallback Models**: Add automatic fallback to available models

## Advanced Model Configuration

### **All 3 Model Types**

The Gemini CLI uses 3 different model types internally:

#### **1. Main Model (Configurable)**
- **Purpose**: Primary text generation
- **Default**: `gemini-2.5-pro`
- **Configurable**: Yes
- **Configuration**:
  ```bash
  # Environment variable
  export GEMINI_MODEL="gemini-2.5-pro-0506"
  
  # Command line
  gemini --model "gemini-2.5-pro-0506"
  
  # Settings file
  {
    "model": "gemini-2.5-pro-0506"
  }
  ```

#### **2. Fallback Model (Hardcoded)**
- **Purpose**: Automatic fallback when main model is rate-limited
- **Default**: `gemini-2.5-flash`
- **Configurable**: No (hardcoded in `packages/core/src/config/models.ts`)
- **Usage**: Automatically switched to when main model returns 429 errors

#### **3. Embedding Model (Hardcoded)**
- **Purpose**: Creating embeddings for memory and search features
- **Default**: `gemini-embedding-001`
- **Configurable**: No (hardcoded in `packages/core/src/config/models.ts`)
- **Usage**: Used internally for embedding generation

### **Why Only Main Model is Configurable**

1. **Fallback Model**: Automatically handled by the system
2. **Embedding Model**: Used internally and doesn't need user configuration
3. **Main Model**: The only one users need to configure for their use case

### **Enterprise Configuration for All Models**

If your enterprise uses custom model names for all three types, you can modify the defaults in the code:

```typescript
// In packages/core/src/config/models.ts
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro-0506';           // Your main model
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash-0506';   // Your fallback model
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'; // Your embedding model
```

### **Model Usage Examples**

```bash
# Main model (configurable)
gemini --model "gemini-2.5-pro-0506" "Hello world"

# Fallback model (automatic)
# When main model hits rate limit, automatically switches to gemini-2.5-flash

# Embedding model (internal)
# Used automatically for memory features, no user configuration needed
```

### **URL Transformation for All Models**

The interceptor handles all three model types:

**Main Model:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent
→ https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-pro-0506:generateContent
```

**Fallback Model:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
→ https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent
```

**Embedding Model:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
→ https://your-enterprise-proxy.company.com/v1/projects/your-project-id/locations/us-central1/publishers/google/models/gemini-embedding-001:embedContent
```

## Simplified Model Configuration

### **All 3 Models Hardcoded**

All 3 model types are **hardcoded** in `packages/core/src/config/models.ts`:

```typescript
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';           // Main model
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';   // Fallback model  
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'; // Embedding model
```

### **Alternative: Configure Main Model in Settings**

Instead of hardcoding, you can configure the **main model** in `.gemini/settings.json`:

```json
{
  "model": "gemini-2.5-pro-0506",
  "customBaseURL": "https://your-enterprise-proxy.company.com",
  "customProjectId": "your-project-id", 
  "customLocation": "us-central1"
}
```

**Note**: Only the main model is configurable. Fallback and embedding models remain hardcoded.
