import { LLMProvider } from './types';

export class OllamaProvider implements LLMProvider {
  private async getModel(): Promise<string> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const res = await chrome.storage.local.get(['ollama_model']);
      if (res.ollama_model) return res.ollama_model;
    }
    return 'llama3.2:3b';
  }

  async generateStream(prompt: string, context: string, onChunk: (chunk: string) => void, _onProgress?: (progress: number, text: string) => void): Promise<string> {
    const combinedPrompt = `System: You are an AI assistant. Do not babble.
Context:
${context}

Task:
${prompt}
`;

    // Send a message to the background script to start the stream.
    // The background script will use a port to send back chunks.
    return new Promise(async (resolve, reject) => {
      const model = await this.getModel();
      
      const port = chrome.runtime.connect({ name: 'ollama-stream' });
      
      port.postMessage({
        action: 'generateStream',
        model,
        prompt: combinedPrompt
      });

      let completeResponse = '';

      port.onMessage.addListener((msg) => {
        if (msg.error) {
          port.disconnect();
          reject(new Error(msg.error));
        } else if (msg.done) {
          port.disconnect();
          resolve(completeResponse);
        } else if (msg.chunk) {
          completeResponse += msg.chunk;
          onChunk(msg.chunk);
        }
      });

      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
      });
    });
  }

  async generateCompletion(prefix: string, context: string): Promise<string> {
    const combinedPrompt = `System: You are an autocomplete engine. Only provide the continuation of the text. Do not repeat the prefix.
Context:
${context}

Prefix:
${prefix}
`;

    return new Promise(async (resolve, reject) => {
      const model = await this.getModel();
      chrome.runtime.sendMessage(
        {
          action: 'generateCompletion',
          model,
          prompt: combinedPrompt
        },
        (response) => {
          if (chrome.runtime.lastError) {
             return reject(chrome.runtime.lastError.message);
          }
          if (response && response.error) {
            return reject(new Error(response.error));
          }
          if (response && response.result) {
            resolve(response.result.trim());
          } else {
            reject(new Error("Unexpected response from background"));
          }
        }
      );
    });
  }
}
