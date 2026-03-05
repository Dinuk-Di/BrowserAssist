# ⚡ Aegis Core / BrowserAssist

BrowserAssist (Aegis Core) is a powerful, privacy-first AI extension that brings a local Large Language Model (LLM) directly into your browser. Experience near-instant text completion, intelligent drafting, and context-aware suggestions seamlessly integrated into your workflow.

## 🌟 Key Features

- **Offline, In-Browser AI (WebLLM):** Runs entirely within your browser using WebGPU acceleration for completely offline, private inference via the Phi-3 model.
- **Local Desktop AI Integration (Ollama):** Connects gracefully to your desktop's Ollama installation to harness powerful local models (e.g. Llama 3, Mistral) without relying on cloud APIs.
- **Context-Aware Assistance:** Dynamically understands the context of the webpage you are reading, including specialized support for extracting secure email threads from **Gmail**, making it perfect for drafting intelligent email replies.
- **Inline Ghost Suggestions:** Just start typing. The extension analyzes your context and offers intelligent text completions that you can accept instantly with the `Tab` key.
- **Dedicated Assistant UI (`/browserassist`):** Need a dedicated writing partner? Type `/browserassist` (or `@browserassist`) anywhere you can type to summon a beautiful, glassmorphic UI overlay. The assistant analyzes your current page's context and any uploaded PDFs to craft highly specific responses.

## 🔒 Security & Privacy First

We put your privacy at the forefront:

- **No Cloud Processing:** All data parsing and LLM generation happens strictly on your machine.
- **Zero CORS Configuration:** Automatically handles restrictive network policies using highly privileged Chrome `declarativeNetRequest` rules. The extension talks to your local Ollama instance seamlessly. No need to mess with terminal commands or `OLLAMA_ORIGINS`.
- **Anti-XSS Defense:** Engineered with robust string sanitization avoiding outdated `innerHTML` injection to ensure your browser remains secure against DOM-based cross-site scripting attacks.
- **Private Scraping:** Respects the boundaries of your active tab. Your data never leaves your computer.

## 🚀 Installation & Setup

### Running from Source (Developer Mode)

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension for production:
   ```bash
   npm run build
   ```
4. Load into Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `/dist` folder inside this project directory.

### Choosing your AI Engine

Open the extension popup to select your preferred AI workhorse:

- **WebLLM (Phi-3 - Offline In-Browser GPU):** Best for absolute privacy. The model downloads directly into your browser's VRAM the first time you use it. Subsequent uses are instantaneous and completely offline.
- **Ollama (Local Desktop App):** Best for performance and using the newest models.
  1. Download and install [Ollama](https://ollama.com/) for your OS.
  2. Start the Ollama application. (No special terminal commands are required—just run the app normally).
  3. Type `/browserassist` in the browser, and the extension will automatically connect to your running Ollama server.

## 🛠️ Usage

### 1. The Assistant Overlay

In any text box (Gmail, Upwork, forums), type:
`/browserassist`
This will instantly summon the Aegis Core UI overlay. You can chat with it, ask it to draft responses based on the page's current state, or upload PDF files for it to analyze securely.

### 2. Inline Autocomplete

Start drafting a sentence and pause for a second. The extension will read your context and generate a helpful "ghost suggestion." If you like it, press **Tab** to accept the suggestion.

## 🏗️ Technical Stack

- **Framework:** React + TypeScript + CRXJS (Vite)
- **Styling:** Tailwind CSS (with Glassmorphism aesthetic)
- **AI Libraries:** `@mlc-ai/web-llm` for browser ML inference, Native Fetch for Ollama API.
- **Context Engines:** Mozilla Readability for web parsing, PDF.js for secure offline document analysis.
