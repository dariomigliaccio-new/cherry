# Cherry Street Commons — Project Reference

Complete operational guide for AI assistants and developers. Read this before making any change.

---

## Project Overview

Affordable housing marketing website for **Cherry Street Commons** — 33-unit development at 1244 Cherry Street, San Carlos, CA. The site informs prospective residents, shows floor plans, amenities, eligibility requirements, and drives applications via HavenConnect.

---

## Repository

- **GitHub:** `https://github.com/dariomigliaccio-new/cherry.git`
- **Local clone:** `/Users/dariomigliaccio/Library/Mobile Documents/com~apple~CloudDocs/Cherry-Street-Commons/`
- **Default branch:** `main`
- **Git user:** Dario Migliaccio Ávila (`dariomigliaccio@gmail.com`)

---

## Infrastructure

| Item | Value |
|------|-------|
| VPS provider | Hostinger Ubuntu |
| VPS IP | `2.24.96.87` (hostname: `srv1666945`) |
| Server path | `/var/www/cherry-street-commons` |
| App port | `3012` |
| Process manager | PM2 — process name `cherry-street-commons` (id 1) |
| Web server | Nginx (reverse proxy on 80/443) |
| SSH key (local) | `~/.ssh/cherry_deploy` — **NEVER display contents** |
| SSH user | `root` |

### SSH access
```bash
ssh -i ~/.ssh/cherry_deploy root@2.24.96.87
```

### PM2 commands
```bash
pm2 status
pm2 restart cherry-street-commons
pm2 logs cherry-street-commons --lines 50 --nostream
pm2 save   # run after any process change
```

### Nginx configs (sites-enabled)
- `cherry-street-commons` → proxies `1244cherry.com` / `www.1244cherry.com` → port 3012
- `logmed` → proxies `logmed.cloud` / `www.logmed.cloud` → port 3012
- `ameizze-express` → unrelated other app on the same VPS (id 0 in PM2, port unknown)

Never put backup files in `/etc/nginx/sites-enabled/` — Nginx loads everything there.

---

## Domains

| Domain | Status | Purpose |
|--------|--------|---------|
| `1244cherry.com` | Returns 503 intentionally | Production — under construction |
| `www.1244cherry.com` | Returns 503 intentionally | Production — under construction |
| `logmed.cloud` | Returns 200 — full site | Preview / staging |
| `www.logmed.cloud` | Returns 200 — full site | Preview / staging |

The under-construction gate is in `server.js` early middleware: it passes `logmed.cloud` / `www.logmed.cloud` hosts and blocks all others with a 503 page.

**Manager URL:** `https://logmed.cloud/manager/login`

---

## Automated Deploy (GitHub Actions)

File: `.github/workflows/deploy.yml`

Triggers on every push to `main`. Steps:
1. Write `DEPLOY_KEY` secret to `~/.ssh/deploy_key`
2. `ssh-keyscan` the VPS IP into `known_hosts`
3. SSH in and run `git pull origin main && pm2 restart cherry-street-commons`

The `DEPLOY_KEY` GitHub secret contains the private key from `~/.ssh/cherry_deploy`. It was set with:
```bash
gh secret set DEPLOY_KEY < ~/.ssh/cherry_deploy
```

Deploy takes ~10-15 seconds. If it fails with exit code 1, check for a transient SSH issue — run `git pull` + `pm2 restart` manually on the VPS as fallback.

**Important:** `data/site-content.json` is tracked by git but managed server-side (never committed). Git pull won't conflict on it because commits never touch that file. If a conflict does occur, stash or restore it.

---

## Tech Stack

- **Runtime:** Node.js ≥18, CommonJS (`require`)
- **Framework:** Express 4
- **Sessions:** `express-session` (cookie-based, `req.session.admin`)
- **File uploads:** `multer` v2
- **Frontend:** Vanilla JS + CSS (no framework, no build step)
- **Fonts:** Inter via Google Fonts
- **Map:** Leaflet.js (OpenStreetMap)
- **No test suite** — manual verification after changes

---

## File Structure

