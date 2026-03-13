# Cleen

**Keep Chrome's memory usage under control.** Automatically suspends inactive tabs and shows a clean memory dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Screenshots

> _Coming soon_

## Install From GitHub ZIP

1. Download the latest source ZIP from GitHub:
   - <https://github.com/HOYALIM/cleen/archive/refs/heads/main.zip>
2. Unzip the archive.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** (top right).
5. Click **Load unpacked**.
6. Select the unzipped `cleen-main` folder.

## Package For Chrome Web Store

```bash
bash scripts/package-webstore.sh
```

Generated zip:
- `dist/cleen-0.1.0.zip`

## How it works

- **Auto-suspend** — Tabs inactive for 30+ minutes are automatically discarded, freeing RAM instantly
- **Memory dashboard** — Click the extension icon to see which tabs use the most memory
- **Heavy tab detection** — YouTube, Claude, ChatGPT, and other known heavy sites are flagged in the dashboard
- **Custom exclusions** — Set which sites should never be auto-suspended

## Permissions

Cleen requires the following permissions:

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | To save your settings and session statistics locally |
| `alarms` | To run periodic memory checks in the background |
| `scripting` | To read memory usage from web pages via `performance.memory` API |
| `host_permissions (*://*/*)` | To run the in-page memory check on tabs the user already has open |

**Note:** Memory usage can be estimated in some environments. Cleen does not send tab or memory data to external servers.

## Privacy

Cleen stores data locally only. No data ever leaves your browser. No accounts, no analytics, no network requests.

Privacy policy:
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## License

[MIT](LICENSE)
