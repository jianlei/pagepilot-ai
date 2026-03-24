# PagePilot AI - Chrome Extension

An AI-powered sidebar extension for page summarization, writing assistance, and AI chat on any webpage.

## Features

- 📄 **Page Summarization** - One-click AI summary of any webpage
- ✍️ **Writing Assistant** - Improve, shorten, or expand your text
- 💬 **AI Chat** - Conversation with AI on any page
- 🔒 **Privacy-First** - Your API key stays on your device
- 🌍 **Multi-Provider** - Supports OpenAI and Alibaba Qwen
- ✨ **Free** - No usage limits

## Supported AI Providers

| Provider | Models |
|----------|---------|
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-3.5 Turbo |
| **阿里Qwen** | Qwen Turbo, Qwen Plus, Qwen Max |

## Security

**Your API key stays on your device.** 
- Keys are stored locally in Chrome storage
- Keys are never sent to any third-party server
- Only used directly to call AI APIs from your browser

## Setup

1. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `pagepilot-ai` folder

2. **Configure API Key**
   - Click the extension icon
   - Click "Settings"
   - Choose your AI provider
   - Select model
   - Enter your API key
   - Click "Save"

3. **Get Your API Key**
   - OpenAI: https://platform.openai.com/api-keys
   - Qwen: https://dashscope.console.aliyun.com/manage

4. **Start Using**
   - Click the extension icon to open the sidebar
   - Choose mode: Chat, Summarize, or Write

## Usage Notes

- No usage limits
- Each user provides their own API key
- Users pay for their own AI API usage directly

## Project Structure

```
pagepilot-ai/
├── manifest.json           # Extension manifest (V3)
├── icons/                  # App icons (SVG)
│   ├── icon.svg
│   └── icon-16.svg
├── src/
│   ├── popup/              # Popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── sidebar/            # Sidebar chat UI
│   │   ├── sidebar.html
│   │   ├── sidebar.css
│   │   └── sidebar.js
│   ├── content/            # Content scripts
│   │   └── content.js
│   ├── background/         # Service worker
│   │   └── background.js
│   └── styles/
│       └── content.css
├── PRIVACY.md              # Privacy policy
├── STORE_LISTING.md        # Web Store listing details
└── README.md               # This file
```

## Publishing to Chrome Web Store

### Prepare Icons
Convert SVG icons to PNG at these sizes:
- 16x16 pixels (toolbar icon)
- 48x48 pixels (extensions page)
- 128x128 pixels (store listing)

### Upload
1. Create a developer account at https://chrome.google.com/webstore/dev
2. Zip the extension folder (exclude .git, README.md, STORE_LISTING.md, PRIVACY.md)
3. Upload and submit for review

### Required for Review
- Privacy policy (see PRIVACY.md)
- Store listing (see STORE_LISTING.md)

## License

MIT
