---
description: Build and publish a new release to Cloudflare Pages
agent: build
---

Build and publish a new release. Steps:

1. Read the current version from src-tauri/tauri.conf.json to determine the new version
2. Bump version in:
   - src-tauri/tauri.conf.json (version field)
   - package.json (version field)
   - src/widgets/sidebar/ui/Sidebar.tsx (version in sidebar footer)
3. Run `npm run build:release` to build the Tauri app with signing
4. Run `npm run publish:update` to deploy updater artifacts to Cloudflare Pages
5. Verify the deployment at https://main.bank-sampah-updates.pages.dev/latest.json

The signing key password is "banksampah2026" and the key is stored in .env.

If the build fails due to file locks, run the build-with-retry script again.
