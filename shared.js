'use strict';

const YT_TOGGLES_DEFAULTS = Object.freeze({
  autoplay: 'leave',
  captions: 'leave',
  view: 'leave',
});

const YT_TOGGLES_VALUES = Object.freeze({
  autoplay: Object.freeze(['leave', 'on', 'off', 'hide']),
  captions: Object.freeze(['leave', 'on', 'off', 'hide']),
  view: Object.freeze(['leave', 'theater', 'default', 'hide']),
});

function normalizeYtTogglesSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const key of Object.keys(YT_TOGGLES_DEFAULTS)) {
    const allowed = YT_TOGGLES_VALUES[key];
    out[key] = allowed.includes(src[key]) ? src[key] : YT_TOGGLES_DEFAULTS[key];
  }
  return out;
}

if (typeof globalThis !== 'undefined') {
  globalThis.YT_TOGGLES_DEFAULTS = YT_TOGGLES_DEFAULTS;
  globalThis.YT_TOGGLES_VALUES = YT_TOGGLES_VALUES;
  globalThis.normalizeYtTogglesSettings = normalizeYtTogglesSettings;
}
