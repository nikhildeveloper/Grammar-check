# Project Structure

## 📁 Modularized File Organization

```
GrammarCheck/
├── manifest.json                    # Extension configuration
├── options.html/js                  # Settings page
│
├── background/
│   └── service_worker.js           # Main background worker (imports modules)
│
├── content/
│   ├── content.js                  # Main content script (imports modules)
│   ├── ui.js                       # UI creation & styling
│   └── handlers.js                 # Event handlers
│
└── lib/
    ├── prompts.js                  # System prompts for AI
    ├── settings.js                 # Settings management
    ├── grammarService.js           # Grammar checking logic
    └── streaming.js                # Streaming grammar check
```

## 📦 Module Breakdown

### Background (Service Worker)
```
background/service_worker.js
  ├── imports lib/grammarService.js
  ├── imports lib/streaming.js
  └── imports lib/settings.js
```

**Responsibilities:**
- Extension lifecycle management
- Message handling
- Grammar checking coordination
- Streaming coordination

### Content Script
```
content/content.js
  ├── imports content/ui.js
  └── imports content/handlers.js
```

**Responsibilities:**
- Main content script orchestration
- Selection monitoring
- Panel management

### Libraries (Shared Code)

**lib/prompts.js**
- System prompts for Human & Professional modes
- Easy to add new modes

**lib/settings.js**
- Settings retrieval
- Mock correction logic
- Default values

**lib/grammarService.js**
- Standard grammar checking
- OpenAI API integration
- Proxy support

**lib/streaming.js**
- Streaming grammar checking
- Real-time text generation
- Stream parsing

**content/ui.js**
- Panel creation
- FAB creation
- HUD creation
- Styling injection

**content/handlers.js**
- Streaming handlers
- Copy handler
- Monitor toggle
- Drag-and-drop logic

## 🔄 How It Works

### 1. User clicks "Human" button
```
content/content.js
  → content/handlers.js (createStreamingHandler)
  → chrome.runtime.connect()
  → background/service_worker.js
  → lib/streaming.js (grammarCheckStream)
  → lib/prompts.js (get prompt)
  → lib/settings.js (get API key)
  → OpenAI API
  → Stream back to content script
```

### 2. Adding a new tone mode
```
1. Add prompt to lib/prompts.js:
   PROMPTS.Casual = "..."

2. Add button in content/ui.js:
   <button id="gc-check-casual">Casual</button>

3. Wire handler in content/content.js:
   btnCheckCasual.onclick = createStreamingHandler(..., "Casual")

Done! ✅
```

## ✅ Benefits of This Structure

1. **Modular** - Each file has one responsibility
2. **Maintainable** - Easy to find and fix bugs
3. **Scalable** - Easy to add new features
4. **Reusable** - Shared code in lib/
5. **Chrome Compatible** - Uses ES6 modules properly
6. **Small Files** - No file over 150 lines

## 🚀 Chrome Extension Compatibility

- Uses `type: "module"` in manifest for service worker
- Content scripts import modules
- All modules use ES6 import/export
- Works in Chrome 91+

## 📝 Migration Notes

**Old structure:**
- content.js (278 lines)
- service_worker.js (314 lines)

**New structure:**
- Largest file: 150 lines
- Average file: 80 lines
- Total: 10 files (better organized)

