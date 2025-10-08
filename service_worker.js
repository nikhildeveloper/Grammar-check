// service_worker.js — with source flag (openai | proxy | mock)

const DEFAULT_MODEL = "gpt-4o-mini";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled"]).then(({ enabled }) => {
    if (enabled === undefined) chrome.storage.local.set({ enabled: true });
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  const next = !enabled;
  await chrome.storage.local.set({ enabled: next });
  try {
    await chrome.action.setBadgeText({ text: next ? "ON" : "OFF", tabId: tab?.id });
    await chrome.action.setBadgeBackgroundColor({ color: next ? "#16a34a" : "#6b7280", tabId: tab?.id });
  } catch {}
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  try {
    await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF", tabId });
    await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#16a34a" : "#6b7280", tabId });
  } catch {}
});

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
      const { text, meta = {} } = msg;
      try {
        const { corrected, source } = await grammarCheck(text, meta);
        sendResponse({ ok: true, corrected, source });
      } catch (err) {
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
      return;
    }
  })();
  return true;
});

async function grammarCheck(text, meta) {
  const { apiMode, apiUrl, apiKey, model } = await getSettings();

  // If not configured, use smarter mock
  if (!apiMode || (apiMode !== "openai" && apiMode !== "proxy")) {
    return { corrected: smartMockCorrection(text), source: "mock" };
  }

  if (apiMode === "proxy") {
    if (!apiUrl) throw new Error("Proxy URL not set in options.");
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, meta })
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const corrected = data?.corrected?.toString?.().trim?.();
    if (!corrected) throw new Error("Proxy response missing 'corrected'.");
    return { corrected, source: "proxy" };
  }

  // OpenAI direct
  if (!apiKey) throw new Error("OpenAI API key not set in options.");
  const usedModel = (model || DEFAULT_MODEL).trim();

  const system = [
    "You are a precise grammar corrector.",
    "Fix grammar, capitalization, and punctuation while preserving meaning.",
    "If the text is a direct question, end it with a question mark '?'.",
    "Return ONLY the corrected text—no extra words."
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: usedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ],
      temperature: 0.1
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json().catch(() => ({}));
  const corrected = data?.choices?.[0]?.message?.content?.trim?.();
  if (!corrected) throw new Error("No content from OpenAI.");
  return { corrected, source: "openai" };
}

async function getSettings() {
  const st = await chrome.storage.local.get(["apiMode", "apiUrl", "apiKey", "model"]);
  return {
    apiMode: st.apiMode,
    apiUrl: st.apiUrl,
    apiKey: st.apiKey,
    model: st.model
  };
}

// Smarter mock so questions end with '?'
function smartMockCorrection(s) {
  let t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  t = t[0].toUpperCase() + t.slice(1);
  if (/[.!?]$/.test(t)) return t;
  const qStarters = /^(?:who|what|when|where|why|how|which|whom|whose|do|does|did|is|are|am|was|were|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;
  if (qStarters.test(t)) return t + "?";
  return t + ".";
}
