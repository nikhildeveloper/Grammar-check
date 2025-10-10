// service_worker.js — with source flag (openai | proxy | mock) + streaming

const DEFAULT_MODEL = "gpt-4o-mini";

// System prompts
const PROMPTS = {
  Human: [
    "You are a precise and expressive sentence rewriter.",
    "Rewrite the input to improve grammar, fluency, and clarity without changing its original meaning, tone, or emotion.",
    "Write in a natural and human tone, as if written by a thoughtful person.",
    "Fix grammar, capitalization, and punctuation as part of the rewrite.",
    "Return ONLY the corrected text—no extra words.",
    "Example:",
    "Input: As we agreed to meet on the 14th of this month, since my parents are leaving the country on the 18th, I am traveling all these days. I need more time, and I'm not clocking in for any of these days since I'm not properly putting in efforts. However, I will complete the work and stick to our final deadline. Once my parents leave, I will put in extra hours and will definitely complete it. I hope you can cut me some slack here; I hope you understand.",
    "",
    "Expected Output: As we had planned to meet on the 14th of this month, I wanted to inform you that since my parents are leaving the country on the 18th, I've been traveling and spending time with them over these days. I haven't been clocking in during this period, as I haven't been able to put in consistent effort.",
    "However, I will make up for the time once they leave — putting in extra hours to ensure everything is completed before our final deadline. I hope you can kindly allow me some flexibility here, and I truly appreciate your understanding."
  ].join("\n"),

  Professional: [
    "You are a precise and expressive sentence rewriter.",
    "Rewrite the input to improve grammar, fluency, and clarity without changing its original meaning, tone, or emotion.",
    "Write in a clear, professional tone suitable for workplace communication.",
    "Fix grammar, capitalization, and punctuation as part of the rewrite.",
    "Return ONLY the corrected text—no extra words.",
    "Example:",
    "Input: As we agreed to meet on the 14th of this month, since my parents are leaving the country on the 18th, I am traveling all these days. I need more time, and I'm not clocking in for any of these days since I'm not properly putting in efforts. However, I will complete the work and stick to our final deadline. Once my parents leave, I will put in extra hours and will definitely complete it. I hope you can cut me some slack here; I hope you understand.",
    "",
    "Expected Output: As we had planned to meet on the 14th of this month, I wanted to inform you that since my parents are leaving the country on the 18th, I will be traveling and spending time with them over the next few days. I may need some additional time, as I have not been able to focus fully on my work during this period.",
    "However, I assure you that I will complete all pending tasks and adhere to our final deadline. Once my parents leave, I plan to dedicate extra hours to ensure timely completion. I appreciate your understanding and flexibility regarding this matter."
  ].join("\n"),

  Sharpen: [
    "You are a text sharpener that condenses content while preserving meaning and emotion.",
    "Your goal is to reduce word count by 30-50% while maintaining the original intent, tone, and emotional impact.",
    "Remove redundancy, unnecessary words, and verbose phrases. Keep essential information and emotional nuance.",
    "Use concise, powerful language. Combine sentences when appropriate. Eliminate filler words.",
    "Return ONLY the sharpened text—no extra words.",
    "Example:",
    "Input: I just wanted to reach out to you and let you know that I am really, really sorry about what happened yesterday. I feel absolutely terrible about the whole situation, and I want you to know that it was completely my fault and I take full responsibility for everything that went wrong.",
    "",
    "Expected Output: I'm deeply sorry about yesterday. It was entirely my fault, and I take full responsibility."
  ].join("\n"),

  SharpenWithLimit: [
    "You are a text sharpener that condenses content to a specific character limit while preserving meaning and emotion.",
    "Your goal is to reduce the text to the specified character count while maintaining the original intent, tone, and emotional impact.",
    "Remove redundancy, unnecessary words, and verbose phrases. Keep essential information and emotional nuance.",
    "Use concise, powerful language. Combine sentences when appropriate. Eliminate filler words.",
    "The output MUST NOT exceed the specified character limit.",
    "Return ONLY the sharpened text—no extra words.",
    "Example:",
    "Input: I just wanted to reach out to you and let you know that I am really, really sorry about what happened yesterday. I feel absolutely terrible about the whole situation, and I want you to know that it was completely my fault and I take full responsibility for everything that went wrong.",
    "",
    "Expected Output: I'm deeply sorry about yesterday. It was entirely my fault, and I take full responsibility."
  ].join("\n"),

  Lengthen: [
    "You are a text expander that increases content length while preserving meaning and emotion.",
    "Your goal is to expand the text by 50-100% while maintaining the original intent, tone, and emotional impact.",
    "Add descriptive details, explanations, and context. Use richer vocabulary and more expressive language.",
    "Expand on key points with examples, elaborations, or additional context. Keep the emotional core intact.",
    "Return ONLY the lengthened text—no extra words beyond expansion.",
    "Example:",
    "Input: I'm sorry about yesterday. It was my fault.",
    "",
    "Expected Output: I sincerely apologize for what happened yesterday, and I want you to know that I deeply regret my actions. I take full responsibility for the situation, and I acknowledge that it was completely my fault. I understand the impact this may have had, and I am committed to making things right."
  ].join("\n"),

  LengthenWithLimit: [
    "You are a text expander that increases content length to a specific character limit while preserving meaning and emotion.",
    "Your goal is to expand the text to the specified character count while maintaining the original intent, tone, and emotional impact.",
    "Add descriptive details, explanations, and context. Use richer vocabulary and more expressive language.",
    "Expand on key points with examples, elaborations, or additional context. Keep the emotional core intact.",
    "The output MUST reach the specified character count.",
    "Return ONLY the lengthened text—no extra words beyond expansion.",
    "Example:",
    "Input: I'm sorry about yesterday. It was my fault.",
    "",
    "Expected Output: I sincerely apologize for what happened yesterday, and I want you to know that I deeply regret my actions. I take full responsibility for the situation, and I acknowledge that it was completely my fault. I understand the impact this may have had, and I am committed to making things right."
  ].join("\n")
};

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
          const { text, mode, charLimit, meta = {} } = msg;

          try {
            await grammarCheckStream(text, mode, meta, (chunk) => {
              port.postMessage({ type: "STREAM_CHUNK", chunk });
            }, charLimit);

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

async function grammarCheck(text, mode, meta) {
  const { apiMode, apiUrl, apiKey, model } = await getSettings();

  // If not configured, use smarter mock
  if (!apiMode || (apiMode !== "openai" && apiMode !== "proxy")) {
    return { corrected: smartMockCorrection(text, mode), source: "mock" };
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
  const system = PROMPTS[mode] || PROMPTS.Human;

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

// Streaming version - sends chunks as they arrive
async function grammarCheckStream(text, mode, meta, onChunk, charLimit = null) {
  const { apiMode, apiUrl, apiKey, model } = await getSettings();

  // Mock streaming - simulate letter by letter
  if (!apiMode || (apiMode !== "openai" && apiMode !== "proxy")) {
    const result = smartMockCorrection(text, mode, charLimit);
    for (let i = 0; i < result.length; i++) {
      await new Promise(r => setTimeout(r, 20)); // 20ms delay per character
      onChunk(result[i]);
    }
    return;
  }

  if (apiMode === "proxy") {
    // Proxy doesn't support streaming yet, fallback to normal then simulate
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
    
    // Simulate streaming
    for (let i = 0; i < corrected.length; i++) {
      await new Promise(r => setTimeout(r, 20));
      onChunk(corrected[i]);
    }
    return;
  }

  // OpenAI streaming
  if (!apiKey) throw new Error("OpenAI API key not set in options.");
  const usedModel = (model || DEFAULT_MODEL).trim();
  let system = PROMPTS[mode] || PROMPTS.Human;
  
  // Handle character limit for Sharpen mode
  if (mode === "Sharpen" && charLimit) {
    system = [
      "You are a text sharpener that condenses content to a specific character limit while preserving meaning and emotion.",
      `Your goal is to reduce the text to ${charLimit} characters or less while maintaining the original intent, tone, and emotional impact.`,
      "Remove redundancy, unnecessary words, and verbose phrases. Keep essential information and emotional nuance.",
      "Use concise, powerful language. Combine sentences when appropriate. Eliminate filler words.",
      `The output MUST NOT exceed ${charLimit} characters.`,
      "Return ONLY the sharpened text—no extra words.",
      "Example:",
      "Input: I just wanted to reach out to you and let you know that I am really, really sorry about what happened yesterday. I feel absolutely terrible about the whole situation, and I want you to know that it was completely my fault and I take full responsibility for everything that went wrong.",
      "",
      "Expected Output: I'm deeply sorry about yesterday. It was entirely my fault, and I take full responsibility."
    ].join("\n");
  }
  
  // Handle character limit for Lengthen mode
  if (mode === "Lengthen" && charLimit) {
    system = [
      "You are a text expander that increases content length to a specific character limit while preserving meaning and emotion.",
      `Your goal is to expand the text to ${charLimit} characters while maintaining the original intent, tone, and emotional impact.`,
      "Add descriptive details, explanations, and context. Use richer vocabulary and more expressive language.",
      "Expand on key points with examples, elaborations, or additional context. Keep the emotional core intact.",
      `The output MUST reach approximately ${charLimit} characters.`,
      "Return ONLY the lengthened text—no extra words beyond expansion.",
      "Example:",
      "Input: I'm sorry about yesterday. It was my fault.",
      "",
      "Expected Output: I sincerely apologize for what happened yesterday, and I want you to know that I deeply regret my actions. I take full responsibility for the situation, and I acknowledge that it was completely my fault. I understand the impact this may have had, and I am committed to making things right."
    ].join("\n");
  }

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
      temperature: 0.1,
      stream: true  // Enable streaming!
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  // Read the stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

async function getSettings() {
  const st = await chrome.storage.local.get(["apiMode", "apiUrl", "apiKey", "model"]);
  return {
    apiMode: st.apiMode,
    apiUrl: st.apiUrl,
    apiKey: st.apiKey,
    model: st.model || DEFAULT_MODEL
  };
}

// Smarter mock so questions end with '?'
function smartMockCorrection(s, mode = "Human", charLimit = null) {
  let t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  
  if (mode === "Sharpen") {
    // Sharpen mode: reduce word count while preserving meaning
    t = t.toLowerCase();
    
    // Remove common filler words and phrases
    t = t.replace(/\b(just|really|very|quite|pretty|rather|somewhat|fairly|extremely|totally|completely|absolutely|definitely|certainly|obviously|clearly|basically|essentially|literally|actually|honestly|frankly|personally|individually|specifically|particularly|especially|particularly|mainly|mostly|primarily|fundamentally|ultimately|finally|eventually|gradually|slowly|quickly|rapidly|immediately|instantly|suddenly|immediately|right away|as soon as possible|at the earliest|without delay)\b/g, '');
    
    // Remove redundant phrases
    t = t.replace(/\b(due to the fact that|because of the fact that|in order to|for the purpose of|in the event that|in case of|as a result of|in spite of the fact that|despite the fact that|regardless of the fact that)\b/g, 'because');
    t = t.replace(/\b(at this point in time|at the present time|at this moment in time)\b/g, 'now');
    t = t.replace(/\b(in the near future|in the not too distant future)\b/g, 'soon');
    t = t.replace(/\b(a large number of|a great deal of|a considerable amount of)\b/g, 'many');
    
    // Combine sentences with semicolons when appropriate
    t = t.replace(/\.\s+/g, '; ');
    t = t.replace(/;\s*$/, '.');
    
    // Clean up extra spaces
    t = t.replace(/\s+/g, ' ').trim();
    
    // If character limit is specified, trim to that limit
    if (charLimit && t.length > charLimit) {
      t = t.substring(0, charLimit);
      // Find the last complete word
      const lastSpace = t.lastIndexOf(' ');
      if (lastSpace > charLimit * 0.7) { // Only if we're not cutting too much
        t = t.substring(0, lastSpace);
      }
    }
    
    // Capitalize first letter
    t = t[0].toUpperCase() + t.slice(1);
    
    // Ensure proper ending
    if (!/[.!?]$/.test(t)) {
      const qStarters = /^(?:who|what|when|where|why|how|which|whom|whose|do|does|did|is|are|am|was|were|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;
      if (qStarters.test(t)) return t + "?";
      return t + ".";
    }
    
    return t;
  }
  
  if (mode === "Lengthen") {
    // Lengthen mode: expand text while preserving meaning
    t = t.toLowerCase();
    
    // Add descriptive words and phrases
    t = t.replace(/\b(i'm sorry|sorry)\b/g, 'i sincerely apologize and deeply regret');
    t = t.replace(/\b(thank you|thanks)\b/g, 'i sincerely thank you and appreciate');
    t = t.replace(/\b(please)\b/g, 'i kindly request that you please');
    t = t.replace(/\b(help)\b/g, 'provide assistance and support');
    t = t.replace(/\b(important)\b/g, 'extremely important and crucial');
    t = t.replace(/\b(good)\b/g, 'excellent and highly satisfactory');
    t = t.replace(/\b(bad)\b/g, 'unfortunate and disappointing');
    t = t.replace(/\b(problem)\b/g, 'challenging situation that requires attention');
    t = t.replace(/\b(solution)\b/g, 'effective solution and resolution');
    
    // Add connecting phrases
    t = t.replace(/([.!?])\s+([A-Z])/g, '$1 Additionally, $2');
    t = t.replace(/([.!?])\s+([A-Z])/g, '$1 Furthermore, $2');
    t = t.replace(/([.!?])\s+([A-Z])/g, '$1 Moreover, $2');
    
    // Add descriptive phrases
    t = t.replace(/\b(and)\b/g, 'as well as');
    t = t.replace(/\b(but)\b/g, 'however, it is important to note that');
    t = t.replace(/\b(so)\b/g, 'therefore, as a result');
    t = t.replace(/\b(because)\b/g, 'due to the fact that');
    t = t.replace(/\b(if)\b/g, 'in the event that');
    t = t.replace(/\b(when)\b/g, 'at the time when');
    t = t.replace(/\b(where)\b/g, 'at the location where');
    
    // Clean up extra spaces
    t = t.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter
    t = t[0].toUpperCase() + t.slice(1);
    
    // Ensure proper ending
    if (!/[.!?]$/.test(t)) {
      const qStarters = /^(?:who|what|when|where|why|how|which|whom|whose|do|does|did|is|are|am|was|were|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;
      if (qStarters.test(t)) return t + "?";
      return t + ".";
    }
    
    return t;
  }
  
  // Default Human mode behavior
  t = t[0].toUpperCase() + t.slice(1);
  if (/[.!?]$/.test(t)) return t;
  const qStarters = /^(?:who|what|when|where|why|how|which|whom|whose|do|does|did|is|are|am|was|were|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;
  if (qStarters.test(t)) return t + "?";
  return t + ".";
}
