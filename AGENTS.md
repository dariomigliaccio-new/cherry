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
