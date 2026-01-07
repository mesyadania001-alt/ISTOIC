
import { debugService } from './debugService';

export type Provider = 'GEMINI' | 'GROQ' | 'OPENAI' | 'DEEPSEEK' | 'MISTRAL' | 'OPENROUTER' | 'ELEVENLABS' | 'HUGGINGFACE';

export interface ProviderStatus {
    id: string;
    status: 'HEALTHY' | 'COOLDOWN';
    keyCount: number;
    cooldownRemaining: number;
}

export class HydraVault {
  // In production, we assume keys are managed by the server.
  // The Vault now acts primarily as a status tracker for the UI.

  public refreshPools() {
    // No-op in secure mode. Keys are server-side.
  }

  public getKey(provider: Provider): string | null {
    // Always return the secure flag to tell services to use the Proxy
    return 'server-side-managed';
  }

  public reportFailure(provider: Provider, plainKeyString: string, error: any): void {
      debugService.log('ERROR', 'BACKEND_PROXY', 'FAIL', `${provider} request failed.`, error);
  }

  public reportSuccess(provider: Provider) {}

  public isProviderHealthy(provider: Provider): boolean {
      return true; // Assume healthy, let backend handle errors
  }

  public getAllProviderStatuses(): ProviderStatus[] {
      const providers: Provider[] = ['GEMINI', 'GROQ', 'OPENAI', 'DEEPSEEK', 'MISTRAL'];
      return providers.map(id => ({
          id,
          status: 'HEALTHY',
          keyCount: 1, // Virtual
          cooldownRemaining: 0
      }));
  }
}

export const GLOBAL_VAULT = new HydraVault();
    