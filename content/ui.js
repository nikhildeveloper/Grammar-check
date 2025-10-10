// content/ui.js - UI creation and styling

export function injectStyles() {
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
}

export function createPanel() {
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
        <button id="gc-check" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Human</button>
        <button id="gc-check-pro" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Professional</button>
        <button id="gc-copy"  class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Copy</button>
      </div>
      <span id="gc-source" style="font-size:10px;opacity:.8;">source: —</span>
    </div>
    <div id="__gc_toast">Copied!</div>
  `;
  return panel;
}

export function createFAB() {
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
  return fab;
}

export function createHUD() {
  const hud = document.createElement("div");
  Object.assign(hud.style, {
    position: "fixed", right: "10px", bottom: "10px", zIndex: 2147483647,
    background: "rgba(0,0,0,.6)", color: "#fff", padding: "4px 6px",
    borderRadius: "8px", fontSize: "11px", fontFamily: "system-ui",
    pointerEvents: "none", opacity: "0", transition: "opacity .15s ease"
  });
  document.documentElement.appendChild(hud);
  return hud;
}

