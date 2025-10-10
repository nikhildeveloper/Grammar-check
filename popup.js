// popup.js - Extension popup functionality

document.addEventListener('DOMContentLoaded', async () => {
  const alwaysOnToggle = document.getElementById('alwaysOnToggle');
  const optionsLink = document.getElementById('optionsLink');
  
  // Load current state
  const result = await chrome.storage.sync.get(['alwaysOnScreen']);
  const isAlwaysOn = result.alwaysOnScreen || false;
  
  // Set toggle state
  if (isAlwaysOn) {
    alwaysOnToggle.classList.add('active');
  }
  
  // Handle toggle click
  alwaysOnToggle.addEventListener('click', async () => {
    const isActive = alwaysOnToggle.classList.contains('active');
    const newState = !isActive;
    
    // Update toggle appearance
    alwaysOnToggle.classList.toggle('active');
    
    // Save to storage
    await chrome.storage.sync.set({ alwaysOnScreen: newState });
    
    // Send message to all content scripts to show/hide FAB
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleAlwaysOnScreen',
          enabled: newState
        });
      } catch (err) {
        // Tab might not have content script loaded, ignore
      }
    }
  });
  
  // Handle options link
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
