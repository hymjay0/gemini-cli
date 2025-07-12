import { describe, it, expect, vi } from 'vitest';
import { fetchWithCaBundle } from './fetch.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Helper to create a simple HTTP server for testing
function createTestServer(responseText: string) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(responseText);
  });
  return new Promise<{ server: http.Server; url: string }>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

describe('fetchWithCaBundle', () => {
  it('should fetch a URL successfully (no CA bundle needed for HTTP)', async () => {
    const { server, url } = await createTestServer('hello world');
    try {
      const response = await fetchWithCaBundle(url);
      const text = await response.text();
      expect(text).toBe('hello world');
      expect(response.ok).toBe(true);
    } finally {
      server.close();
    }
  });

  it('should use REQUESTS_CA_BUNDLE if set (mocked, HTTPS not tested here)', async () => {
    // Set a fake CA bundle path
    process.env.REQUESTS_CA_BUNDLE = path.join(__dirname, 'fake-ca.pem');
    // Write a dummy CA file
    fs.writeFileSync(process.env.REQUESTS_CA_BUNDLE, 'FAKE CA');
    // Just ensure it does not throw for HTTP
    const { server, url } = await createTestServer('ca bundle test');
    try {
      const response = await fetchWithCaBundle(url);
      const text = await response.text();
      expect(text).toBe('ca bundle test');
      expect(response.ok).toBe(true);
    } finally {
      server.close();
      fs.unlinkSync(process.env.REQUESTS_CA_BUNDLE);
      delete process.env.REQUESTS_CA_BUNDLE;
    }
  });
}); 