const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyPrefix: 'sk-'
  },
  qwen: {
    name: '阿里Qwen (通义千问)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
    defaultModel: 'qwen-turbo',
    keyPrefix: 'sk-'
  }
};

let messages = [];
let currentMode = 'chat';
let apiKey = '';
let apiProvider = 'openai';
let currentModel = 'gpt-4o-mini';

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  setupEventListeners();
  await checkPendingSummary();
});

async function checkPendingSummary() {
  const result = await chrome.storage.local.get('pendingSummary');
  if (result.pendingSummary) {
    await chrome.storage.local.set({ pendingSummary: false });
    switchMode('summarize');
    addMessage('assistant', '📄 Click "Summarize" to generate a summary of the current page.');
  }
}

async function loadUserData() {
  const result = await chrome.storage.local.get(['messages', 'apiKey', 'apiProvider', 'currentModel']);
  apiKey = result.apiKey || '';
  apiProvider = result.apiProvider || 'openai';
  currentModel = result.currentModel || API_PROVIDERS[apiProvider]?.defaultModel || 'gpt-4o-mini';
  
  if (result.messages && result.messages.length > 0) {
    messages = result.messages;
    renderMessages();
  }
  
  checkApiKey();
}

function setupEventListeners() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('userInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  document.getElementById('newChat').addEventListener('click', newChat);
  document.getElementById('closeSidebar').addEventListener('click', () => window.close());
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });
  
  document.getElementById('summarizeBtn')?.addEventListener('click', summarizeCurrentPage);
  
  document.getElementById('improveBtn')?.addEventListener('click', () => improveText('improve'));
  document.getElementById('shortenBtn')?.addEventListener('click', () => improveText('shorten'));
  document.getElementById('expandBtn')?.addEventListener('click', () => improveText('expand'));
}

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  
  const chatContainer = document.getElementById('chatContainer');
  const summarizeContainer = document.getElementById('summarizeContainer');
  const writeContainer = document.getElementById('writeContainer');
  const inputArea = document.getElementById('inputArea');
  
  chatContainer.classList.toggle('hidden', mode !== 'chat');
  if (summarizeContainer) {
    summarizeContainer.classList.toggle('hidden', mode !== 'summarize');
  }
  if (writeContainer) {
    writeContainer.classList.toggle('hidden', mode !== 'write');
  }
  if (inputArea) {
    inputArea.classList.toggle('hidden', mode !== 'chat');
  }
}

function checkApiKey() {
  if (!apiKey) {
    addMessage('assistant', '⚠️ Please set your OpenAI API key in the extension popup settings first.\n\nGet your API key from: https://platform.openai.com/api-keys');
  }
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  if (!apiKey) {
    addMessage('assistant', 'Please set your OpenAI API key in the extension popup settings first.');
    return;
  }
  
  addMessage('user', message);
  input.value = '';
  
  const messageId = showStreaming();
  
  try {
    await streamAIResponse(message, messageId);
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('invalid')) {
      updateStreamingMessage(messageId, '❌ Invalid API key. Please check your API key in settings.');
    } else {
      updateStreamingMessage(messageId, 'Sorry, I encountered an error. Please try again.');
    }
    console.error('API Error:', error);
  }
}

async function getAIResponse(userMessage) {
  const provider = API_PROVIDERS[apiProvider] || API_PROVIDERS.openai;
  const model = currentModel || provider.defaultModel;
  
  const systemMessage = 'You are a helpful AI assistant. Provide clear, concise, and useful responses.';
  
  const conversation = [
    { role: 'system', content: systemMessage },
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];
  
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: conversation,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  const aiMessage = data.choices[0].message.content;
  
  messages.push({ role: 'user', content: userMessage });
  messages.push({ role: 'assistant', content: aiMessage });
  
  if (messages.length > 50) {
    messages = messages.slice(-50);
  }
  
  await chrome.storage.local.set({ messages });
  
  return aiMessage;
}

function showStreaming() {
  const messagesContainer = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant streaming';
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0891B2"/>
        <path d="M10 16C10 12.6863 12.6863 10 16 10C19.3888 10 27 14.3137 27 20C27 25.6863 24.3137 28 20 28C15.0302 28 10 21.6863 10 16Z" fill="white"/>
        <circle cx="16" cy="16" r="3" fill="#0891B2"/>
      </svg>
    </div>
    <div class="message-content" id="streamingContent"><span class="cursor">▊</span></div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageDiv;
}

function updateStreamingMessage(messageElement, content) {
  const contentEl = messageElement.querySelector('.message-content');
  contentEl.innerHTML = escapeHtml(content).replace(/\n/g, '<br>').replace(/▊/g, '');
  messageElement.classList.remove('streaming');
  messageElement.classList.add('completed');
}

function appendStreamingContent(messageElement, newContent) {
  const contentEl = messageElement.querySelector('.message-content');
  const cursor = contentEl.querySelector('.cursor');
  if (cursor) {
    cursor.remove();
  }
  contentEl.innerHTML += escapeHtml(newContent).replace(/\n/g, '<br>');
  contentEl.innerHTML += '<span class="cursor">▊</span>';
  
  const messagesContainer = document.getElementById('messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function streamAIResponse(userMessage, messageElement) {
  const provider = API_PROVIDERS[apiProvider] || API_PROVIDERS.openai;
  const model = currentModel || provider.defaultModel;
  
  const systemMessage = 'You are a helpful AI assistant. Provide clear, concise, and useful responses.';
  
  const conversation = [
    { role: 'system', content: systemMessage },
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];
  
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: conversation,
      max_tokens: 1000,
      stream: true
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            appendStreamingContent(messageElement, delta);
          }
            } catch (e) {
              }
      }
    }
  }
  
  messages.push({ role: 'user', content: userMessage });
  messages.push({ role: 'assistant', content: fullContent });
  
  if (messages.length > 50) {
    messages = messages.slice(-50);
  }
  
  await chrome.storage.local.set({ messages });
  
  updateStreamingMessage(messageElement, fullContent);
}

