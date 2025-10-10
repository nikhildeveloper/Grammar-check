// background/service_worker.js - Main service worker

import { grammarCheck } from '../lib/grammarService.js';
import { grammarCheckStream } from '../lib/streaming.js';
import { getSettings } from '../lib/settings.js';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled"]).then(({ enabled }) => {
    if (enabled === undefined) chrome.storage.local.set({ enabled: true });
  });
});

// Toggle extension on/off
chrome.action.onClicked.addListener(async (tab) => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  const next = !enabled;
  await chrome.storage.local.set({ enabled: next });
  try {
    await chrome.action.setBadgeText({ text: next ? "ON" : "OFF", tabId: tab?.id });
    await chrome.action.setBadgeBackgroundColor({ color: next ? "#16a34a" : "#6b7280", tabId: tab?.id });
  } catch {}
});

// Update badge when tab changes
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  try {
    await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF", tabId });
    await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#16a34a" : "#6b7280", tabId });
  } catch {}
});

// Handle messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "ADD_ITEM") {
      const tabId = sender?.tab?.id;
      if (tabId != null) {
        try {
          await chrome.tabs.sendMessage(
            tabId,
            { type: "ADD_ITEM_BROADCAST", payload: msg.payload },
            { frameId: 0 }
          );
        } catch {}
      }
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "GRAMMAR_CHECK") {
      const { text, mode, meta = {} } = msg;
      
      try {
        const { corrected, source } = await grammarCheck(text, mode, meta);
        sendResponse({ ok: true, corrected, source });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }
  })();
  return true;
});

// Handle streaming connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "grammar-stream") {
    port.onMessage.addListener(async (msg) => {
      if (msg?.type === "GRAMMAR_CHECK_STREAM") {
        const { text, mode, meta = {} } = msg;
        
        try {
          await grammarCheckStream(text, mode, meta, (chunk) => {
            port.postMessage({ type: "STREAM_CHUNK", chunk });
          });
          
          const { apiMode } = await getSettings();
          const source = apiMode === "openai" ? "openai" : apiMode === "proxy" ? "proxy" : "mock";
          port.postMessage({ type: "STREAM_DONE", source });
        } catch (err) {
          port.postMessage({ type: "STREAM_ERROR", error: String(err?.message || err) });
        }
      }
    });
  }
});

