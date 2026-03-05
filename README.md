# Cleen

**Keep Chrome's memory usage under control.** Automatically suspends inactive tabs and shows a clean memory dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Screenshots

> _Coming soon_

## Install from source

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `cleen/` folder

## How it works

- **Auto-suspend** — Tabs inactive for 30+ minutes are automatically discarded, freeing RAM instantly
- **Memory dashboard** — Click the extension icon to see which tabs use the most memory
- **Heavy tab detection** — YouTube, Claude, ChatGPT, and other known heavy sites are flagged in the dashboard

## Note on memory measurement

Cleen attempts to use Chrome's `processes` API for accurate per-tab memory data. This API is only available for enterprise-installed extensions or in developer mode. When unavailable, Cleen shows estimated values (marked with "est." in the UI). Memory numbers shown as estimates are rough approximations.

## Privacy

Cleen stores data locally only. No data ever leaves your browser. No accounts, no analytics, no network requests.

## License

[MIT](LICENSE)
