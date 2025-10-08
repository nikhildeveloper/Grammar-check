(async function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    mode: Array.from(document.querySelectorAll('input[name="apiMode"]')),
    apiUrl: $("apiUrl"),
    apiKey: $("apiKey"),
    model: $("model"),
    save: $("save"),
    reset: $("reset")
  };

  // Load saved settings
  const st = await chrome.storage.local.get(["apiMode", "apiUrl", "apiKey", "model"]);
  if (st.apiMode) {
    const r = document.querySelector(`input[name="apiMode"][value="${st.apiMode}"]`);
    if (r) r.checked = true;
  }
  els.apiUrl.value = st.apiUrl || "";
  els.apiKey.value = st.apiKey || "";
  els.model.value = st.model || "";

  // Save
  els.save.addEventListener("click", async () => {
    const apiMode = els.mode.find(r => r.checked)?.value || "";
    const payload = {
      apiMode,
      apiUrl: els.apiUrl.value.trim(),
      apiKey: els.apiKey.value.trim(),
      model: els.model.value.trim()
    };
    await chrome.storage.local.set(payload);
    alert("Saved!");
  });

  // Reset
  els.reset.addEventListener("click", async () => {
    await chrome.storage.local.remove(["apiMode", "apiUrl", "apiKey", "model"]);
    alert("Reset. The extension will use mock corrections until you configure an API.");
    location.reload();
  });
})();
