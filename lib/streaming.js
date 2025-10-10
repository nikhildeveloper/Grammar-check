// lib/streaming.js - Streaming grammar check

import { getSettings, smartMockCorrection } from './settings.js';
import { PROMPTS } from './prompts.js';

export async function grammarCheckStream(text, mode, meta, onChunk) {
  const { apiMode, apiUrl, apiKey, model } = await getSettings();

  // Mock streaming - simulate letter by letter
  if (!apiMode || (apiMode !== "openai" && apiMode !== "proxy")) {
    const result = smartMockCorrection(text);
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
  const usedModel = model.trim();
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

