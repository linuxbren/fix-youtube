'use strict';

const form = document.getElementById('settings');
const statusEl = document.getElementById('status');
let statusTimer = null;

function showStatus(message) {
  statusEl.textContent = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '';
  }, 1500);
}

function applyToForm(settings) {
  for (const key of Object.keys(YT_TOGGLES_DEFAULTS)) {
    const value = settings[key];
    const input = form.querySelector(`input[name="${key}"][value="${value}"]`);
    if (input) input.checked = true;
  }
}

function readForm() {
  const raw = {};
  for (const key of Object.keys(YT_TOGGLES_DEFAULTS)) {
    const input = form.querySelector(`input[name="${key}"]:checked`);
    raw[key] = input ? input.value : YT_TOGGLES_DEFAULTS[key];
  }
  return normalizeYtTogglesSettings(raw);
}

function saveSettings() {
  const settings = readForm();
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = 'Could not save settings.';
      return;
    }
    showStatus('Saved');
  });
}

chrome.storage.sync.get(YT_TOGGLES_DEFAULTS, (raw) => {
  applyToForm(normalizeYtTogglesSettings(raw));
});

form.addEventListener('change', saveSettings);
