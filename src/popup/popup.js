const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (推荐)' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-'
  },
  qwen: {
    name: '阿里Qwen (通义千问)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: [
      { value: 'qwen-turbo', label: 'Qwen Turbo (推荐)' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-max', label: 'Qwen Max' }
    ],
    keyUrl: 'https://dashscope.console.aliyun.com/manage',
    keyPrefix: 'sk-'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadApiKeyStatus();
  loadProviderSettings();
  
  document.getElementById('openSidebar').addEventListener('click', openSidebar);
  document.getElementById('summarizePage').addEventListener('click', summarizePage);
  
  document.getElementById('settingsLink').addEventListener('click', showSettings);
  document.getElementById('backToMain').addEventListener('click', showMain);
  document.getElementById('saveApiKey').addEventListener('click', saveSettings);
  document.getElementById('clearData').addEventListener('click', clearData);
  
  document.getElementById('providerSelect').addEventListener('change', onProviderChange);
});

async function loadProviderSettings() {
  const result = await chrome.storage.local.get(['apiProvider', 'currentModel']);
  const provider = result.apiProvider || 'openai';
  const model = result.currentModel || API_PROVIDERS[provider].models[0].value;
  
  const providerSelect = document.getElementById('providerSelect');
  const modelSelect = document.getElementById('modelSelect');
  
  if (providerSelect) providerSelect.value = provider;
  updateModelSelect(provider);
  if (modelSelect) modelSelect.value = model;
}

function onProviderChange() {
  const provider = document.getElementById('providerSelect').value;
  updateModelSelect(provider);
}

function updateModelSelect(provider) {
  const providerInfo = API_PROVIDERS[provider];
  const modelSelect = document.getElementById('modelSelect');
  const modelLabel = document.getElementById('modelLabel');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const apiKeyDesc = document.getElementById('apiKeyDesc');
  const apiKeyHint = document.getElementById('apiKeyHint');
  const apiKeyLink = document.getElementById('apiKeyLink');
  
  if (!modelSelect || !providerInfo) return;
  
  modelSelect.innerHTML = '';
  providerInfo.models.forEach(m => {
    const option = document.createElement('option');
    option.value = m.value;
    option.textContent = m.label;
    modelSelect.appendChild(option);
  });
  
  if (modelLabel) modelLabel.textContent = 'Model';
  if (apiKeyLabel) apiKeyLabel.textContent = providerInfo.name + ' API Key';
  if (apiKeyDesc) apiKeyDesc.textContent = `Enter your ${providerInfo.name} API key to use the AI assistant.`;
  if (apiKeyHint) apiKeyHint.textContent = `Get key: ${providerInfo.name}`;
  if (apiKeyLink) apiKeyLink.href = providerInfo.keyUrl;
}

async function loadApiKeyStatus() {
  const result = await chrome.storage.local.get(['apiKey', 'apiProvider']);
  const provider = result.apiProvider || 'openai';
  const providerInfo = API_PROVIDERS[provider];
  const hasKey = result.apiKey && result.apiKey.length > 0;
  
  const statusEl = document.getElementById('apiKeyStatus');
  const statusDot = statusEl.querySelector('.status-indicator');
  const statusText = statusEl.querySelector('.status-text');
  
  if (hasKey) {
    statusEl.classList.add('set');
    statusDot.style.background = '#28a745';
    statusText.textContent = `${providerInfo.name} configured`;
  } else {
    statusEl.classList.remove('set');
    statusDot.style.background = '#dc3545';
    statusText.textContent = 'API Key not set';
  }
}

function showSettings(e) {
  e.preventDefault();
  loadProviderSettings();
  document.getElementById('mainView').classList.add('hidden');
  document.getElementById('settingsView').classList.remove('hidden');
}

function showMain(e) {
  if (e) e.preventDefault();
  document.getElementById('settingsView').classList.add('hidden');
  document.getElementById('mainView').classList.remove('hidden');
}

async function saveSettings() {
  const provider = document.getElementById('providerSelect').value;
  const model = document.getElementById('modelSelect').value;
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    alert('Invalid API key format. Should start with "sk-"');
    return;
  }
  
  await chrome.storage.local.set({
    apiProvider: provider,
    currentModel: model,
    apiKey: apiKey
  });
  
  document.getElementById('apiKeyInput').value = '';
  
  alert('Settings saved successfully!');
  loadApiKeyStatus();
  showMain();
}

async function clearData() {
  if (confirm('Are you sure you want to clear all data? This will reset your usage count and remove your API key.')) {
    await chrome.storage.local.clear();
    alert('All data cleared. Please re-enter your settings.');
    loadApiKeyStatus();
  }
}

async function openSidebar() {
  await chrome.storage.local.set({ pendingSummary: false });
  chrome.runtime.sendMessage({ action: 'openSidePanel', mode: 'chat' });
}

async function summarizePage() {
  await chrome.storage.local.set({ pendingSummary: true });
  chrome.runtime.sendMessage({ action: 'openSidePanel', mode: 'summarize' });
}
