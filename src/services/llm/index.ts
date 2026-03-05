import { LLMProvider } from './types';
import { WebLLMProvider } from './webLLM';
import { OllamaProvider } from './ollama';

export type ProviderType = 'webllm' | 'ollama';

class LLMFactory {
  private activeProvider: ProviderType | null = null;
  private instances: Partial<Record<ProviderType, LLMProvider>> = {};

  async getProvider(type?: ProviderType): Promise<LLMProvider> {
    let selected = type;
    
    // Attempt to read from storage if not explicitly provided
    try {
      if (!selected && typeof chrome !== 'undefined' && chrome.storage && chrome.runtime?.id) {
        const res = await chrome.storage.local.get(['llm_provider']);
        if (res.llm_provider && res.llm_provider !== 'chrome') {
          selected = res.llm_provider as ProviderType;
        } else {
          selected = 'webllm';
          // Set default if it doesn't exist to prevent race conditions
          chrome.storage.local.set({ llm_provider: 'webllm' });
        }
        this.activeProvider = selected;
      } else if (!selected) {
        selected = this.activeProvider || 'webllm';
      }
    } catch (e: any) {
      // If the extension context is invalidated (e.g. extension was reloaded), use activeProvider
      selected = this.activeProvider || 'webllm';
    }
    
    if (!this.instances[selected!]) {
      switch (selected) {
        case 'webllm':
          this.instances.webllm = new WebLLMProvider();
          break;
        case 'ollama':
          this.instances.ollama = new OllamaProvider();
          break;
      }
    }
    
    return this.instances[selected!]!;
  }

  setProviderType(type: ProviderType) {
    this.activeProvider = type;
  }
  
  getActiveProviderType(): ProviderType {
    return this.activeProvider || 'webllm';
  }
}

export const llmFactory = new LLMFactory();
