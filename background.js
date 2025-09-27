// Background script to handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  const extensionUrl = chrome.runtime.getURL('history.html');

  // Check if there's already a tab with the extension open
  const tabs = await chrome.tabs.query({ url: extensionUrl });

  if (tabs.length > 0) {
    // Switch to the existing tab
    const existingTab = tabs[0];
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    // Create a new tab
    chrome.tabs.create({
      url: extensionUrl,
      active: true
    });
  }
});