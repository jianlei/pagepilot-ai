chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    messages: []
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    chrome.storage.local.set({ pendingSummary: message.mode === 'summarize' });
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        await chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  }
  
  if (message.action === 'extractPageContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
              const selectorsToRemove = [
                'script', 'style', 'nav', 'header', 'footer', 'aside',
                '.advertisement', '.ad', '.sidebar', '.menu', '.nav',
                '[role="navigation"]', '[role="banner"]', '[role="complementary"]'
              ];
              
              const clone = document.body.cloneNode(true);
              
              selectorsToRemove.forEach(selector => {
                clone.querySelectorAll(selector).forEach(el => el.remove());
              });
              
              let text = clone.body?.innerText || '';
              text = text.replace(/\s+/g, ' ').trim();
              
              const maxLength = 8000;
              if (text.length > maxLength) {
                text = text.substring(0, maxLength) + '...';
              }
              
              return text;
            }
          });
          
          const content = results[0]?.result || '';
          sendResponse({ content: content });
        } catch (e) {
          sendResponse({ error: e.message });
        }
      }
    });
    return true;
  }
});
