#!/usr/bin/env node

/**
 * Test script to verify the HTTP interceptor works
 * Run with: node test-interceptor.js
 */

// Set up environment variables for testing
process.env.GOOGLE_GENAI_BASE_URL = 'https://your-enterprise-proxy.company.com';
process.env.GOOGLE_GENAI_PROJECT_ID = 'your-project-id';
process.env.GOOGLE_GENAI_LOCATION = 'us-central1';
process.env.GOOGLE_API_KEY = 'your-api-key';

// Import the interceptor
import { CustomHttpInterceptor } from './packages/core/dist/src/core/httpInterceptor.js';

// Create and activate interceptor
const interceptor = new CustomHttpInterceptor({
  baseURL: process.env.GOOGLE_GENAI_BASE_URL,
  projectId: process.env.GOOGLE_GENAI_PROJECT_ID,
  location: process.env.GOOGLE_GENAI_LOCATION,
  apiKey: process.env.GOOGLE_API_KEY,
});

interceptor.intercept();

// Test the interceptor
async function testInterceptor() {
  console.log('Testing HTTP Interceptor...\n');
  
  try {
    // Test 1: This should be intercepted and redirected
    console.log('Test 1: Intercepting Google Generative AI request...');
    const response1 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }],
      }),
    });
    
    console.log('Response status:', response1.status);
    console.log('Response URL:', response1.url);
    
    if (response1.status !== 200) {
      const errorText = await response1.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Test 2: This should NOT be intercepted (different domain)
    console.log('Test 2: Regular request (should not be intercepted)...');
    const response2 = await fetch('https://httpbin.org/get');
    console.log('Response status:', response2.status);
    console.log('Response URL:', response2.url);
    
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Test 3: Test countTokens endpoint
    console.log('Test 3: Intercepting countTokens request...');
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
    
  } catch (error) {
    console.error('Test 3 failed:', error.message);
  }

  console.log('\nInterceptor test completed!');
}

// Run the test
testInterceptor(); 