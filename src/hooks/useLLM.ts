import { useState, useCallback, useEffect } from 'react';
import { llmFactory, ProviderType } from '../services/llm';
import { getPageContext } from '../services/pageScraper';

export const useLLM = () => {
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{progress: number, text: string} | null>(null);
  const [activeProviderName, setActiveProviderName] = useState<ProviderType>('chrome');

  useEffect(() => {
    // Just grab the current active provider on mount so UI knows what to show
    const getProviderName = async () => {
      // we force a dummy call to see what factory resolves to
      if (typeof chrome !== 'undefined' && chrome.storage) {
         const res = await chrome.storage.local.get(['llm_provider']);
         if (res.llm_provider) {
           setActiveProviderName(res.llm_provider);
           return;
         }
      }
      setActiveProviderName(llmFactory.getActiveProviderType());
    };
    getProviderName();
  }, []);

  const generate = useCallback(async (prompt: string, extraContext: string = '', provider?: ProviderType) => {
    setIsGenerating(true);
    setOutput('');
    setError(null);
    setDownloadProgress(null);
    
    try {
      const context = getPageContext() + '\n' + extraContext;
      const llm = await llmFactory.getProvider(provider);
      
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
      const context = getPageContext();
      const llm = await llmFactory.getProvider(provider);
      return await llm.generateCompletion(prefix, context);
    } catch (err: any) {
      console.error('Autocomplete error:', err);
      return null;
    }
  }, []);

  return { output, isGenerating, error, generate, autocomplete, setOutput, downloadProgress, activeProviderName };
};
