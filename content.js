// content.js — v8.5: modularized with bundled code

(() => {
  
  // Skip iframe execution to avoid CSP errors
  if (window !== window.top) {
    return;
  }
  
  if (window.__inputDetector_v85) return;
  window.__inputDetector_v85 = true;

  const IS_TOP = window === window.top;
  
  // Only run main functionality in the main frame
  if (!IS_TOP) {
    return;
  }

  

  // Special handling for TinyMCE and other rich text editors
  function setupTinyMCESupport() {
    
    // Look for TinyMCE iframe
    const tinyMCEIframe = document.querySelector('iframe[title*="Rich Text Area"], iframe[id*="mce"], iframe[src*="javascript:"]');
    if (tinyMCEIframe) {
      
      try {
        const iframeDoc = tinyMCEIframe.contentDocument || tinyMCEIframe.contentWindow.document;
        
        // Add event listeners to the iframe's document
        iframeDoc.addEventListener("mouseup", (e) => {
          setTimeout(() => {
            const selection = iframeDoc.getSelection();
            const text = selection?.toString()?.trim();
            
            
            if (text && text.length >= MIN_LEN) {
              try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Convert iframe coordinates to main window coordinates
                const iframeRect = tinyMCEIframe.getBoundingClientRect();
                const x = iframeRect.left + rect.left + (rect.width / 2) - 75;
                const y = iframeRect.top + rect.top + window.scrollY - 30; // 30px above selection
                
                showSelectionTooltip(text, x, y);
              } catch (err) {
              }
            } else {
              hideSelectionTooltip();
            }
          }, 10);
        }, true);

        iframeDoc.addEventListener("selectionchange", () => {
          setTimeout(() => {
            const selection = iframeDoc.getSelection();
            const text = selection?.toString()?.trim();
            
            if (text && text.length >= MIN_LEN) {
              try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                const iframeRect = tinyMCEIframe.getBoundingClientRect();
                const x = iframeRect.left + rect.left + (rect.width / 2) - 75;
                const y = iframeRect.top + rect.top + window.scrollY - 30; // 30px above selection
                
                showSelectionTooltip(text, x, y);
              } catch (err) {
              }
            } else {
              hideSelectionTooltip();
            }
          }, 50);
        });

      } catch (err) {
      }
    }
  }

  // Try to set up TinyMCE support immediately and also after a delay
  setupTinyMCESupport();
  setTimeout(setupTinyMCESupport, 1000);
  setTimeout(setupTinyMCESupport, 3000);

  const STATE = { enabled: true, monitoring: false, current: { text: "", kind: "", selector: "" } };
  const MIN_LEN = 2;
  let alwaysOnScreen = false;

  // Load initial flags
  (async () => {
    try {
      const st = await chrome.storage?.local?.get(["enabled", "monitoring"]);
      const sync = await chrome.storage?.sync?.get(["alwaysOnScreen"]);
      if (typeof st?.enabled === "boolean") STATE.enabled = st.enabled;
      if (typeof st?.monitoring === "boolean") STATE.monitoring = st.monitoring;
      alwaysOnScreen = sync.alwaysOnScreen || false;
      
      // Show FAB if always on screen is enabled
      if (alwaysOnScreen) {
        showFAB();
      }
    } catch {}
  })();

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggleAlwaysOnScreen') {
      alwaysOnScreen = msg.enabled;
      if (alwaysOnScreen) {
        showFAB();
      } else {
        hideFAB();
      }
    }
  });
  chrome.storage?.onChanged?.addListener((c) => {
    if (c.enabled) STATE.enabled = !!c.enabled.newValue;
    if (c.monitoring) STATE.monitoring = !!c.monitoring.newValue;
  });

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

                 <button id="gc-copy"  class="gc-btn" title="Copy" style="background:rgba(88,208,36,0.8);border:none;color:#fff;padding:0;width:18px;height:18px;border-radius:50%;font:11px system-ui;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;">C</button>
      <button id="gc-close" class="gc-btn" style="background:rgba(220,53,69,0.8);border:none;color:#fff;padding:0;width:18px;height:18px;border-radius:50%;font:11px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="10px" height="10px" style="fill:#fff;">
          <path d="M9 3L3 9M3 3L9 9" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none"/>
        </svg>
      </button>
    </div>
    <div style="position:relative;flex:1;">
      <textarea id="gc-text" placeholder="Select text and click the tooltip, or paste/type here..."
        style="width:100%;height:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;
               color:#fff;caret-color:#fff;padding:10px;font:12px/1.4 ui-monospace;resize:none;outline:none;box-sizing:border-box;"></textarea>
      <div id="gc-char-count" style="position:absolute;bottom:8px;right:12px;font-size:10px;color:rgba(255,255,255,0.6);pointer-events:none;">0</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
        <div style="display:flex;gap:6px;align-items:center;position:relative;">
          <button id="gc-check" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Human</button>
         <button id="gc-check-pro" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Professional</button>
         <button id="gc-check-sharp" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Shorten</button>
         <button id="gc-check-lengthen" class="gc-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:4px 10px;border-radius:8px;font:11px system-ui;cursor:pointer;">Lengthen</button>
         <div id="gc-shorten-controls" style="display:none;position:absolute;top:0;left:0;gap:4px;align-items:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);padding:4px;border-radius:8px;z-index:1000;backdrop-filter:blur(10px);">
           <input id="gc-char-limit" type="number" placeholder="Max chars" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:2px 6px;border-radius:4px;font:10px system-ui;width:60px;outline:none;" />
           <button id="gc-shorten-go" class="gc-btn" style="background:rgba(88,208,36,0.3);border:1px solid rgba(88,208,36,.5);color:#fff;padding:2px 6px;border-radius:4px;font:10px system-ui;cursor:pointer;">Go</button>
         </div>
         <div id="gc-lengthen-controls" style="display:none;position:absolute;top:0;left:0;gap:4px;align-items:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);padding:4px;border-radius:8px;z-index:1000;backdrop-filter:blur(10px);">
           <input id="gc-lengthen-limit" type="number" placeholder="Target chars" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:2px 6px;border-radius:4px;font:10px system-ui;width:60px;outline:none;" />
           <button id="gc-lengthen-go" class="gc-btn" style="background:rgba(88,208,36,0.3);border:1px solid rgba(88,208,36,.5);color:#fff;padding:2px 6px;border-radius:4px;font:10px system-ui;cursor:pointer;">Go</button>
         </div>

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
    boxShadow: "0 6px 14px rgba(103, 246, 59, 0.4)",
    display: "none" // Hidden by default
  });
  fab.className = "gc-btn";
  document.body.appendChild(fab);

  // FAB visibility functions
  function showFAB() {
    fab.style.display = "block";
  }

  function hideFAB() {
    fab.style.display = "none";
  }

  // Element refs
  const btnClose   = panel.querySelector("#gc-close");
  const btnCheck   = panel.querySelector("#gc-check");
  const btnCheckPro = panel.querySelector("#gc-check-pro");
  const btnCheckSharp = panel.querySelector("#gc-check-sharp");
  const btnCheckLengthen = panel.querySelector("#gc-check-lengthen");
  const shortenControls = panel.querySelector("#gc-shorten-controls");
  const charLimitInput = panel.querySelector("#gc-char-limit");
  const btnshortenGo = panel.querySelector("#gc-shorten-go");
  const lengthenControls = panel.querySelector("#gc-lengthen-controls");
  const lengthenLimitInput = panel.querySelector("#gc-lengthen-limit");
  const btnLengthenGo = panel.querySelector("#gc-lengthen-go");
  const btnCopy    = panel.querySelector("#gc-copy");
  const textEl     = panel.querySelector("#gc-text");
  const charCountEl = panel.querySelector("#gc-char-count");
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
  
  function updateCharCount() {
    const count = textEl.value.length;
    charCountEl.textContent = count;
    
    // Change color based on character count
    if (count === 0) {
      charCountEl.style.color = "rgba(255,255,255,0.6)";
    } else if (count < 100) {
      charCountEl.style.color = "rgba(255,255,255,0.8)";
    } else if (count < 500) {
      charCountEl.style.color = "rgba(255,255,255,1)";
    } else if (count < 1000) {
      charCountEl.style.color = "rgba(255,193,7,0.9)";
    } else {
      charCountEl.style.color = "rgba(220,53,69,0.9)";
    }
  }

  btnCheck.onclick = async () => {
    const text = textEl.value.trim();
    if (!text) return;
    shortenControls.style.display = "none";
    lengthenControls.style.display = "none";
    setSource("…");
    textEl.value = "";
    
    const port = chrome.runtime.connect({ name: "grammar-stream" });
    port.postMessage({ type: "GRAMMAR_CHECK_STREAM", text, mode: "Human" });
    
    let accumulatedText = "";
    
    port.onMessage.addListener((msg) => {
      if (msg.type === "STREAM_CHUNK") {
        accumulatedText += msg.chunk;
        textEl.value = accumulatedText;
        updateCharCount();
      } else if (msg.type === "STREAM_DONE") {
        setSource(msg.source === "openai" ? "GPT" : msg.source === "proxy" ? "Proxy" : "Mock");
        port.disconnect();
      } else if (msg.type === "STREAM_ERROR") {
        textEl.value = `ERROR: ${msg.error || "failed"}`;
        setSource("—");
        updateCharCount();
        port.disconnect();
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (!accumulatedText) {
        textEl.value = "ERROR: Connection lost";
        setSource("—");
        updateCharCount();
      }
    });
  };

  btnCheckPro.onclick = async () => {
    const text = textEl.value.trim();
    if (!text) return;
    shortenControls.style.display = "none";
    lengthenControls.style.display = "none";
    setSource("…");
    textEl.value = "";
    
    const port = chrome.runtime.connect({ name: "grammar-stream" });
    port.postMessage({ type: "GRAMMAR_CHECK_STREAM", text, mode: "Professional" });
    
    let accumulatedText = "";
    
    port.onMessage.addListener((msg) => {
      if (msg.type === "STREAM_CHUNK") {
        accumulatedText += msg.chunk;
        textEl.value = accumulatedText;
        updateCharCount();
      } else if (msg.type === "STREAM_DONE") {
        setSource(msg.source === "openai" ? "GPT" : msg.source === "proxy" ? "Proxy" : "Mock");
        port.disconnect();
      } else if (msg.type === "STREAM_ERROR") {
        textEl.value = `ERROR: ${msg.error || "failed"}`;
        setSource("—");
        updateCharCount();
        port.disconnect();
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (!accumulatedText) {
        textEl.value = "ERROR: Connection lost";
        setSource("—");
        updateCharCount();
      }
    });
  };

  btnCheckSharp.onclick = () => {
    const text = textEl.value.trim();
    if (!text) return;
    
    // Close lengthen controls if open
    lengthenControls.style.display = "none";
    
    // Position shorten controls over the shorten button
    const shortenRect = btnCheckSharp.getBoundingClientRect();
    const containerRect = btnCheckSharp.parentElement.getBoundingClientRect();
    const relativeLeft = shortenRect.left - containerRect.left;
    const relativeTop = shortenRect.top - containerRect.top + shortenRect.height + 5;
    
    shortenControls.style.left = relativeLeft + "px";
    shortenControls.style.top = relativeTop + "px";
    shortenControls.style.display = "flex";
    
    // Pre-fill with default value (current text length)
    charLimitInput.value = text.length;
    charLimitInput.focus();
    charLimitInput.select(); // Select the text for easy editing
  };

  btnCheckLengthen.onclick = () => {
    const text = textEl.value.trim();
    if (!text) return;
    
    // Close shorten controls if open
    shortenControls.style.display = "none";
    
    // Position lengthen controls over the lengthen button
    const lengthenRect = btnCheckLengthen.getBoundingClientRect();
    const containerRect = btnCheckLengthen.parentElement.getBoundingClientRect();
    const relativeLeft = lengthenRect.left - containerRect.left;
    const relativeTop = lengthenRect.top - containerRect.top + lengthenRect.height + 5;
    
    lengthenControls.style.left = relativeLeft + "px";
    lengthenControls.style.top = relativeTop + "px";
    lengthenControls.style.display = "flex";
    
    // Pre-fill with default value (150% of current text length)
    const defaultTarget = Math.floor(text.length * 1.5);
    lengthenLimitInput.value = defaultTarget;
    lengthenLimitInput.focus();
    lengthenLimitInput.select(); // Select the text for easy editing
  };

  btnCopy.onclick = async () => {
    try { await navigator.clipboard.writeText(textEl.value); showToast(); } catch {}
  };

  // shorten with custom character limit or default behavior
  btnshortenGo.onclick = async () => {
    const text = textEl.value.trim();
    if (!text) return;
    
    const charLimit = parseInt(charLimitInput.value);
    
    // If no value or invalid value, use default behavior (no character limit)
    let messagePayload;
    if (!charLimit || charLimit <= 0) {
      // Default behavior - no character limit
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "shorten" };
    } else if (charLimit >= text.length) {
      // Show warning but proceed with default behavior
      charLimitInput.style.borderColor = "rgba(255,193,7,0.8)";
      setTimeout(() => { charLimitInput.style.borderColor = "rgba(255,255,255,0.2)"; }, 2000);
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "shorten" };
    } else {
      // Custom character limit
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "shorten", charLimit };
    }
    
    // Hide controls
    shortenControls.style.display = "none";
    setSource("…");
    textEl.value = "";
    
    const port = chrome.runtime.connect({ name: "grammar-stream" });
    port.postMessage(messagePayload);
    
    let accumulatedText = "";
    
    port.onMessage.addListener((msg) => {
      if (msg.type === "STREAM_CHUNK") {
        accumulatedText += msg.chunk;
        textEl.value = accumulatedText;
        updateCharCount();
      } else if (msg.type === "STREAM_DONE") {
        setSource(msg.source === "openai" ? "GPT" : msg.source === "proxy" ? "Proxy" : "Mock");
        port.disconnect();
      } else if (msg.type === "STREAM_ERROR") {
        textEl.value = `ERROR: ${msg.error || "failed"}`;
        setSource("—");
        updateCharCount();
        port.disconnect();
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (!accumulatedText) {
        textEl.value = "ERROR: Connection lost";
        setSource("—");
        updateCharCount();
      }
    });
  };

  // Lengthen with custom character limit or default behavior
  btnLengthenGo.onclick = async () => {
    const text = textEl.value.trim();
    if (!text) return;
    
    const targetLimit = parseInt(lengthenLimitInput.value);
    
    // If no value or invalid value, use default behavior (no character limit)
    let messagePayload;
    if (!targetLimit || targetLimit <= 0) {
      // Default behavior - no character limit
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "Lengthen" };
    } else if (targetLimit <= text.length) {
      // Show warning but proceed with default behavior
      lengthenLimitInput.style.borderColor = "rgba(255,193,7,0.8)";
      setTimeout(() => { lengthenLimitInput.style.borderColor = "rgba(255,255,255,0.2)"; }, 2000);
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "Lengthen" };
    } else {
      // Custom character limit
      messagePayload = { type: "GRAMMAR_CHECK_STREAM", text, mode: "Lengthen", charLimit: targetLimit };
    }
    
    // Hide controls
    lengthenControls.style.display = "none";
    setSource("…");
    textEl.value = "";
    
    const port = chrome.runtime.connect({ name: "grammar-stream" });
    port.postMessage(messagePayload);
    
    let accumulatedText = "";
    
    port.onMessage.addListener((msg) => {
      if (msg.type === "STREAM_CHUNK") {
        accumulatedText += msg.chunk;
        textEl.value = accumulatedText;
        updateCharCount();
      } else if (msg.type === "STREAM_DONE") {
        setSource(msg.source === "openai" ? "GPT" : msg.source === "proxy" ? "Proxy" : "Mock");
        port.disconnect();
      } else if (msg.type === "STREAM_ERROR") {
        textEl.value = `ERROR: ${msg.error || "failed"}`;
        setSource("—");
        updateCharCount();
        port.disconnect();
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (!accumulatedText) {
        textEl.value = "ERROR: Connection lost";
        setSource("—");
        updateCharCount();
      }
    });
  };

  function showToast() {
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, 1000);
  }

  reflectFab(); // set initial label based on initial state
  
  // Update character count on text input
  textEl.addEventListener("input", updateCharCount);
  textEl.addEventListener("paste", () => {
    // Small delay to ensure pasted content is processed
    setTimeout(updateCharCount, 10);
  });
  
  // Initial character count
  updateCharCount();
  
  // Add keyboard support for character limit input
  charLimitInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnshortenGo.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      shortenControls.style.display = "none";
    }
  });

  // Add keyboard support for lengthen limit input
  lengthenLimitInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnLengthenGo.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      lengthenControls.style.display = "none";
    }
  });

  // ======= Selection Tooltip (shows on text selection) =======
  let selectionTooltip = null;
  let selectedText = "";

  function createSelectionTooltip() {
    if (selectionTooltip) return selectionTooltip;
    
    const tooltip = document.createElement("div");
    tooltip.id = "__gc_selection_tooltip";
    tooltip.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
     Object.assign(tooltip.style, {
       position: "fixed",
       display: "none",
       background: "rgba(0,0,0,0.8)",
       color: "#fff",
       padding: "0",
       borderRadius: "50%",
       fontSize: "13px",
       fontWeight: "500",
       fontFamily: "system-ui",
       cursor: "pointer",
       zIndex: 2147483647,
       transition: "all 0.2s ease",
       opacity: "0",
       pointerEvents: "auto",
       border: "1px solid rgba(255,255,255,0.2)",
       backdropFilter: "blur(10px)",
       boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
       width: "32px",
       height: "32px",
       minWidth: "32px",
       minHeight: "32px",
       maxWidth: "32px",
       maxHeight: "32px"
     });
    
    tooltip.onmouseenter = () => {
      tooltip.style.background = "rgba(0,0,0,0.9)";
      tooltip.style.transform = "translateY(-1px)";
    };

    tooltip.onmouseleave = () => {
      tooltip.style.background = "rgba(0,0,0,0.8)";
      tooltip.style.transform = "translateY(0px)";
    };
    
    tooltip.onclick = (e) => {
      e.stopPropagation();
        if (selectedText) {
          textEl.value = selectedText;
          setSource("—");
          updateCharCount();
          // Hide any open controls when panel opens
          shortenControls.style.display = "none";
          lengthenControls.style.display = "none";
          showPanel();
        }
      hideSelectionTooltip();
    };
    
    document.body.appendChild(tooltip);
    selectionTooltip = tooltip;
    return tooltip;
  }

  function showSelectionTooltip(text, x, y) {
    const tooltip = createSelectionTooltip();
    selectedText = text;
    
    // Position above the selection with proper bounds checking (centered icon)
    const padding = 10;
    const tooltipWidth = 32; // Icon width
    const tooltipHeight = 32; // Icon height
    const tooltipX = Math.max(padding, Math.min(x - tooltipWidth/2, window.innerWidth - tooltipWidth - padding));
    const tooltipY = Math.max(padding, y - tooltipHeight - 4); // Closer gap like ChatGPT
    
    // Use fixed positioning for consistent placement across pages
    tooltip.style.position = "fixed";
    tooltip.style.left = tooltipX + "px";
    tooltip.style.top = tooltipY + "px";
    tooltip.style.display = "block";
    
    // Fade in
    setTimeout(() => {
      tooltip.style.opacity = "1";
    }, 10);
  }

  function hideSelectionTooltip() {
    if (selectionTooltip) {
      selectionTooltip.style.opacity = "0";
      setTimeout(() => {
        if (selectionTooltip) {
          selectionTooltip.style.display = "none";
        }
      }, 150);
    }
  }

  // Test mouse events
  document.addEventListener("click", (e) => {
  });

  // Also listen on the top window if we're in an iframe
  if (!IS_TOP) {
    window.top.document.addEventListener("click", (e) => {
    });
  }

  // Listen for text selection
  document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString()?.trim();
      
      if (text && text.length >= MIN_LEN) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Show tooltip near selection
          const x = rect.left + (rect.width / 2) - 75; // Center it
          const y = rect.top + window.scrollY;
          
          showSelectionTooltip(text, x, y);
        } catch (err) {
          // Fallback: show tooltip at mouse position
          showSelectionTooltip(text, e.clientX, e.clientY);
        }
      } else {
        hideSelectionTooltip();
      }
    }, 10);
  }, true);

  // Special handling for contentEditable elements (like rich text editors)
  document.addEventListener("selectionchange", (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString()?.trim();
      
      if (text && text.length >= MIN_LEN) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Show tooltip near selection
          const x = rect.left + (rect.width / 2) - 75;
          const y = rect.top + window.scrollY;
          
          showSelectionTooltip(text, x, y);
        } catch (err) {
        }
      } else {
        hideSelectionTooltip();
      }
    }, 50); // Slightly longer delay for contentEditable
  });

  // Polling fallback for stubborn sites
  let lastSelection = "";
  setInterval(() => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim() || "";
    
    if (text !== lastSelection) {
      lastSelection = text;
      
      if (text.length >= MIN_LEN) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          const x = rect.left + (rect.width / 2) - 75;
          const y = rect.top + window.scrollY;
          
          showSelectionTooltip(text, x, y);
        } catch (err) {
        }
      } else {
        hideSelectionTooltip();
      }
    }
  }, 200); // Check every 200ms

  // Also listen on the top window for text selection
  if (!IS_TOP) {
    window.top.document.addEventListener("mouseup", (e) => {
      setTimeout(() => {
        const selection = window.top.getSelection();
        const text = selection?.toString()?.trim();
        
        if (text && text.length >= MIN_LEN) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Show tooltip near selection (relative to top window)
            const x = rect.left + (rect.width / 2) - 75;
            const y = rect.top + window.top.scrollY;
            
            showSelectionTooltip(text, x, y);
          } catch (err) {
            showSelectionTooltip(text, e.clientX, e.clientY);
          }
        } else {
          hideSelectionTooltip();
        }
      }, 10);
    }, true);

    // Also listen for selection changes on top window
    window.top.document.addEventListener("selectionchange", (e) => {
      setTimeout(() => {
        const selection = window.top.getSelection();
        const text = selection?.toString()?.trim();
        
        if (text && text.length >= MIN_LEN) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Show tooltip near selection (relative to top window)
            const x = rect.left + (rect.width / 2) - 75;
            const y = rect.top + window.top.scrollY;
            
            showSelectionTooltip(text, x, y);
          } catch (err) {
          }
        } else {
          hideSelectionTooltip();
        }
      }, 50);
    });

    // Polling fallback for top window too
    let lastTopSelection = "";
    setInterval(() => {
      const selection = window.top.getSelection();
      const text = selection?.toString()?.trim() || "";
      
      if (text !== lastTopSelection) {
        lastTopSelection = text;
        
        if (text.length >= MIN_LEN) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const x = rect.left + (rect.width / 2) - 75;
            const y = rect.top + window.top.scrollY;
            
            showSelectionTooltip(text, x, y);
          } catch (err) {
          }
        } else {
          hideSelectionTooltip();
        }
      }
    }, 200);
  }

  // Hide tooltip when clicking elsewhere
  document.addEventListener("mousedown", (e) => {
    if (selectionTooltip && !selectionTooltip.contains(e.target)) {
      hideSelectionTooltip();
    }
  }, true);

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

  // No longer needed - using selection tooltip instead

})();
