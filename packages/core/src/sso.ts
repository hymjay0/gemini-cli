import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';

class SsoAuthClient {
  private readonly ssoUrl: string;
  private readonly cachePath = '.ssotoken';

  constructor() {
    this.ssoUrl = process.env.SSO_SERVER;
  }
  private async getTokenFromCache(): Promise<string | null> {
    try {
      const tokenData = await fs.promises.readFile(this.cachePath, 'utf-8');
      const { token, expires_at } = JSON.parse(tokenData);
      if (expires_at > Date.now()) {
        return token;
      }
    } catch (error) {
      // Ignore error if cache file doesn't exist
    }
    return null;
  }

  private async setTokenInCache(token: string, expiresIn: number) {
    const tokenData = {
      token,
      expires_at: Date.now() + expiresIn * 1000,
    };
    await fs.promises.writeFile(
      this.cachePath,
      JSON.stringify(tokenData, null, 2),
    );
  }

  async getToken(): Promise<string> {
    console.log(`SSO URL: ${this.ssoUrl}`);
    const cachedToken = await this.getTokenFromCache();
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
      const caFile = process.env.REQUESTS_CA_BUNDLE || process.env.SSL_CERT_FILE;

      const agentOptions: any = {};
      if (caFile) {
        agentOptions.ca = fs.readFileSync(caFile);
      }

      const requestConfig: {
        headers: { 'Content-Type': string };
        httpsAgent?: HttpsProxyAgent<string>;
      } = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (proxy) {
        requestConfig.httpsAgent = new HttpsProxyAgent(proxy, agentOptions);
      } else if (caFile) {
        // If no proxy but a CA file is present, use a standard https.Agent
        const https = await import('https');
        requestConfig.httpsAgent = new https.Agent(agentOptions) as any;
      }
      console.log(`SSO username: ${process.env.ADA_GENAI_SSO_ID || process.env.ONE_BANK_ID || 'test'}`);
      const response = await axios.post(
        this.ssoUrl,
        {
          userid:
            process.env.ADA_GENAI_SSO_ID || process.env.ONE_BANK_ID || 'test',
          password:
            process.env.ADA_GENAI_SSO_PASSWORD ||
            process.env.ONE_BANK_PASSWORD ||
            'test',
          otp: '111111',
          otp_type: 'PUSH',
        },
        requestConfig,
      );
      await this.setTokenInCache(
        response.data.id_token,
        response.data.expires_in,
      );
      return response.data.id_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('SSO authentication failed:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('An unexpected error occurred:', error);
      }
      throw new Error('SSO Authentication failed');
    }
  }
}

export const ssoAuth = new SsoAuthClient();
