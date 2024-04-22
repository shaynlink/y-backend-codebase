import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import type Core from '../Core'
 
export default class KMSService {
  public readonly core: Core
  public readonly client: SecretManagerServiceClient
  private readonly secrets: Map<string, Uint8Array | string>
  constructor(core: Core) {
    this.core  = core;
    this.client = new SecretManagerServiceClient(
      this.core.options.secretManagerServicClientOptions
    );

    this.secrets = new Map();
  }

  async fetchSecret(secretName: string, keyName: string) {
    const [secret] = await this.client.accessSecretVersion({
      name: secretName
    });

    if (!secret.payload || !secret.payload?.data) {
      throw new Error('Secret does not have a payload');
    }

    this.secrets.set(keyName, secret.payload.data);
  }

  getSecret(keyName: string): Uint8Array | string {
    if (!this.secrets.has(keyName)) {
      throw new Error('Secret not found');
    }

    return this.secrets.get(keyName) as string | Uint8Array;
  }
}