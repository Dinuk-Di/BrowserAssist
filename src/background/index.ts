export {};

// Background script
console.log('BrowserAssist Background Worker Initialized');

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';

// Handle single-completion requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'generateCompletion') {
    fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false
      })
    })
      .then(res => res.json())
      .then(data => sendResponse({ result: data.response }))
      .catch(error => sendResponse({ error: error.message }));

    return true; // Indicates asynchronous response
  }
});

// Handle streaming requests
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ollama-stream') {
    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'generateStream') {
        try {
          const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: msg.model,
              prompt: msg.prompt,
              stream: true
            })
          });

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
