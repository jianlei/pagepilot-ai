chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'summarizePage') {
    const content = extractPageContent();
    chrome.storage.local.set({ pageContent: content });
    sendResponse({ content: content });
    return true;
  }
  
  if (message.action === 'getPageContent') {
    const content = extractPageContent();
    sendResponse({ content: content });
    return true;
  }
  
  if (message.action === 'getSelectedText') {
    const selection = window.getSelection().toString();
    sendResponse({ text: selection });
    return true;
  }
});

function extractPageContent() {
  const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ad', '.sidebar', '.menu', '.nav',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    'iframe', 'canvas', 'video', 'audio', 'svg'
  ];
  
  const clone = document.body.cloneNode(true);
  
  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  let text = clone.body?.innerText || clone.documentElement?.innerText || '';
  
  text = text.replace(/\s+/g, ' ').trim();
  
  const maxLength = 8000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  
  return text;
}

document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection.length > 10) {
    chrome.storage.local.set({ selectedText: selection });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const content = extractPageContent();
    if (content.length > 100) {
      chrome.storage.local.set({ pageContent: content, pageUrl: window.location.href });
    }
  }, 1000);
});
