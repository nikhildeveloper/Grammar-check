// content.js — v8.5: glassy draggable panel + hover animations + white textarea + copy toast + FAB OPEN/✕

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
  const showHUD = (() => {
    const hud = document.createElement("div");
    Object.assign(hud.style, {
      position: "fixed", right: "10px", bottom: "10px", zIndex: 2147483647,
      background: "rgba(0,0,0,.6)", color: "#fff", padding: "4px 6px",
      borderRadius: "8px", fontSize: "11px", fontFamily: "system-ui",
      pointerEvents: "none", opacity: "0", transition: "opacity .15s ease"
    });
    document.documentElement.appendChild(hud);
    let t;
    return (text) => {
      if (!STATE.monitoring) return;
      clearTimeout(t);
      hud.textContent = `"${(text || "").trim().slice(0, 60)}"`;
      hud.style.opacity = "1";
      t = setTimeout(() => (hud.style.opacity = "0"), 900);
    };
  })();

  // Debounced publisher (monitoring gated + deduped)
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

  // Inject minimal CSS (animations + toast)
  (function injectStyles(){
    if (document.getElementById("__gc_anim_css")) return;
    const style = document.createElement("style");
    style.id = "__gc_anim_css";
    style.textContent = `
      #__gc_panel .gc-btn, #__gc_fab {
        transition: transform .14s ease, box-shadow .14s ease, opacity .14s ease, background-color .14s ease, border-color .14s ease;
        will-change: transform, box-shadow;
      }
      #__gc_panel .gc-btn:hover, #__gc_fab:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(0,0,0,.25);
      }
      #__gc_panel textarea#gc-text::placeholder { color: rgba(255,255,255,0.5); }
      #__gc_toast {
        position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        background:rgba(34,197,94,0.9); color:#fff; padding:4px 10px;
        border-radius:8px; font:11px system-ui; opacity:0; pointer-events:none;
        transition:opacity .3s ease;
      }
    `;
    document.head.appendChild(style);
  })();

  // Helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Build panel
  const panel = document.createElement("div");
  panel.id = "__gc_panel";
  Object.assign(panel.style, {
    position: "fixed", right: "12px", bottom: "80px",
    width: "min(400px,90vw)", height: "min(260px,55vh)",
    display: "none", flexDirection: "column", borderRadius: "16px",
    padding: "8px", background: "rgba(17,17,17,0.55)",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 10px 30px rgba(0,0,0,.4)", color: "#fff",
    zIndex: 2147483647, fontFamily: "system-ui"
  });
  panel.innerHTML = `
    <div id="gc-header" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:grab;user-select:none;">
      <span style="font-size:13px;font-weight:600;">Grammar Panel</span>
      <div style="flex:1"></div>
      <button id="gc-monitor" class="gc-btn" style="background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,.5);color:#bbf7d0;padding:3px 8px;border-radius:6px;font:11px system-ui;cursor:pointer;">Monitor: OFF</button>
      <button id="gc-close" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:3px 8px;border-radius:6px;font:11px system-ui;cursor:pointer;">Close</button>
    </div>
    <textarea id="gc-text" placeholder="Highlight text after turning ON monitor..."
      style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;
             color:#fff;caret-color:#fff;padding:10px;font:12px/1.4 ui-monospace;resize:none;outline:none;"></textarea>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
      <div style="display:flex;gap:6px;">
        <button id="gc-check" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Human-Tone</button>
        <button id="gc-check-pro" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Professional-Tone</button>
        <button id="gc-copy"  class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Copy</button>
      </div>
      <span id="gc-source" style="font-size:10px;opacity:.8;">source: —</span>
    </div>
    <div id="__gc_toast">Copied!</div>
  `;
  document.body.appendChild(panel);

  // Floating action button (FAB)
  const fab = document.createElement("button");
  fab.id = "__gc_fab";
  fab.textContent = "G";
  Object.assign(fab.style, {
    position: "fixed", right: "12px", bottom: "20px", zIndex: 2147483647,
    background: "rgba(88, 208, 36, 0.9)", color: "#fff", border: "none",
    borderRadius: "999px", padding: "8px 14px",
    font: "12px system-ui", cursor: "pointer",
    boxShadow: "0 6px 14px rgba(103, 246, 59, 0.4)"
  });
  fab.className = "gc-btn";
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

  // ======= Show/Hide helpers (updates FAB label) =======
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

  // Wire FAB + Close to helpers
  fab.onclick = togglePanel;
  btnClose.onclick = hidePanel;

  // ======= Actions =======
  function setSource(s) { srcEl.textContent = `source: ${s}`; }
  function setText(v)   { textEl.value = v; }

  btnMonitor.onclick = async () => {
    STATE.monitoring = !STATE.monitoring;
    await chrome.storage.local.set({ monitoring: STATE.monitoring });
    reflectMonitor();
  };

  btnCheck.onclick = () => {
    const text = textEl.value.trim();
    if (!text) return;
    setSource("…");
    setText("Reframing...");
    chrome.runtime.sendMessage({ type: "GRAMMAR_CHECK", text, mode:"Human" }, async (resp) => {
      if (!resp) { setText("ERROR: No response"); setSource("—"); return; }
      if (resp.ok) {
        setText(resp.corrected);
        setSource(resp.source === "openai" ? "GPT" : resp.source === "proxy" ? "Proxy" : "Mock");
        STATE.monitoring = false;
        await chrome.storage.local.set({ monitoring: false });
        reflectMonitor();
      } else {
        setText(`ERROR: ${resp.error || "failed"}`); setSource("—");
      }
    });
  };

  btnCheckPro.onclick = () => {
    const text = textEl.value.trim();
    if (!text) return;
    setSource("…");
    setText("Reframing...");
    chrome.runtime.sendMessage({ type: "GRAMMAR_CHECK", text, mode:"Professional" }, async (resp) => {
      if (!resp) { setText("ERROR: No response"); setSource("—"); return; }
      if (resp.ok) {
        setText(resp.corrected);
        setSource(resp.source === "openai" ? "GPT" : resp.source === "proxy" ? "Proxy" : "Mock");
        STATE.monitoring = false;
        await chrome.storage.local.set({ monitoring: false });
        reflectMonitor();
      } else {
        setText(`ERROR: ${resp.error || "failed"}`); setSource("—");
      }
    });
  };

  btnCopy.onclick = async () => {
    try { await navigator.clipboard.writeText(textEl.value); showToast(); } catch {}
  };

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
  reflectMonitor();
  reflectFab(); // set initial label based on initial state

  // ======= Dragging =======
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
  window.onpointerup = () => { dragging = false; header.style.cursor = "grab"; panel.style.transition = ""; };

  // ======= Incoming highlight → populate + open panel (only if monitoring ON) =======
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ADD_ITEM_BROADCAST" && STATE.monitoring) {
      const { text } = msg.payload || {};
      setText(text || "");
      setSource("—");
      showPanel();
    }
  });

})();
