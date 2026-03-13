# Chrome Web Store Publish Guide (Cleen)

Last updated: March 12, 2026

## 1) Prerequisites

- Chrome Web Store developer account
- One-time developer registration fee paid in the Chrome Web Store Developer Dashboard
- Product website (optional but recommended):
  `https://cleen-beta.vercel.app`

## 2) Package the extension

Run:

```bash
bash scripts/package-webstore.sh
```

Output example:

```bash
dist/cleen-0.1.0.zip
```

The uploaded ZIP must contain `manifest.json` at the root of the archive.

## 3) Store listing copy

Use:

- `docs/WEBSTORE_LISTING_COPY.md`

## 4) Privacy and reviewer materials

- Privacy policy URL:
  `https://raw.githubusercontent.com/HOYALIM/cleen/main/PRIVACY_POLICY.md`
- Product website:
  `https://cleen-beta.vercel.app`

## 5) Image assets ready for the dashboard

Chrome's official listing guidance says:

- Screenshot:
  `docs/store-assets/screenshot-1.png`
- Small promo tile:
  `docs/store-assets/small-promo-tile.png`
- Marquee image:
  `docs/store-assets/marquee-promo-tile.png`
- Screenshot size requirement: `1280x800` or `640x400`
- Small promo tile size requirement: `440x280`
- Marquee image size requirement: `1400x560`

## 6) Dashboard flow

Official publish flow:

1. Open the Chrome Web Store Developer Dashboard
2. Click `Add new item`
3. Upload the ZIP file
4. Fill out Store Listing, Privacy, Distribution, and Test Instructions if needed
5. Click `Submit for review`

## 7) Cleen-specific submission notes

- Keep the single purpose focused on Chrome tab memory management.
- Do not overstate the accuracy of per-tab memory numbers; they may be estimated in some environments.
- Explain that all data handling is local-only and no remote code is used.
