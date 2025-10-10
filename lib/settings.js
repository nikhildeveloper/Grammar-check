// lib/settings.js - Settings management

export const DEFAULT_MODEL = "gpt-4o-mini";

export async function getSettings() {
  const st = await chrome.storage.local.get(["apiMode", "apiUrl", "apiKey", "model"]);
  return {
    apiMode: st.apiMode,
    apiUrl: st.apiUrl,
    apiKey: st.apiKey,
    model: st.model || DEFAULT_MODEL
  };
}

export function smartMockCorrection(s) {
  let t = (s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  t = t[0].toUpperCase() + t.slice(1);
  if (/[.!?]$/.test(t)) return t;
  const qStarters = /^(?:who|what|when|where|why|how|which|whom|whose|do|does|did|is|are|am|was|were|can|could|will|would|shall|should|have|has|had|may|might|must)\b/i;
  if (qStarters.test(t)) return t + "?";
  return t + ".";
}

