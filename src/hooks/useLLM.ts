import { useState, useCallback, useEffect } from 'react';
import { llmFactory, ProviderType } from '../services/llm';
import { getPageContext } from '../services/pageScraper';

// Approx 3.5 chars per token constraint wrapper for safety
const optimizeContext = (context: string, maxTokens: number): string => {
  const maxChars = Math.floor(maxTokens * 3.5);
  if (context.length <= maxChars) return context;
  
  // We want to preserve mostly the end (where the active conversation/text is)
  // and the beginning (where the subject/system setup is).
  const startTarget = Math.floor(maxChars * 0.25);
  const endTarget = Math.floor(maxChars * 0.75) - 50; // Extra room for truncation text
  
  const startText = context.slice(0, startTarget);
  const endText = context.slice(-endTarget);
  
  return `${startText}\n\n... [CONTENT TRUNCATED FOR LENGTH] ...\n\n${endText}`;
};

export const useLLM = () => {
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{progress: number, text: string} | null>(null);
  const [activeProviderName, setActiveProviderName] = useState<ProviderType | null>(null);

  const preloadEngine = useCallback(async (provider: ProviderType) => {
    try {
      const llm = await llmFactory.getProvider(provider);
      if (llm.preload) {
        await llm.preload((progress, text) => {
          setDownloadProgress({ progress, text });
        });
        setDownloadProgress(null);
      }
    } catch (e) {
      console.error('Preload failed', e);
      setDownloadProgress(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Grab the current active provider on mount so UI knows what to show
    const getProviderName = async () => {
      let active: ProviderType = 'webllm';
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.runtime?.id) {
           const res = await chrome.storage.local.get(['llm_provider']);
           if (res.llm_provider && res.llm_provider !== 'chrome') {
             active = res.llm_provider as ProviderType;
           }
        } else {
          active = llmFactory.getActiveProviderType();
        }
      } catch (e: any) {
        if (e.message?.includes('Extension context invalidated')) {
          if (isMounted) setError('Extension was updated. Please refresh the webpage to continue.');
          return;
        }
      }
      
      if (!isMounted) return;
      setActiveProviderName(active);
    };
    getProviderName();
    
    return () => { isMounted = false; };
  }, [preloadEngine]);

  const generate = useCallback(async (prompt: string, extraContext: string = '', provider?: ProviderType) => {
    setIsGenerating(true);
    setOutput('');
    setError(null);
    setDownloadProgress(null);
    
    try {
      const pageCtx = getPageContext();
      let context = '';
      if (pageCtx) {
        context += `[Current Webpage Context:]\n${pageCtx}\n\n`;
      }
      if (extraContext) {
        context += `${extraContext}\n\n`;
      }
      
      const llm = await llmFactory.getProvider(provider);
      
      // Attempt to retrieve context window length to truncate text without failure
      let limit = 4096;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const res = await chrome.storage.local.get(['ollama_context_length', 'llm_provider']);
        if ((provider || res.llm_provider) === 'ollama' && res.ollama_context_length) {
          limit = res.ollama_context_length;
        }
      }
      // Allocate 512 for prompt and response delta
      context = optimizeContext(context, limit - 512);
      
      // Update UI with the resolved provider
      if (provider) {
        setActiveProviderName(provider);
      }
      
      await llm.generateStream(
        prompt, 
        context, 
        (chunk) => {
          setOutput((prev) => prev + chunk);
        },
        (progress, text) => {
          setDownloadProgress({ progress, text });
        }
      );
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsGenerating(false);
      setDownloadProgress(null);
    }
  }, []);

  const autocomplete = useCallback(async (prefix: string, provider?: ProviderType) => {
    try {
      let limit = 4096;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const res = await chrome.storage.local.get(['ollama_context_length', 'llm_provider']);
        if ((provider || res.llm_provider) === 'ollama' && res.ollama_context_length) {
          limit = res.ollama_context_length;
        }
      }
      
      let context = getPageContext();
      context = optimizeContext(context, limit - 128);
      
      const llm = await llmFactory.getProvider(provider);
      return await llm.generateCompletion(prefix, context);
    } catch (err: any) {
      console.error('Autocomplete error:', err);
      return null;
    }
  }, []);

  return { output, isGenerating, error, generate, autocomplete, setOutput, downloadProgress, activeProviderName, preloadEngine };
};
