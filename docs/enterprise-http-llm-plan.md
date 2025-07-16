# Enterprise LLM HTTP Client Implementation Plan

This plan outlines the steps to replace the `js-genai` SDK with a robust, pure HTTP client (using `gaxios`) for Gemini/Vertex AI LLM calls in enterprise environments.

## 1. **Project Structure**
- Create a new module (e.g., `packages/llm-http-client/` or `src/llm-http-client/`).
- All LLM API calls (generateContent, embedContent, etc.) will go through this module.

## 2. **HTTP Client Foundation**
- Use `gaxios` for HTTP requests (install as dependency).
- Centralize all HTTP logic in a single file/class (e.g., `LlmHttpClient.ts`).
- Accept all config (baseUrl, project, location, model, accessToken, proxy, CA bundle) via constructor or options.

## 3. **Authentication**
- Always set `Authorization: Bearer <accessToken>` header.
- No support for API key or ADC.
- Optionally support token refresh/callback if needed.

## 4. **Endpoint Construction**
- Dynamically build URLs for each endpoint:
  - `generateContent`
  - `embedContent`
  - (Optionally) `countTokens`, `generateContentStream`
- Use environment variables or config for baseUrl, project, location, model.

## 5. **Robust Request Handling**
- Implement retry logic (exponential backoff, max attempts, retry on network/5xx errors).
- Support request timeouts and cancellation.
- Log all requests and responses (with redacted sensitive info).
- Surface clear errors for HTTP failures, timeouts, and invalid responses.

## 6. **Extensibility**
- Design the client so new endpoints can be added easily.
- Allow custom headers and request options for future needs.
- Support hooks/callbacks for logging, metrics, or custom error handling.

## 7. **Testing**
- Write unit tests for all client methods (mock HTTP responses).
- Add integration tests for real enterprise endpoints (if possible).

## 8. **Migration**
- Replace all `js-genai` usage in CLI/core with the new HTTP client.
- Ensure all enterprise mode logic (endpoint config, fallbacks) is preserved.
- Remove `js-genai` and related dependencies.

## 9. **Documentation**
- Document usage, configuration, and environment variables.
- Provide example usage for each endpoint.

---

**Next Steps:**
- [ ] Scaffold new HTTP client module
- [ ] Implement `generateContent` endpoint with retries
- [ ] Add support for `embedContent` and other endpoints as needed
- [ ] Integrate with CLI/core and test end-to-end 