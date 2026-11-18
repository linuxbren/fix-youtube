# Fix YouTube

Inspired by Omarchy, developed on Omarchy. We can fix ANYTHING

A small Chromium extension that lets you force autoplay, closed captions, and theater mode on or off on YouTube, or hide those player buttons.

Created by Brenden Dawson ([linuxbren](https://github.com/linuxbren)).

## Features

Each setting can be left alone, forced on, forced off, or hidden:

- **Player view** — theater mode vs default view
- **Closed captions** — the player’s CC / subtitles button
- **Autoplay** — the “play next video” toggle on the watch page

Settings are saved with `chrome.storage.sync` (they follow your browser profile) and apply on the current YouTube tab without a reload. When you open a new video, or YouTube navigates between videos without a full page load, the extension reapplies your choices.

No tracking, no accounts, no external requests. The only permission is `storage`, plus a host match for `https://www.youtube.com/*`.

## Install in Chrome (or Brave, Edge, and other Chromium browsers)

1. Download this folder (or unzip `fix-youtube.zip`).
2. Open `chrome://extensions` in the address bar (on Edge, use `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select this folder — the one that contains `manifest.json`.

The Fix YouTube icon should appear in the toolbar. Pin it if you want it always visible, then open a YouTube watch page and pick your settings in the popup.

To update later, replace the files in the same folder and click **Reload** on the extension card.

## How settings work

- **Leave alone** — the extension does not change that control.
- **Force on / Force off** (or always theater / always default view) — shortly after a video loads, the extension reads the control’s current state and clicks it once if needed. It may correct itself once or twice if YouTube applies its own preference a moment later, then it stops. If you change the control by hand, the extension leaves it until the next video or until you change the setting in the popup.
- **Hide button** — the control is hidden with injected CSS. Hiding does not change whether the feature is on or off; pick force on/off if you also want a specific state.

## Permissions

- `storage` — saves your three settings.
- Host match `https://www.youtube.com/*` — so the content script can run on YouTube watch pages.

## Limitations

- Aimed at regular watch pages (`youtube.com/watch`). Shorts, embeds, YouTube Music, and the mobile site are not targeted.
- Theater mode is not available in every layout (for example a narrow window, or while fullscreen). The extension will not exit fullscreen to change the view.
- Captions cannot be forced on if the video has no caption track.
- YouTube changes its player markup from time to time. If a toggle stops working, the selectors in `content.js` may need a small update.
- Force settings are applied when a video loads and when you change them in the popup. They are not continuously enforced mid-video, so a late YouTube UI reset is possible on a long playback.

## Icon

The toolbar icon uses the **outer rim** of the [Omarchy](https://omarchy.org/) logo — the official geometric mark published on [Omarchy’s brand page](https://omarchy.org/brand/) as [`omarchy-logo.svg`](https://omarchy.org/brand/omarchy-logo.svg) (the same mark as [`https://omarchy.org/icon.svg`](https://omarchy.org/icon.svg)). Inner channels, hooks, and the inner window frame are omitted. The rim is recolored YouTube red (`#FF0000`), and a white play triangle with a black outline sits in the opening, on a transparent background, so the arrow stays visible on light toolbars.

Omarchy is a **pending trademark**. The brand page states: “Omarchy is a pending trademark. All rights reserved.” Partner inquiries go to [foundation@omarchy.org](mailto:foundation@omarchy.org). The [Omarchy software repository](https://github.com/basecamp/omarchy) is MIT-licensed; that license covers the software, not trademark rights in the name or logo. This icon is an unofficial derivative and does not imply affiliation with Omarchy, DHH, or 37signals. Get permission from the trademark holder before a public store listing or other wide distribution.

Icon PNGs (16, 48, 128, and a 512-pixel store source) can be regenerated with:

```bash
python3 generate_icons.py
```

## Development

Validate syntax:

```bash
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
node --check shared.js
node --check content.js
node --check popup.js
```

## Privacy

Fix YouTube does not collect data. The privacy policy is at [linuxbren.github.io/fix-youtube/privacy.html](https://linuxbren.github.io/fix-youtube/privacy.html).

## License

MIT License. Copyright (c) 2026 Brenden Dawson.

The extension’s own code is MIT. The Omarchy mark used in the icon is not; see [Icon](#icon) above.
