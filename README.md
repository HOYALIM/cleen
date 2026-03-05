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
- **Custom exclusions** — Set which sites should never be auto-suspended

## Permissions

Cleen requires the following permissions:

| Permission | Why it's needed |
|------------|-----------------|
| `tabs` | To query open tabs and detect which sites are active |
| `processes` | To get accurate per-tab memory usage (when available) |
| `storage` | To save your settings and session statistics locally |
| `alarms` | To run periodic memory checks in the background |
| `scripting` | To read memory usage from web pages via `performance.memory` API |

**Note:** The `processes` API is only available for enterprise-installed extensions or in developer mode. When unavailable, Cleen uses `performance.memory` from each page as an alternative, with estimates as fallback.

## Privacy

Cleen stores data locally only. No data ever leaves your browser. No accounts, no analytics, no network requests.

## License

[MIT](LICENSE)
