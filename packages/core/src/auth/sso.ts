import { Gaxios, GaxiosError } from 'gaxios';
import * as fs from 'fs';

class SsoAuthClient {
  private readonly ssoUrl: string;
  private readonly cachePath = '.ssotoken';

  constructor() {
    this.ssoUrl = process.env.SSO_SERVER || '';
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
    if (!this.ssoUrl) {
      throw new Error('SSO_SERVER environment variable is not set');
    }
    
    console.log(`SSO URL: ${this.ssoUrl}`);
    const cachedToken = await this.getTokenFromCache();
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const caFile = process.env.REQUESTS_CA_BUNDLE || process.env.SSL_CERT_FILE;

      // Prepare gaxios options with CA bundle support if needed
      const gaxiosOptions: any = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add CA bundle support if available
      if (caFile && fs.existsSync(caFile)) {
        try {
          const https = await import('https');
          const caBundle = fs.readFileSync(caFile, 'utf8');
          gaxiosOptions.agent = new https.Agent({
            ca: caBundle,
            rejectUnauthorized: true,
          });
        } catch (error) {
          console.debug('[SSO] Could not create HTTPS agent with CA bundle:', error instanceof Error ? error.message : String(error));
        }
      }

      console.log(`SSO username: ${process.env.ADA_GENAI_SSO_ID || process.env.ONE_BANK_ID || 'test'}`);
      const gaxiosInstance = new Gaxios();
      const response = await gaxiosInstance.request({
        url: this.ssoUrl,
        method: 'POST',
        data: {
          userid:
            process.env.ADA_GENAI_SSO_ID || process.env.ONE_BANK_ID || 'test',
          password:
            process.env.ADA_GENAI_SSO_PASSWORD ||
            process.env.ONE_BANK_PASSWORD ||
            'test',
          otp: '111111',
          otp_type: 'PUSH',
        },
        ...gaxiosOptions,
      });
      await this.setTokenInCache(
        response.data.id_token,
        response.data.expires_in,
      );
      return response.data.id_token;
    } catch (error: unknown) {
      if (error instanceof GaxiosError) {
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

export { SsoAuthClient };
export const ssoAuth = new SsoAuthClient();
