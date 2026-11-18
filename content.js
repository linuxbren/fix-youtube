'use strict';

/**
 * Fix YouTube — content script
 *
 * Force/hide autoplay, captions, and theater mode on youtube.com watch pages.
 * Settings are applied once after each video load (and when the popup changes
 * them). After a short settle window we stop clicking so we do not fight the
 * user if they change a control by hand.
 */
(() => {
  const APPLY_WINDOW_MS = 5000;
  const CLICK_COOLDOWN_MS = 600;
  const MAX_CORRECTIONS = 2;
  const POLL_MS = 400;

  const AUTOPLAY_SELECTORS = [
    '.ytp-autonav-toggle-button[role="switch"]',
    '.ytp-autonav-toggle-button[aria-checked]',
    '.ytp-autonav-toggle-button',
    '.ytp-autonav-toggle-button-container [role="switch"]',
    'ytd-compact-autoplay-renderer tp-yt-paper-toggle-button#toggle',
    'ytd-compact-autoplay-renderer #toggle',
    'ytd-compact-autoplay-renderer [role="switch"]',
  ];

  const CAPTIONS_SELECTORS = [
    'button.ytp-subtitles-button',
    '.ytp-subtitles-button.ytp-button',
    '.ytp-subtitles-button',
  ];

  const SIZE_SELECTORS = [
    'button.ytp-size-button',
    '.ytp-size-button.ytp-button',
    '.ytp-size-button',
  ];

  let settings = normalizeYtTogglesSettings(YT_TOGGLES_DEFAULTS);
  let applyToken = 0;
  let observer = null;
  let pollTimer = null;
  let navTimer = null;
  const pending = { autoplay: false, captions: false, view: false };
  const corrections = { autoplay: 0, captions: 0, view: 0 };

  function isWatchPage() {
    return location.pathname === '/watch';
  }

  function isUsable(el) {
    if (!el || !el.isConnected) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    if (el.classList.contains('ytp-subtitles-button-unavailable')) return false;
    if (el.classList.contains('ytp-button-unavailable')) return false;
    return true;
  }

  function firstUsable(selectors) {
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const el of nodes) {
        if (isUsable(el)) return el;
      }
    }
    return null;
  }

  function isToggleOn(el) {
    if (!el) return null;

    const checked = el.getAttribute('aria-checked');
    if (checked === 'true') return true;
    if (checked === 'false') return false;

    const pressed = el.getAttribute('aria-pressed');
    if (pressed === 'true') return true;
    if (pressed === 'false') return false;

    if (el.classList.contains('ytp-autonav-toggle-button-checked')) return true;
    // When the autonav button has no aria state, the checked class is the on flag.
    if (el.classList.contains('ytp-autonav-toggle-button')) return false;

    const checkedAttr = el.getAttribute('checked');
    if (checkedAttr !== null && checkedAttr !== 'false') return true;

    if (typeof el.checked === 'boolean') return el.checked;

    const child = el.querySelector('[aria-checked], [aria-pressed]');
    if (child && child !== el) return isToggleOn(child);

    return null;
  }

  function getFlexy() {
    return document.querySelector('ytd-watch-flexy');
  }

  function isTheaterOn() {
    const flexy = getFlexy();
    if (!flexy) return null;
    return flexy.hasAttribute('theater');
  }

  function isFullscreen() {
    const flexy = getFlexy();
    if (flexy && flexy.hasAttribute('fullscreen')) return true;
    return Boolean(document.fullscreenElement);
  }

  function clickControl(name, el) {
    if (!el || pending[name]) return;
    if (corrections[name] >= MAX_CORRECTIONS) return;
    pending[name] = true;
    corrections[name] += 1;
    try {
      el.click();
    } catch (err) {
      pending[name] = false;
      return;
    }
    setTimeout(() => {
      pending[name] = false;
    }, CLICK_COOLDOWN_MS);
  }

  function applyForces() {
    if (!isWatchPage()) return;

    if (settings.autoplay === 'on' || settings.autoplay === 'off') {
      const el = firstUsable(AUTOPLAY_SELECTORS);
      const current = isToggleOn(el);
      if (el && current !== null && current !== (settings.autoplay === 'on')) {
        clickControl('autoplay', el);
      }
    }

    if (settings.captions === 'on' || settings.captions === 'off') {
      const el = firstUsable(CAPTIONS_SELECTORS);
      const current = isToggleOn(el);
      if (el && current !== null && current !== (settings.captions === 'on')) {
        clickControl('captions', el);
      }
    }

    if (settings.view === 'theater' || settings.view === 'default') {
      if (!isFullscreen()) {
        const theater = isTheaterOn();
        const desired = settings.view === 'theater';
        if (theater !== null && theater !== desired) {
          const btn = firstUsable(SIZE_SELECTORS);
          if (btn) clickControl('view', btn);
        }
      }
    }
  }

  function needsForce() {
    return (
      settings.autoplay === 'on' ||
      settings.autoplay === 'off' ||
      settings.captions === 'on' ||
      settings.captions === 'off' ||
      settings.view === 'theater' ||
      settings.view === 'default'
    );
  }

  function stopApplyWindow() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startApplyWindow() {
    applyToken += 1;
    const token = applyToken;
    corrections.autoplay = 0;
    corrections.captions = 0;
    corrections.view = 0;
    pending.autoplay = false;
    pending.captions = false;
    pending.view = false;

    stopApplyWindow();
    updateHideStyles();

    if (!needsForce() || !isWatchPage()) return;

    const deadline = Date.now() + APPLY_WINDOW_MS;

    const tick = () => {
      if (token !== applyToken) return;
      if (Date.now() > deadline) {
        stopApplyWindow();
        return;
      }
      applyForces();
    };

    observer = new MutationObserver(tick);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    pollTimer = setInterval(tick, POLL_MS);
    tick();

    setTimeout(() => {
      if (token === applyToken) stopApplyWindow();
    }, APPLY_WINDOW_MS + 50);
  }

  function hideCss() {
    const rules = [];

    if (settings.autoplay === 'hide') {
      rules.push(`
        .ytp-autonav-toggle-button-container,
        .ytp-autonav-toggle-button,
        ytd-compact-autoplay-renderer #toggle,
        ytd-compact-autoplay-renderer tp-yt-paper-toggle-button,
        ytd-compact-autoplay-renderer [role="switch"] {
          display: none !important;
        }
      `);
    }

    if (settings.captions === 'hide') {
      rules.push(`
        button.ytp-subtitles-button,
        .ytp-subtitles-button {
          display: none !important;
        }
      `);
    }

    if (settings.view === 'hide') {
      rules.push(`
        button.ytp-size-button,
        .ytp-size-button {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }

  function updateHideStyles() {
    let style = document.getElementById('yt-toggles-hide-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yt-toggles-hide-css';
      (document.head || document.documentElement).appendChild(style);
    }
    const css = hideCss();
    if (style.textContent !== css) style.textContent = css;
  }

  function adoptSettings(raw) {
    settings = normalizeYtTogglesSettings(raw);
    startApplyWindow();
  }

  function onNavigate() {
    if (navTimer) clearTimeout(navTimer);
    navTimer = setTimeout(() => {
      startApplyWindow();
    }, 50);
  }

  function loadAndStart() {
    chrome.storage.sync.get(YT_TOGGLES_DEFAULTS, (raw) => {
      adoptSettings(raw);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!changes.autoplay && !changes.captions && !changes.view) return;
    const next = { ...settings };
    for (const key of ['autoplay', 'captions', 'view']) {
      if (changes[key]) next[key] = changes[key].newValue;
    }
    adoptSettings(next);
  });

  document.addEventListener('yt-navigate-finish', onNavigate, true);
  window.addEventListener('yt-navigate-finish', onNavigate, true);
  document.addEventListener('yt-page-data-updated', onNavigate, true);
  window.addEventListener('yt-page-data-updated', onNavigate, true);

  loadAndStart();
})();
