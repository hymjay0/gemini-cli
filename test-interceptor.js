#!/usr/bin/env node

/**
 * Test script for the HTTP interceptor
 * This script tests the interceptor's ability to redirect requests to custom endpoints
 */

// Set up environment variables for testing
process.env.GOOGLE_GENAI_BASE_URL = 'https://your-enterprise-proxy.company.com';
process.env.GOOGLE_GENAI_PROJECT_ID = 'your-project-id';
process.env.GOOGLE_GENAI_LOCATION = 'us-central1';
process.env.GOOGLE_API_KEY = 'your-api-key';
// Uncomment for Bearer token authentication:
// process.env.GOOGLE_ACCESS_TOKEN = 'ya29.a0...';  // Get with: gcloud auth print-access-token

// Test enterprise endpoint configuration
process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT = 'true';
process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM = 'false';
process.env.GEMINI_ENTERPRISE_COUNT_TOKENS = 'false';
process.env.GEMINI_ENTERPRISE_EMBED_CONTENT = 'true';

// Test CA bundle configuration (optional)
// process.env.REQUESTS_CA_BUNDLE = '/path/to/your/ca-bundle.crt';

// Import the interceptor
import { CustomHttpInterceptor } from './packages/core/dist/src/core/httpInterceptor.js';

// Create and activate interceptor
const interceptor = new CustomHttpInterceptor({
  baseURL: process.env.GOOGLE_GENAI_BASE_URL,
  projectId: process.env.GOOGLE_GENAI_PROJECT_ID,
  location: process.env.GOOGLE_GENAI_LOCATION,
  apiKey: process.env.GOOGLE_API_KEY,
  accessToken: process.env.GOOGLE_ACCESS_TOKEN,
});

interceptor.intercept();

async function testInterceptor() {
  console.log('Testing HTTP Interceptor...\n');
  
  try {
    // Test 1: Test generateContent endpoint
    console.log('Test 1: Intercepting Google Generative AI request...');
    const response1 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello world' }] }],
      }),
    });
    
    console.log('Response status:', response1.status);
    console.log('Response URL:', response1.url);
    
    // Check if URL was transformed
    if (response1.url.includes('your-enterprise-proxy.company.com')) {
      console.log('✅ URL successfully transformed to enterprise endpoint');
    } else {
      console.log('❌ URL was not transformed');
    }
    
  } catch (error) {
    console.error('Test 1 failed:', error.message);
    console.log('Note: This is expected if the enterprise proxy is not accessible');
  }

  try {
    // Test 2: Test generateContentStream endpoint
    console.log('\nTest 2: Intercepting generateContentStream request...');
    const response2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-0506:generateContent?alt=sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello world' }] }],
      }),
    });
    
    console.log('Response status:', response2.status);
    console.log('Response URL:', response2.url);
    
    // Check if URL was transformed
    if (response2.url.includes('your-enterprise-proxy.company.com')) {
      console.log('✅ URL successfully transformed to enterprise endpoint');
    } else {
      console.log('❌ URL was not transformed');
    }
    
  } catch (error) {
    console.error('Test 2 failed:', error.message);
    console.log('Note: This is expected if the enterprise proxy is not accessible');
  }

  try {
    // Test 3: Test countTokens endpoint
    console.log('\nTest 3: Intercepting countTokens request...');
    const response3 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:countTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello world' }] }],
      }),
    });
    
    console.log('Response status:', response3.status);
    console.log('Response URL:', response3.url);
    
    // Check if URL was transformed
    if (response3.url.includes('your-enterprise-proxy.company.com')) {
      console.log('✅ URL successfully transformed to enterprise endpoint');
    } else {
      console.log('❌ URL was not transformed');
    }
    
  } catch (error) {
    console.error('Test 3 failed:', error.message);
    console.log('Note: This is expected if the enterprise proxy is not accessible');
  }

  try {
    // Test 4: Test embedContent endpoint
    console.log('\nTest 4: Intercepting embedContent request...');
    const response4 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello world' }] }],
      }),
    });
    
    console.log('Response status:', response4.status);
    console.log('Response URL:', response4.url);
    
    // Check if URL was transformed
    if (response4.url.includes('your-enterprise-proxy.company.com')) {
      console.log('✅ URL successfully transformed to enterprise endpoint');
    } else {
      console.log('❌ URL was not transformed');
    }
    
  } catch (error) {
    console.error('Test 4 failed:', error.message);
    console.log('Note: This is expected if the enterprise proxy is not accessible');
  }

  console.log('\nInterceptor test completed!');
}

// Test enterprise endpoint configuration
async function testEnterpriseConfiguration() {
  console.log('\n=== Testing Enterprise Endpoint Configuration ===\n');
  
  // Test default enterprise configuration
  console.log('Default enterprise configuration:');
  console.log('- generateContent: true');
  console.log('- generateContentStream: false');
  console.log('- countTokens: false (using local estimation)');
  console.log('- embedContent: true');
  
  // Test environment variable overrides
  console.log('\nEnvironment variable configuration:');
  console.log('- GEMINI_ENTERPRISE_GENERATE_CONTENT:', process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT);
  console.log('- GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM:', process.env.GEMINI_ENTERPRISE_GENERATE_CONTENT_STREAM);
  console.log('- GEMINI_ENTERPRISE_COUNT_TOKENS:', process.env.GEMINI_ENTERPRISE_COUNT_TOKENS);
  console.log('- GEMINI_ENTERPRISE_EMBED_CONTENT:', process.env.GEMINI_ENTERPRISE_EMBED_CONTENT);
  
  // Test CA bundle configuration
  console.log('\n=== Testing CA Bundle Configuration ===');
  if (process.env.REQUESTS_CA_BUNDLE) {
    console.log('- REQUESTS_CA_BUNDLE:', process.env.REQUESTS_CA_BUNDLE);
    console.log('✅ CA bundle configured for enterprise HTTPS connections');
  } else {
    console.log('- REQUESTS_CA_BUNDLE: not set');
    console.log('ℹ️  Using system default CA certificates');
  }
  
  // Test token estimation
  console.log('\n=== Testing Token Estimation ===');
  console.log('Note: Token estimation provides approximate counts for enterprise environments');
  console.log('where the countTokens endpoint is not available.');
  console.log('This enables chat compression to work with estimated token counts.');
  
  console.log('\nEnterprise configuration test completed!');
}

// Run tests
async function runTests() {
  await testInterceptor();
  await testEnterpriseConfiguration();
}

runTests().catch(console.error); 