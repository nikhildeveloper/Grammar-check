# Universal Input Text Detector


## Install (Developer Mode)
1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** and select the `input-detector/` folder
4. Click the toolbar icon to toggle ON/OFF (badge shows ON/OFF)


## What it captures
- `input[type=text|search|email|url|tel|number]`
- `textarea`
- `[contenteditable]` (including many Shadow DOMs via `attachShadow` patch)
- Dynamically added elements via `MutationObserver`
- Frames/iframes when permitted (`all_frames: true`)


## What it **does not** capture
- `input[type=password]`, `input[type=file]`, hidden fields (skipped by design)
- Closed Shadow DOMs (MV3 cannot pierce closed roots)


## Sending data elsewhere
In `service_worker.js`, replace the `console.log` with a `fetch` to your endpoint. For example:


```js
fetch("https://your-endpoint.example/ingest", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ event: "INPUT_DETECTED", payload })
});
