export {};

// Background script
console.log('BrowserAssist Background Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
  // Setup Declarative Net Request rules to bypass Ollama's strict CORS checks.
  // This removes the Origin header, so Ollama treats it as a standard local request (like curl).
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            { header: 'Origin', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE }
          ]
        },
        condition: {
          urlFilter: 'localhost:11434/*',
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
          ]
        }
      }
    ]
  }).catch(err => console.error("Failed to setup DNR rules:", err));
});

const getEndpoint = (base: string) => {
  try {
    const url = new URL(base);
    if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error('Insecure HTTP endpoints are not allowed for remote servers. Please use HTTPS or localhost.');
    }
  } catch (e: any) {
    if (e.message.includes('Insecure')) throw e;
    // Let it pass if invalid URL formulation, fetch will handle it
  }
  return `${base.replace(/\/+$/, '')}/api/generate`;
};

// Handle single-completion requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'generateCompletion') {
    fetch(getEndpoint(request.endpoint || 'http://localhost:11434'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: {
          num_ctx: request.contextLength || 4096
        }
      })
    })
      .then(async res => {
        const textStr = await res.text();
        try {
          const data = JSON.parse(textStr);
          if (!res.ok) {
            if (res.status === 403) throw new Error(`HTTP 403: Ollama blocked the request. Restart Ollama from PowerShell: $env:OLLAMA_ORIGINS="*" ; ollama serve`);
            throw new Error(data.error || `HTTP ${res.status}: ${textStr}`);
          }
          return data;
        } catch (e: any) {
          if (!res.ok) {
            if (res.status === 403) throw new Error(`HTTP 403: Ollama blocked the request. Restart Ollama from PowerShell: $env:OLLAMA_ORIGINS="*" ; ollama serve`);
            throw new Error(`HTTP ${res.status}: ${textStr}`);
          }
          throw new Error('Invalid JSON from backend: ' + textStr);
        }
      })
      .then(data => sendResponse({ result: data.response }))
      .catch(error => sendResponse({ error: error.message || String(error) }));

    return true; // Indicates asynchronous response
  }
});

// Handle streaming requests
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ollama-stream') {
    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'generateStream') {
        try {
          const response = await fetch(getEndpoint(msg.endpoint || 'http://localhost:11434'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: msg.model,
              prompt: msg.prompt,
              stream: true,
              options: {
                num_ctx: msg.contextLength || 4096
              }
            })
          });

          if (!response.ok) {
            if (response.status === 403) {
              port.postMessage({ error: `HTTP 403: Ollama blocked the request. Restart Ollama from PowerShell: $env:OLLAMA_ORIGINS="*" ; ollama serve` });
              return;
            }
            port.postMessage({ error: `HTTP ${response.status}: Failed to connect to Ollama.` });
            return;
          }

          if (!response.body) {
             port.postMessage({ error: 'No body in response' });
             return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
            console.log("Page Content:", lines);

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  port.postMessage({ chunk: parsed.response });
                }
              } catch (e) {
                console.error("Failed to parse chunk:", line);
              }
            }
          }
          port.postMessage({ done: true });
        } catch (error: any) {
          port.postMessage({ error: error.message });
        }
      }
    });
  }
});
