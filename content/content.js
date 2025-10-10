// content/content.js - Main content script

import { injectStyles, createPanel, createFAB, createHUD } from './ui.js';
import { createStreamingHandler, createCopyHandler, createMonitorHandler, setupDragging } from './handlers.js';

(() => {
  if (window.__inputDetector_v85) return;
  window.__inputDetector_v85 = true;

  const IS_TOP = window === window.top;
  const STATE = { enabled: true, monitoring: false, current: { text: "", kind: "", selector: "" } };
  const MIN_LEN = 2;

  // Load initial flags
  (async () => {
    try {
      const st = await chrome.storage?.local?.get(["enabled", "monitoring"]);
      if (typeof st?.enabled === "boolean") STATE.enabled = st.enabled;
      if (typeof st?.monitoring === "boolean") STATE.monitoring = st.monitoring;
    } catch {}
  })();
  
  chrome.storage?.onChanged?.addListener((c) => {
    if (c.enabled) STATE.enabled = !!c.enabled.newValue;
    if (c.monitoring) STATE.monitoring = !!c.monitoring.newValue;
  });

  // ======= Selection capture (all frames) =======
  const hud = createHUD();
  const showHUD = (() => {
    let t;
    return (text) => {
      if (!STATE.monitoring) return;
      clearTimeout(t);
      hud.textContent = `"${(text || "").trim().slice(0, 60)}"`;
      hud.style.opacity = "1";
      t = setTimeout(() => (hud.style.opacity = "0"), 900);
    };
  })();

  // Debounced publisher
  const publishSelection = (() => {
    let debounce, lastKey = "", lastTs = 0;
    return () => {
      if (!STATE.monitoring) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const sel = document.getSelection?.();
        const text = sel?.toString()?.trim();
        if (!text || text.length < MIN_LEN) return;
        const now = Date.now(), key = text;
        if (key === lastKey && now - lastTs < 800) return;
        lastKey = key; lastTs = now;
        showHUD(text);
        chrome.runtime.sendMessage({ type: "ADD_ITEM", payload: { text, kind: "selection" } }).catch(()=>{});
      }, 60);
    };
  })();
  
  document.addEventListener("mouseup", publishSelection, true);

  if (!IS_TOP) return;

  // ======= Top-window UI =======
  injectStyles();

  const panel = createPanel();
  document.body.appendChild(panel);

  const fab = createFAB();
  document.body.appendChild(fab);

  // Element refs
  const btnMonitor = panel.querySelector("#gc-monitor");
  const btnClose   = panel.querySelector("#gc-close");
  const btnCheck   = panel.querySelector("#gc-check");
  const btnCheckPro = panel.querySelector("#gc-check-pro");
  const btnCopy    = panel.querySelector("#gc-copy");
  const textEl     = panel.querySelector("#gc-text");
  const srcEl      = panel.querySelector("#gc-source");
  const toast      = panel.querySelector("#__gc_toast");
  const header     = panel.querySelector("#gc-header");

  // ======= Helpers =======
  function isPanelOpen() { return panel.style.display !== "none"; }
  
  function reflectFab() {
    if (!fab) return;
    const open = isPanelOpen();
    fab.textContent = open ? "✕" : "G";
    fab.setAttribute("aria-label", open ? "Close" : "G");
  }
  
  function showPanel()  { panel.style.display = "flex"; reflectFab(); }
  function hidePanel()  { panel.style.display = "none"; reflectFab(); }
  function togglePanel(){ isPanelOpen() ? hidePanel() : showPanel(); }
  
  function setSource(s) { srcEl.textContent = `source: ${s}`; }
  
  function showToast() {
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, 1000);
  }
  
  function reflectMonitor() {
    if (STATE.monitoring) {
      btnMonitor.textContent = "Monitor: ON";
      btnMonitor.style.background = "rgba(34,197,94,0.35)";
      btnMonitor.style.color = "#bbf7d0";
    } else {
      btnMonitor.textContent = "Monitor: OFF";
      btnMonitor.style.background = "rgba(34,197,94,0.15)";
      btnMonitor.style.color = "#bbf7d0";
    }
  }

  // ======= Event handlers =======
  fab.onclick = togglePanel;
  btnClose.onclick = hidePanel;
  
  btnMonitor.onclick = createMonitorHandler(STATE, reflectMonitor);
  btnCheck.onclick = createStreamingHandler(textEl, setSource, STATE, reflectMonitor, "Human");
  btnCheckPro.onclick = createStreamingHandler(textEl, setSource, STATE, reflectMonitor, "Professional");
  btnCopy.onclick = createCopyHandler(textEl, showToast);

  // ======= Dragging =======
  setupDragging(panel, header);

  // ======= Incoming messages =======
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ADD_ITEM_BROADCAST" && STATE.monitoring) {
      const { text } = msg.payload || {};
      textEl.value = text || "";
      setSource("—");
      showPanel();
    }
  });

  reflectMonitor();
  reflectFab();
})();