```
server.js              — entire app: routes, rendering, admin, middleware
data/
  site-content.json    — all editable content (server-managed, NOT committed)
public/
  css/
    styles.css         — main site styles
    admin.css          — admin panel styles
  js/
    site.js            — browser JS: menu, slider, map, floor plan lightbox
    admin.js           — admin tab navigation (vanilla IIFE)
  assets/              — site imagery
  uploads/             — user-uploaded media (multer destination)
images/                — official logo assets served at /images/
.github/
  workflows/
    deploy.yml         — GitHub Actions deploy
AGENTS.md              — this file
```

---

## server.js Architecture

The entire app is one file. Key sections:

### Content loading
- `loadData()` reads `data/site-content.json` on **every request** — no server restart needed for content changes.
- `getByPath(obj, path)` / `setByPath(obj, path, value)` use dot-notation paths like `pages./about.news.0.title`.

### Helper functions
- `esc(value)` — HTML-escapes a value. **Handles arrays safely** (takes first element if array, avoiding corruption when JSON fields accidentally become arrays).
- `splitLines(text)` — splits textarea content on newlines.
- `field(label, name, data, type)` — renders a form input for the manager.
- `imageField(label, name, data)` — renders file upload + current value + "Remove image" checkbox.
- `svgField(label, name, data)` — renders SVG code paste textarea (stores as `data:` prefix).
- `checkboxField(label, name, data)` — renders a checkbox.

### Page rendering functions
Each route has a dedicated render function:
- `renderHero(page)` — home page hero with slideshow
- `renderHomeIntro(data)` — "Welcome Home" section + cards
- `renderNewsSection(page)` — About page: featured article + 3-col grid with More details button
- `renderPropertyDetails(page)` — Property Details: occupancy counter + feature checklist
- `renderAmenities(page)` — Amenities: icon grid
- `renderEligibility(page)` — Eligibility: income table + requirements
- `renderNeighborhood(page)` — Neighborhood: map + cards
- `renderFloorPlans(page)` — Floor Plans: plan cards with zoom lightbox
- `renderFooter(data)` — site footer

### Shell function
`shell(title, content, data, activePath, home)` wraps all pages in the common HTML shell (head, announcement bar, header, side menu, footer). Builds two nav lists:
- `nav` — desktop nav including Apply Now button
- `mobileNav` — mobile side menu nav **without** Apply Now

### Admin POST handler
`app.post("/manager", ...)` processes the form. Special field prefixes:
- `__clear__fieldpath` — sets field to `""` (delete image/SVG)
- `__svg__fieldpath` — stores SVG code as `data:` string
- `removeNewsItems` — removes a news item by index
- `addNewsItem` — pushes a new empty news item

After processing all fields, saves JSON and redirects back to manager.

---

## Admin Panel

**URL:** `https://logmed.cloud/manager/login`

**Credentials (defaults — override with env vars in production):**
- Email: `dariomigliaccio@gmail.com`
- Password: `site-content`
- Env vars: `ADMIN_USER`, `ADMIN_PASSWORD`

**Tab structure** (built by `public/js/admin.js` IIFE at runtime):
| Tab | Sections |
|-----|---------|
| Site | Site settings, Scrolling Announcement |
| Home | Home Hero, Home Intro |
| About & News | About/News Header (incl. Available Units), News Items |
| Footer | Footer |
| Páginas | All other page sections (Property Details, Amenities, Eligibility, Neighborhood, Floor Plans) |

**Key admin fields:**
- `site.applyUrl` — HavenConnect application URL (all Apply Now buttons link here)
- `announcement.*` — scrolling ticker (enabled, text, linkUrl, speed in seconds)
- `pages./sustainability.details.availableUnits` — units still available (decrements as applications close); also editable from About & News tab
- `pages./sustainability.details.unitsValue` — total units (33)
- `pages./about.news.N.link` — "More details" URL per news item (optional; button hidden if empty)
- SVG fields use a textarea — paste SVG code directly; stored with `data:` prefix

---

## CSS Design Tokens

```css
--ink: #1b2529         /* dark text */
--muted: #647077       /* secondary text */
--paper: #edf1f5       /* page background */
--surface: #ffffff     /* card background */
--green: #2788bd       /* primary blue accent */
--green-dark: #071f44  /* dark navy */
--clay: #a56022        /* warm brown (eyebrow text) */
--orange: #d48940      /* orange */
--gold: #4eb2c8        /* teal/gold accent */
--aqua: #87d1d8        /* light aqua */
--line: #cbd4df        /* borders */
--shadow: 0 18px 45px rgba(7,31,68,0.16)
```

