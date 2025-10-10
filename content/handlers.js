// content/handlers.js - Event handlers

export function createStreamingHandler(textEl, setSource, setState, reflectMonitor, mode) {
  return async () => {
    const text = textEl.value.trim();
    if (!text) return;
    
    setSource("…");
    textEl.value = "";
    
    const port = chrome.runtime.connect({ name: "grammar-stream" });
    port.postMessage({ type: "GRAMMAR_CHECK_STREAM", text, mode });
    
    let accumulatedText = "";
    
    port.onMessage.addListener((msg) => {
      if (msg.type === "STREAM_CHUNK") {
        accumulatedText += msg.chunk;
        textEl.value = accumulatedText;
      } else if (msg.type === "STREAM_DONE") {
        setSource(msg.source === "openai" ? "GPT" : msg.source === "proxy" ? "Proxy" : "Mock");
        setState.monitoring = false;
        chrome.storage.local.set({ monitoring: false });
        reflectMonitor();
        port.disconnect();
      } else if (msg.type === "STREAM_ERROR") {
        textEl.value = `ERROR: ${msg.error || "failed"}`;
        setSource("—");
        port.disconnect();
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (!accumulatedText) {
        textEl.value = "ERROR: Connection lost";
        setSource("—");
      }
    });
  };
}

export function createCopyHandler(textEl, showToast) {
  return async () => {
    try {
      await navigator.clipboard.writeText(textEl.value);
      showToast();
    } catch {}
  };
}

export function createMonitorHandler(STATE, reflectMonitor) {
  return async () => {
    STATE.monitoring = !STATE.monitoring;
    await chrome.storage.local.set({ monitoring: STATE.monitoring });
    reflectMonitor();
  };
}

export function setupDragging(panel, header) {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const clampPx = (val, size, view) => clamp(val, 12, Math.max(12, view - size - 12));
  
  let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
  
  header.onpointerdown = (e) => {
    if (e.button !== 0) return;
    dragging = true;
    panel.style.transition = "none";
    const r = panel.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; sl = r.left; st = r.top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  };
  
  window.onpointermove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const left = clampPx(sl + dx, panel.offsetWidth,  window.innerWidth);
    const top  = clampPx(st + dy, panel.offsetHeight, window.innerHeight);
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto"; panel.style.bottom = "auto";
  };
  
  window.onpointerup = () => {
    dragging = false;
    header.style.cursor = "grab";
    panel.style.transition = "";
  };
}

