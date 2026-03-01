import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/style.css'; // Reuse Tailwind config

const Popup = () => {
  const [provider, setProvider] = useState<'chrome' | 'webllm' | 'ollama'>('chrome');

  useEffect(() => {
    chrome.storage.local.get(['llm_provider'], (res) => {
      if (res.llm_provider) {
        setProvider(res.llm_provider);
      }
    });
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setProvider(val);
    chrome.storage.local.set({ llm_provider: val });
  };

  return (
    <div className="w-80 p-4 bg-white text-gray-800 font-sans">
      <h1 className="text-lg font-bold text-blue-600 mb-4 border-b pb-2">BrowserAssist Settings</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">AI Provider</label>
        <select 
          value={provider}
          onChange={handleProviderChange}
          className="w-full border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="chrome">Chrome Built-in AI (Gemini Nano) - Fastest</option>
          <option value="webllm">WebLLM (Phi-3) - Balanced</option>
          <option value="ollama">Local Ollama (Llama-3) - Powerful</option>
        </select>
      </div>

      <div className="text-sm bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-800">
        <h3 className="font-bold mb-1 flex items-center gap-1"><span className="text-base">📌</span> Setup Guide</h3>
        {provider === 'chrome' && (
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>Requires Chrome Dev or Chrome Canary.</li>
            <li>Go to <code className="bg-white px-1 py-0.5 rounded font-mono">chrome://flags</code></li>
            <li>Enable <b>Prompt API for Gemini Nano</b></li>
            <li>Set <b>Enables optimization guide on device</b> to <b>Enabled BypassPerfRequirement</b></li>
            <li>Restart your browser. The browser will secretly download the tiny Gemini Nano model in the background.</li>
          </ul>
        )}
        {provider === 'ollama' && (
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>Requires <a href="https://ollama.com" target="_blank" className="underline font-bold">Ollama</a> installed locally.</li>
            <li>Open a terminal / command prompt.</li>
            <li>Run: <code className="bg-white px-1 py-0.5 rounded font-mono break-all font-bold">OLLAMA_ORIGINS="*" ollama serve</code></li>
            <li>This runs the server and explicitly allows the extension to talk to it without getting blocked by CORS.</li>
          </ul>
        )}
        {provider === 'webllm' && (
          <ul className="list-disc pl-4 space-y-1 text-xs">
             <li>Runs Microsoft's Phi-3 entirely offline inside your browser tab using WebGPU.</li>
             <li><b>Warning:</b> First run takes ~2-5 minutes as it securely caches a 1.8GB model to your browser's IndexedDB.</li>
             <li>Subsequent runs will be completely instant.</li>
          </ul>
        )}
      </div>

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