Footer background: `#2b3138` (gray).

---

## Routes

| Route | Page | Render function |
|-------|------|----------------|
| `/` | Home | `renderHero` + `renderHomeIntro` |
| `/about` | About & News | `renderNewsSection` |
| `/sustainability` | Property Details | `renderPropertyDetails` |
| `/community` | Amenities | `renderAmenities` |
| `/eligibility` | Eligibility | `renderEligibility` |
| `/neiborhub` | Neighborhood | `renderNeighborhood` |
| `/floor-plans` | Floor Plans | `renderFloorPlans` |
| `/manager/login` | Admin login | — |
| `/manager` | Admin panel (GET/POST) | — |
| `/manager/logout` | Destroy session | — |

Apply Now buttons link to `site.applyUrl` → `https://app.havenconnect.com/form/3efb0af8-eb00-45dc-a024-186fa99b8ce8`

---

## Key Patterns & Decisions

### Content edits — no restart needed
`site-content.json` is read per-request. Saving in the manager takes effect immediately.

### Image uploads
Uploaded to `public/uploads/` via multer. Referenced as `/uploads/filename.ext`. SVG icons can also be pasted as code in the SVG textarea fields.

### Occupancy counter
`pages./sustainability.details.availableUnits` stores remaining units. When closing an application, decrement this number in the manager (About & News tab or Páginas → Property Details). The counter widget shows: Total | Available (blue) | Filed, plus a progress bar and urgency note.

### News items
Sorted by date (newest first). First item is "featured" (large, with image). Rest appear in 3-column grid. Each item has: date, category, title, body, link (optional → shows "More details" button), image. Date displays below category label.

### Floor plans
Images support hover zoom (CSS scale) and click lightbox (vanilla JS in `site.js`).

### Mobile menu
Apply Now is excluded from the hamburger side menu — it only appears in the desktop nav and footer.

### Under-construction gate
In `server.js` middleware, hosts `logmed.cloud` / `www.logmed.cloud` are whitelisted. Everything else returns 503 with a construction page. When ready to go live, remove this middleware.

### `data/site-content.json` corruption risk
If an array accidentally gets saved into a string field (e.g., `eyebrow` becomes an array), `esc()` handles it safely (takes first element). To fix the data, edit JSON directly on the server with python3.

---

## Common Operations

### Manual deploy (if GitHub Actions fails)
```bash
ssh -i ~/.ssh/cherry_deploy root@2.24.96.87 \
  "cd /var/www/cherry-street-commons && git pull origin main && pm2 restart cherry-street-commons"
```

### Fix site-content.json on server
```bash
ssh -i ~/.ssh/cherry_deploy root@2.24.96.87 "python3 -c \"
import json
with open('/var/www/cherry-street-commons/data/site-content.json') as f:
    d = json.load(f)
# make your change, e.g.:
# d['pages']['/about']['eyebrow'] = 'Correct value'
with open('/var/www/cherry-street-commons/data/site-content.json', 'w') as f:
    json.dump(d, f, indent=2)
print('Done')
\""
```

### Check server logs
```bash
ssh -i ~/.ssh/cherry_deploy root@2.24.96.87 "pm2 logs cherry-street-commons --lines 30 --nostream"
```

### Verify site is up
```bash
ssh -i ~/.ssh/cherry_deploy root@2.24.96.87 "curl -s -o /dev/null -w '%{http_code}' -H 'Host: logmed.cloud' http://127.0.0.1:3012/"
```

### Check GitHub Actions deploy status
```bash
gh run list --limit 5
gh run view <run-id> --log-failed
```

---

## Post-deploy Checklist

- `https://logmed.cloud/` → 200
- `https://logmed.cloud/about` → 200, no broken eyebrow text
- `https://logmed.cloud/manager/login` → 200
- `https://1244cherry.com/` → 503 (under construction)
- `pm2 status cherry-street-commons` → `online`
