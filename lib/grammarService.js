// lib/grammarService.js - Grammar checking logic

import { getSettings, smartMockCorrection } from './settings.js';
import { PROMPTS } from './prompts.js';

export async function grammarCheck(text, mode, meta) {
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

