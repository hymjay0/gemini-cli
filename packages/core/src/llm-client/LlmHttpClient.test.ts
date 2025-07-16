import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmHttpClient, LlmHttpClientConfig } from './LlmHttpClient.js';

const mockGaxiosRequest = vi.fn();

vi.mock('gaxios', () => {
  return {
    Gaxios: vi.fn().mockImplementation(() => ({
      request: mockGaxiosRequest,
    })),
  };
});

describe('LlmHttpClient', () => {
  let client: LlmHttpClient;
  const config: LlmHttpClientConfig = {
    baseUrl: 'https://example.com',
    project: 'test-project',
    location: 'us-central1',
    model: 'test-model',
    accessToken: 'test-token',
  };

  beforeEach(() => {
    mockGaxiosRequest.mockReset();
    client = new LlmHttpClient(config);
  });

  it('should call generateContent and return data', async () => {
    mockGaxiosRequest.mockResolvedValue({ data: { candidates: [{ content: { parts: [{ text: 'hello' }] } }] }, status: 200, config: { url: 'test' } });
    const res = await client.generateContent({ model: 'test-model', contents: ['hello'] });
    expect(res).toEqual({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] });
    expect(mockGaxiosRequest).toHaveBeenCalled();
  });

  it('should call embedContent and return data', async () => {
    mockGaxiosRequest.mockResolvedValue({ data: { embeddings: [{ values: [1, 2, 3] }] }, status: 200, config: { url: 'test' } });
    const res = await client.embedContent({ model: 'test-model', contents: ['abc'] });
    expect(res).toEqual({ embeddings: [{ values: [1, 2, 3] }] });
    expect(mockGaxiosRequest).toHaveBeenCalled();
  });

  it('should call countTokens and return data', async () => {
    mockGaxiosRequest.mockResolvedValue({ data: { totalTokens: 42 }, status: 200, config: { url: 'test' } });
    const res = await client.countTokens({ model: 'test-model', contents: 'hello world' });
    expect(res).toEqual({ totalTokens: 42 });
    expect(mockGaxiosRequest).toHaveBeenCalled();
  });

  it('should fallback to estimateTokenCount if countTokens endpoint returns 404', async () => {
    mockGaxiosRequest.mockRejectedValue({ message: '404', response: { status: 404 } });
    const res = await client.countTokens({ model: 'test-model', contents: 'hello world' });
    // Estimate: 'hello world'.length = 11, 11/4 = 2.75 => 3
    expect(res).toEqual({ totalTokens: 3 });
  });

  it('should call generateContentStream and yield data if supported', async () => {
    const mockStream = async function* () {
      yield { candidates: [{ content: { parts: [{ text: 'streamed' }] } }] };
    };
    client.generateContentStream = vi.fn().mockResolvedValue(mockStream());
    const gen = await client.generateContentStream({ model: 'test-model', contents: ['stream'] });
    const results = [];
    for await (const chunk of gen) {
      results.push(chunk);
    }
    expect(results).toEqual([{ candidates: [{ content: { parts: [{ text: 'streamed' }] } }] }]);
  });
}); 