function addMessage(role, content) {
  const messagesContainer = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const formattedContent = escapeHtml(content).replace(/\n/g, '<br>');
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="message-content">${formattedContent}</div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
  const messagesContainer = document.getElementById('messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant typing';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content"><p>...</p></div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTyping() {
  document.getElementById('typingIndicator')?.remove();
}

function renderMessages() {
  const messagesContainer = document.getElementById('messages');
  messagesContainer.innerHTML = '';
  
  messages.forEach(m => {
    addMessage(m.role, m.content);
  });
}

async function newChat() {
  messages = [];
  await chrome.storage.local.set({ messages: [] });
  renderMessages();
  
  const greeting = apiKey 
    ? 'Hello! I\'m your AI assistant. How can I help you today?' 
    : 'Please set your OpenAI API key in the extension popup settings first.';
  addMessage('assistant', greeting);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function summarizeCurrentPage() {
  if (!apiKey) {
    showSummaryResult('Please set your API key in the extension popup settings first.');
    return;
  }
  
  showSummaryResult('⏳ Loading page content...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      showSummaryResult('⚠️ No active tab found. Error: ' + JSON.stringify(tab));
      return;
    }
    
    let pageContent = '';
    let errorMsg = '';
    
    try {
      if (!chrome.scripting) {
        errorMsg = 'chrome.scripting not available';
        throw new Error(errorMsg);
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          return document.body?.innerText || '';
        }
      });
      
      pageContent = results[0]?.result || '';
    } catch (e) {
      errorMsg = e.message || String(e);
      console.log('Script injection error:', errorMsg);
    }
    
    if (errorMsg) {
      showSummaryResult('⚠️ Error: ' + errorMsg + '\n\nTab: ' + tab.url);
      return;
    }
    
    if (!pageContent || pageContent.length < 100) {
      showSummaryResult('⚠️ Page is empty or too short.\n\nURL: ' + (tab.url || 'unknown'));
      return;
    }
    
    showSummaryResult('⏳ Generating summary...');
    
    const provider = API_PROVIDERS[apiProvider] || API_PROVIDERS.openai;
    const model = currentModel || provider.defaultModel;
    
    const resultDiv = document.getElementById('summaryResult');
    const contentDiv = document.createElement('div');
    contentDiv.className = 'summary-content';
    contentDiv.innerHTML = '<span class="cursor">▊</span>';
    resultDiv.innerHTML = '';
    resultDiv.appendChild(contentDiv);
    
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes web page content. Provide a concise summary of the main points.' },
          { role: 'user', content: `Please summarize this web page content:\n\n${pageContent.substring(0, 8000)}` }
        ],
        max_tokens: 500,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              const cursor = contentDiv.querySelector('.cursor');
              if (cursor) cursor.remove();
              contentDiv.innerHTML += escapeHtml(delta).replace(/\n/g, '<br>') + '<span class="cursor">▊</span>';
              resultDiv.scrollTop = resultDiv.scrollHeight;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    const finalCursor = contentDiv.querySelector('.cursor');
    if (finalCursor) finalCursor.remove();
    contentDiv.innerHTML = escapeHtml(fullContent).replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Summary error:', error);
    showSummaryResult('Error generating summary. Please try again.');
  }
}

function showSummaryResult(content) {
  const resultDiv = document.getElementById('summaryResult');
  if (resultDiv) {
    resultDiv.innerHTML = `<div class="summary-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
  }
}

async function improveText(action) {
  if (!apiKey) {
    showWriteResult('Please set your API key in the extension popup settings first.');
    return;
  }
  
  const input = document.getElementById('writeInput');
  const text = input.value.trim();
  
  if (!text) {
    showWriteResult('Please enter some text to improve.');
    return;
  }
  
  const instructions = {
    improve: 'Improve this text, make it better, clearer, and more professional.',
    shorten: 'Shorten this text while keeping the key points.',
    expand: 'Expand this text with more details and examples.'
  };
  
  showWriteResult('⏳ Processing...');
  
  try {
    const provider = API_PROVIDERS[apiProvider] || API_PROVIDERS.openai;
    const model = currentModel || provider.defaultModel;
    
    const resultDiv = document.getElementById('writeResult');
    const contentDiv = document.createElement('div');
    contentDiv.className = 'summary-content';
    contentDiv.innerHTML = '<span class="cursor">▊</span>';
    resultDiv.innerHTML = '';
    resultDiv.appendChild(contentDiv);
    
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: instructions[action] },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              const cursor = contentDiv.querySelector('.cursor');
              if (cursor) cursor.remove();
              contentDiv.innerHTML += escapeHtml(delta).replace(/\n/g, '<br>') + '<span class="cursor">▊</span>';
              resultDiv.scrollTop = resultDiv.scrollHeight;
            }
          } catch (e) {
          }
        }
      }
    }
    
    const finalCursor = contentDiv.querySelector('.cursor');
    if (finalCursor) finalCursor.remove();
    contentDiv.innerHTML = escapeHtml(fullContent).replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Write error:', error);
    showWriteResult('Error processing text. Please try again.');
  }
}

function showWriteResult(content) {
  const resultDiv = document.getElementById('writeResult');
  if (resultDiv) {
    resultDiv.innerHTML = `<div class="summary-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
  }
}
