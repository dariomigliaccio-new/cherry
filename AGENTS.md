# Repository Guidelines

## Project Structure & Module Organization

This repository is a Node.js/Express website for Cherry Street Commons. The main application entry point is `server.js`, which renders pages, serves static assets, handles admin sessions, and reads/writes site content. Editable structured content lives in `data/site-content.json`. Public frontend files are organized under `public/`: `public/css/styles.css` for the main site, `public/css/admin.css` for admin styling, `public/js/site.js` for browser behavior, `public/assets/` for site imagery, and `public/uploads/` for uploaded media. Official logo assets are served from `images/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Express server locally.
- `npm start`: start the same server for production-style local runs.

The app defaults to `http://localhost:3000`. Use `PORT=3001 npm run dev` when port 3000 is already in use. Runtime configuration can be supplied with environment variables such as `CONTENT_FILE`, `ADMIN_USER`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.

## Coding Style & Naming Conventions

Use CommonJS JavaScript, matching the existing `require(...)` style. Keep indentation at two spaces in JSON and JavaScript. Prefer small helper functions in `server.js` for rendering or content normalization logic. Use kebab-case for CSS classes and asset filenames, for example `announcement-bar` or `hero-cherry.png`. Keep user-facing copy in `data/site-content.json` when possible instead of hard-coding it in templates.

## Testing Guidelines

There is no automated test suite configured yet. Before submitting changes, run `npm run dev` and manually verify affected routes such as `/`, `/about`, `/community`, `/eligibility`, `/neiborhub`, and `/floor-plans`. For visual or CSS changes, check both desktop and mobile widths. For content or upload changes, verify that `data/site-content.json` remains valid JSON and that uploaded media resolves from `public/uploads/`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subject lines such as `Increase map height` and `Slow announcement ticker`. Follow that style: keep the first line concise and describe the visible behavior changed. Pull requests should include a brief summary, testing notes, affected routes, and screenshots for layout or visual changes. Link any related issue or deployment task when available.

## Security & Configuration Tips

Do not commit real credentials. Override default admin and session values with environment variables outside the repository. Treat `public/uploads/` as user-managed content and avoid checking in large or sensitive uploaded files unless they are intentional site assets.

## Deployment & Hosting

The production host is a Hostinger Ubuntu VPS at `2.24.96.87` (`srv1666945`). The deployed checkout is `/var/www/cherry-street-commons`, and its `origin` is `https://github.com/dariomigliaccio-new/cherry.git`. Deployment is currently manual; there is no GitHub Actions workflow. Before deploying, compare the local, GitHub, and server commit hashes and preserve server-managed content and uploads.

The Express application runs under PM2 as `cherry-street-commons` with `PORT=3012`. PM2 is restored at boot by `pm2-root.service`; after starting or changing the process, run `pm2 save`. Nginx terminates HTTPS and proxies requests to `127.0.0.1:3012`. Validate changes with `nginx -t` before reloading Nginx. A `502 Bad Gateway` normally means the PM2 process is absent or nothing is listening on port `3012`.

The official domains are `1244cherry.com` and `www.1244cherry.com`. They intentionally return HTTP `503` with the under-construction page. The temporary preview domains are `logmed.cloud` and `www.logmed.cloud`; they expose the complete site and should return HTTP `200`. The content manager is available at `https://logmed.cloud/manager/login`. This host-specific behavior is implemented in the early middleware in `server.js`.

Both domain pairs resolve to the same VPS and use Let's Encrypt certificates managed by Certbot. Active Nginx configurations are `cherry-street-commons` and `logmed` under `/etc/nginx/sites-enabled/`. The former `cardmatch` configuration for `logmed.cloud` was disabled because it conflicted with `logmed` and targeted inactive ports. Dated backups are retained under `/etc/nginx/sites-available/`; keep them available for reversal but never place backup files in `sites-enabled`, because Nginx loads every file in that directory.

After deployment, verify at minimum:

- `https://logmed.cloud/`, `/about`, and `/manager/login` return `200`.
- Preview CSS and images return `200`.
- `https://1244cherry.com/` continues to return the intentional `503`.
- `pm2 status cherry-street-commons` reports `online` and port `3012` is listening.

As of June 22, 2026, local, GitHub, and VPS are in sync. Deploy is automated via GitHub Actions (`.github/workflows/deploy.yml`): every push to `main` triggers `git pull` + `pm2 restart` on the VPS automatically.
