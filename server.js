const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;
const dataPath = process.env.CONTENT_FILE || path.join(__dirname, "data", "site-content.json");
const defaultDataPath = path.join(__dirname, "data", "site-content.json");
const uploadsDir = path.join(__dirname, "public", "uploads");
const adminUser = process.env.ADMIN_USER || "dariomigliaccio@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD || "site-content";
const officialLogo = "/images/logo-1.png";
const footerOfficialLogos = [
  { label: "Equal Housing Opportunity", image: "/images/footer-logo-1.png", url: "https://hiphousing.org" },
  { label: "Accessibility", image: "/images/footer-logo-2.png" },
  { label: "Property Management", image: "/images/footer-logo-3.png" }
];

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  })
});

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cherry-street-commons-admin",
    resave: false,
    saveUninitialized: false
  })
);

app.use((req, res, next) => {
  const previewHosts = new Set(["logmed.cloud", "www.logmed.cloud"]);
  const allowedAssets = new Set([
    "/css/styles.css",
    "/assets/cherry-street-rendering-1600x700.jpg"
  ]);
  if (previewHosts.has(req.hostname.toLowerCase())) {
    return next();
  }
  if (req.method === "GET" && allowedAssets.has(req.path)) {
    return next();
  }
  return res.status(503).send(renderConstructionPage(readContent()));
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

function readContent() {
  const defaults = JSON.parse(fs.readFileSync(defaultDataPath, "utf8"));
  const content = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  return normalizeContent(mergeMissing(defaults, content));
}

function writeContent(content) {
  fs.writeFileSync(dataPath, `${JSON.stringify(content, null, 2)}\n`);
}

function mergeMissing(defaultValue, currentValue) {
  if (currentValue === undefined || currentValue === null) return defaultValue;
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(currentValue)) return defaultValue;
    if (!currentValue.length) return currentValue;
    return currentValue.map((item, index) => mergeMissing(defaultValue[Math.min(index, defaultValue.length - 1)], item));
  }
  if (typeof defaultValue === "object" && defaultValue) {
    const merged = { ...currentValue };
    Object.entries(defaultValue).forEach(([key, value]) => {
      merged[key] = mergeMissing(value, currentValue[key]);
    });
    return merged;
  }
  return currentValue;
}

function normalizeContent(data) {
  const desiredNav = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Property Details", href: "/sustainability" },
    { label: "Amenities", href: "/community" },
    { label: "Eligibility", href: "/eligibility" },
    { label: "Neighborhood", href: "/neiborhub" },
    { label: "Floor Plans", href: "/floor-plans" },
    { label: "Apply now", href: "/contact" }
  ];
  data.nav.forEach((item) => {
    if (item.href === "/sustainability" && ["Sustainability", "PROPERTY DETAILS"].includes(item.label)) item.label = "Property Details";
    if (item.href === "/community" && item.label === "Community") item.label = "Amenities";
    if (item.href === "/contact") item.label = "Apply now";
  });
  desiredNav.forEach((item) => {
    if (!data.nav.some((navItem) => navItem.href === item.href)) data.nav.push(item);
  });
  data.nav.sort((a, b) => {
    const aIndex = desiredNav.findIndex((item) => item.href === a.href);
    const bIndex = desiredNav.findIndex((item) => item.href === b.href);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
  data.footer.officialLogos = footerOfficialLogos.map((item, index) => ({
    ...data.footer.officialLogos?.[index],
    label: item.label,
    image: item.image,
    url: item.url || data.footer.officialLogos?.[index]?.url || ""
  }));
  if (["Sustainability", "PROPERTY DETAILS"].includes(data.pages["/sustainability"]?.title)) {
    data.pages["/sustainability"].title = "Property Details";
    data.pages["/sustainability"].eyebrow = "Property information";
    data.pages["/sustainability"].body = "Explore the property details and in-home features planned for Cherry Street Commons.";
  }
  if (data.pages["/community"]?.title === "Community") {
    data.pages["/community"].title = "Amenities";
    data.pages["/community"].eyebrow = "Community amenities";
    data.pages["/community"].body = "Amenities that support convenience, connection, security, and everyday resident life.";
  }
  const amenities = data.pages["/community"]?.amenities;
  if (amenities && (!Array.isArray(amenities.items) || !amenities.items.length)) {
    amenities.items = splitLines(amenities.itemsText).map((title) => ({ title, icon: "" }));
  }
  return data;
}

function esc(value = "") {
  const v = Array.isArray(value) ? value[0] ?? "" : value;
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setByPath(target, dottedPath, value) {
  const parts = dottedPath.split(".");
  let current = target;
  parts.slice(0, -1).forEach((part) => {
    current = current[Number.isNaN(Number(part)) ? part : Number(part)];
  });
  current[parts.at(-1)] = value;
}

function getByPath(target, dottedPath) {
  return dottedPath.split(".").reduce((current, part) => {
    if (current == null) return "";
    return current[Number.isNaN(Number(part)) ? part : Number(part)];
  }, target);
}

function renderCardMedia(image, alt, fallback = "") {
  if (image) return `<img class="card-image" src="${esc(image)}" alt="${esc(alt)}">`;
  return `<div class="card-image-placeholder"><span>${esc(fallback || alt)}</span></div>`;
}

function optionalTag(tag, className, value) {
  if (!String(value || "").trim()) return "";
  const classAttr = className ? ` class="${esc(className)}"` : "";
  return `<${tag}${classAttr}>${esc(value)}</${tag}>`;
}

function renderMenuIcon(data) {
  if (data.site.menuIcon) {
    return `<img class="menu-icon-image" src="${esc(data.site.menuIcon)}" alt="">`;
  }
  return "<span></span><span></span><span></span>";
}

function renderAnnouncement(data) {
  const announcement = data.announcement || {};
  const text = String(announcement.text || "").trim();
  if (!announcement.enabled || !text) return "";
  const displayText = esc(text).replace(/\*/g, "&nbsp;&nbsp;★&nbsp;&nbsp;");
  const item = `<span>${displayText}</span>`;
  const items = Array.from({ length: 8 }, () => item).join("");
  const content = announcement.linkUrl
    ? `<a href="${esc(announcement.linkUrl)}">${items}</a>`
    : items;
  return `<div class="announcement-bar" style="--ticker-duration:${esc(announcement.speed || "32")}s"><div class="announcement-track">${content}</div></div>`;
}

function applyHref(data) {
  return data.site.applyUrl?.trim() || "#";
}

function slideHref(slide) {
  return slide.buttonUrl?.trim() || "#";
}

function renderLayout({ title, content, activePath = "/", home = false }) {
  const data = readContent();
  const applyLink = applyHref(data);
  const buildNavLinks = (items) => items
    .map((item) => {
      const active = item.href === activePath ? " active" : "";
      const cta = item.href === "/contact" ? " nav-apply" : "";
      const href = item.href === "/contact" ? applyLink : item.href;
      const label = item.href === "/contact" ? data.site.applyLabel : item.label;
      return `<a class="nav-link${active}${cta}" href="${esc(href)}">${esc(label)}</a>`;
    })
    .join("");
  const nav = buildNavLinks(data.nav);
  const mobileNav = buildNavLinks(data.nav.filter((item) => item.href !== "/contact"));

  const footer = home ? "" : renderFooter(data);

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${esc(title)}</title>
      <meta name="description" content="${esc(data.site.description)}">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
      <link rel="stylesheet" href="/css/styles.css">
      <script>
        window.siteLocation = ${JSON.stringify(data.location)};
      </script>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
      <script src="/js/site.js" defer></script>
    </head>
    <body>
      ${renderAnnouncement(data)}
      <header class="site-header">
        <div class="header-inner">
          <div class="brand-row">
            <button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" data-menu-button>
              ${renderMenuIcon(data)}
            </button>
            <a class="brand" href="/">
              <strong>${esc(data.site.name)}</strong>
            </a>
          </div>
          <nav class="desktop-nav" aria-label="Primary navigation">${nav}</nav>
        </div>
      </header>
      <aside class="side-menu" aria-hidden="true" data-side-menu>
        <div class="side-menu-top">
          <strong class="side-menu-brand">${esc(data.site.name)}</strong>
          <button class="close-button" type="button" aria-label="Close menu" data-close-menu>&times;</button>
        </div>
        <nav aria-label="Mobile navigation">${mobileNav}</nav>
      </aside>
      <div class="menu-backdrop" data-menu-backdrop></div>
      <main>${content}</main>
      ${footer}
    </body>
  </html>`;
}

function renderFooter(data) {
  const applyLink = applyHref(data);
  const links = data.nav
    .map((item) => {
      const href = item.href === "/contact" ? applyLink : item.href;
      const label = item.href === "/contact" ? data.site.applyLabel : item.label;
      return `<a href="${esc(href)}">${esc(label)}</a>`;
    })
    .join("");
  const officialLogos = (data.footer.officialLogos || [])
    .filter((item) => item.image || item.label)
    .map((item, index) => {
      const logo = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(item.label)}">`
        : `<span>${esc(item.label)}</span>`;
      return item.url
        ? `<a class="official-logo official-logo-${index + 1}" href="${esc(item.url)}" target="_blank" rel="noreferrer">${logo}</a>`
        : `<div class="official-logo official-logo-${index + 1}">${logo}</div>`;
    })
    .join("");
  return `<footer class="site-footer">
    <div class="footer-brand">
      <h2>${esc(data.footer.headline)}</h2>
      <p>${esc(data.footer.body)}</p>
      <a class="footer-cta apply-pulse" href="${esc(applyLink)}">${esc(data.site.applyLabel)}</a>
    </div>
    <div class="footer-column">
      <h3>Explore</h3>
      <nav>${links}</nav>
    </div>
    <div class="footer-column">
      <h3>Contact</h3>
      <p>${esc(data.footer.address)}</p>
      <a href="tel:${esc(data.footer.phone)}">${esc(data.footer.phone)}</a>
      <a href="mailto:${esc(data.footer.email)}">${esc(data.footer.email)}</a>
    </div>
    <div class="footer-logos">${officialLogos}</div>
    <div class="footer-bottom">${esc(data.footer.copyright)}</div>
  </footer>`;
}

function renderConstructionPage(data) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${esc(data.site.name)} | Under Construction</title>
      <meta name="description" content="${esc(data.site.description)}">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/css/styles.css">
    </head>
    <body class="construction-body">
      <main class="construction-page">
        <section class="construction-panel" aria-label="Site under construction">
          <p class="eyebrow">Cherry Street Commons</p>
          <h1>This page is under construction</h1>
          <p>We are preparing the website and will be back soon.</p>
          <img src="/assets/cherry-street-rendering-1600x700.jpg" alt="Rendering of Cherry Street Commons">
        </section>
      </main>
    </body>
  </html>`;
}

function mapSection(data) {
  return `<section class="map-section" aria-label="Property location">
    <div class="map-copy">
      <p class="eyebrow">${esc(data.location.eyebrow)}</p>
      <h2>${esc(data.location.title)}</h2>
      <h3>${esc(data.location.address)}</h3>
      <p>${esc(data.location.body)}</p>
    </div>
    <div class="property-map" id="property-map" role="img" aria-label="Interactive map showing ${esc(data.location.address)}"></div>
  </section>`;
}

function splitLines(value = "") {
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderContentTable(value = "") {
  const rows = splitLines(value).map((row) => row.split("|").map((cell) => cell.trim()));
  if (!rows.length) return "";
  const [head, ...body] = rows;
  const headers = head.map((cell) => `<th>${esc(cell)}</th>`).join("");
  const bodyRows = body
    .map((row) => `<tr>${head.map((_, index) => `<td>${esc(row[index] || "")}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="responsive-table"><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function renderAboutSection(page) {
  const section = page.aboutSection || {};
  return `<section class="about-detail-section">
    <p class="eyebrow">${esc(page.eyebrow)}</p>
    <h2>${esc(section.title || page.title)}</h2>
    <h3>${esc(section.subtitle || "")}</h3>
    <p>${esc(section.body || page.body)}</p>
  </section>`;
}

function formatNewsDate(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderAboutHero(page) {
  const section = page.aboutSection || {};
  const title = section.title || page.title;
  return `<section class="about-hero">
    <div class="about-hero-content">
      ${page.eyebrow ? `<p class="eyebrow">${esc(page.eyebrow)}</p>` : ""}
      <h1>${esc(title)}</h1>
    </div>
  </section>`;
}

function renderNewsSection(page) {
  const items = (page.news || []).slice().sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  if (!items.length) {
    return `<section class="news-section"><div class="news-empty"><p>No updates yet. Check back soon.</p></div></section>`;
  }
  const [featured, ...rest] = items;
  const featuredImg = featured.image
    ? `<img src="${esc(featured.image)}" alt="${esc(featured.title)}">`
    : `<div class="news-image-placeholder"></div>`;
  const featuredMeta = [
    featured.category ? `<span class="news-category">${esc(featured.category)}</span>` : "",
    featured.date ? `<time>${esc(formatNewsDate(featured.date))}</time>` : ""
  ].filter(Boolean).join("");
  const moreBtn = (link) => link ? `<a class="news-more-btn" href="${esc(link)}" target="_blank" rel="noopener">More details</a>` : "";
  const gridItems = rest.map((item) => {
    const img = item.image
      ? `<img class="news-card-image" src="${esc(item.image)}" alt="${esc(item.title)}">`
      : `<div class="news-card-image news-image-placeholder"></div>`;
    const meta = [
      item.category ? `<span class="news-category">${esc(item.category)}</span>` : "",
      item.date ? `<time>${esc(formatNewsDate(item.date))}</time>` : ""
    ].filter(Boolean).join("");
    return `<article class="news-card">${img}<div class="news-card-body">${meta ? `<div class="news-meta">${meta}</div>` : ""}<h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${moreBtn(item.link)}</div></article>`;
  }).join("");
  return `<section class="news-section">
    <article class="news-featured">
      <div class="news-featured-image">${featuredImg}</div>
      <div class="news-featured-body">
        ${featuredMeta ? `<div class="news-meta">${featuredMeta}</div>` : ""}
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.body)}</p>
        ${moreBtn(featured.link)}
      </div>
    </article>
    ${rest.length ? `<div class="news-grid">${gridItems}</div>` : ""}
  </section>`;
}

function renderPropertyDetails(page) {
  const details = page.details || {};
  const total = parseInt(details.unitsValue || "0", 10);
  const available = parseInt(details.availableUnits ?? details.unitsValue ?? "0", 10);
  const taken = Math.max(0, total - available);
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  const availBlock = total > 0 ? `
    <div class="avail-counter">
      <div class="avail-numbers">
        <div class="avail-item avail-item--total">
          <strong>${esc(String(total))}</strong>
          <span>${esc(details.unitsLabel || "Total Homes")}</span>
        </div>
        <div class="avail-divider" aria-hidden="true"></div>
        <div class="avail-item avail-item--open">
          <strong>${esc(String(available))}</strong>
          <span>Available Now</span>
        </div>
        <div class="avail-divider" aria-hidden="true"></div>
        <div class="avail-item avail-item--taken">
          <strong>${esc(String(taken))}</strong>
          <span>Applications Filed</span>
        </div>
      </div>
      <div class="avail-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="avail-bar-fill" style="width:${pct}%"></div>
      </div>
      <p class="avail-note">${available > 0 ? `<strong>${esc(String(available))}</strong> unit${available === 1 ? "" : "s"} still available — apply today!` : "All units are currently spoken for. Join the waitlist."}</p>
    </div>` : "";

  const checkSvg = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>`;
  const features = splitLines(details.featuresText).map((f) => `<li>${checkSvg}<span>${esc(f)}</span></li>`).join("");
  return `<section class="property-details-section">
    <div class="details-intro section-heading">
      <p class="eyebrow">${esc(page.eyebrow)}</p>
      <h2>${esc(details.title || page.title)}</h2>
      <p>${esc(details.subtitle || page.body)}</p>
    </div>
    ${availBlock}
    <div class="details-features">
      <h3>${esc(details.featuresTitle || "Unit Features")}</h3>
      <ul>${features}</ul>
    </div>
  </section>`;
}

function renderAmenities(page) {
  const amenities = page.amenities || {};
  const sourceItems = Array.isArray(amenities.items) && amenities.items.length
    ? amenities.items
    : splitLines(amenities.itemsText).map((title) => ({ title, icon: "" }));
  const items = sourceItems
    .map((item) => `<li>${item.icon ? `<img src="${esc(item.icon)}" alt="">` : `<span class="amenity-icon-fallback"></span>`}<strong>${esc(item.title)}</strong></li>`)
    .join("");
  return `<section class="amenities-section">
    <div class="section-heading">
      <p class="eyebrow">${esc(page.eyebrow)}</p>
      <h2>${esc(amenities.title || page.title)}</h2>
      <p>${esc(amenities.subtitle || page.body)}</p>
    </div>
    <ul>${items}</ul>
  </section>`;
}

function renderEligibility(page, data) {
  const info = page.eligibility || {};
  const applyLink = applyHref(data);
  const requirements = (info.requirements || [])
    .map((item) => `<article><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></article>`)
    .join("");
  return `<section class="eligibility-section">
    <div class="section-heading">
      <p class="eyebrow">${esc(page.eyebrow)}</p>
      <h2>${esc(info.introTitle || page.title)}</h2>
      <p>${esc(info.introSubtitle || page.body)}</p>
    </div>
    <div class="eligibility-grid">
      <article class="eligibility-panel">
        <h3>${esc(info.incomeTitle)}</h3>
        <p>${esc(info.incomeSubtitle)}</p>
        ${renderContentTable(info.incomeTable)}
      </article>
      <article class="eligibility-panel">
        <h3>${esc(info.rentTitle)}</h3>
        <p>${esc(info.rentSubtitle)}</p>
        ${renderContentTable(info.rentTable)}
      </article>
      <article class="eligibility-panel">
        <h3>${esc(info.occupancyTitle)}</h3>
        <p>${esc(info.occupancySubtitle)}</p>
        ${renderContentTable(info.occupancyTable)}
      </article>
    </div>
    <article class="eligibility-note">
      <h2>${esc(info.limitsTitle)}</h2>
      <p>${esc(info.limitsBody)}</p>
      ${renderContentTable(info.availabilityTable)}
    </article>
    <article class="eligibility-note">
      <h2>${esc(info.applyTitle)}</h2>
      <p>${esc(info.applyBody)}</p>
    </article>
    <div class="requirement-grid">${requirements}</div>
    <div class="eligibility-apply">
      <a class="primary-button apply-pulse" href="${esc(applyLink)}">${esc(data.site.applyLabel || "Apply now")}</a>
    </div>
  </section>`;
}

function renderNeighborhood(page) {
  const section = page.neighborhood || {};
  const cards = (page.cards || [])
    .map((card) => `<article>${renderCardMedia(card.image, card.title)}<div class="card-body"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></div></article>`)
    .join("");
  return `<section class="neighborhood-section">
    <div class="section-heading">
      <p class="eyebrow">${esc(page.eyebrow)}</p>
      <h2>${esc(section.title || page.title)}</h2>
      <h3>${esc(section.subtitle || "")}</h3>
      <p>${esc(section.body || page.body)}</p>
    </div>
    <div class="subpage-cards">${cards}</div>
  </section>`;
}

app.get("/", (_req, res) => {
  const data = readContent();
  const activeSlides = data.home.slides.filter((slide) => !slide.hidden);
  const slides = activeSlides
    .map(
      (slide, index) => `<div class="slide${index === 0 ? " active" : ""}" style="--banner-desktop:url('${esc(slide.image)}')${slide.imageMobile ? `;--banner-mobile:url('${esc(slide.imageMobile)}')` : ''}">
      <div class="hero-content">
        ${optionalTag("p", "eyebrow", slide.eyebrow)}
        ${optionalTag("h1", "", slide.title)}
        ${optionalTag("p", "", slide.body)}
        ${String(slide.buttonLabel || "").trim() ? `<a class="primary-button apply-pulse" href="${esc(slideHref(slide))}">${esc(slide.buttonLabel)}</a>` : ""}
      </div>
    </div>`
    )
    .join("");
  const dots = activeSlides
    .map((_, index) => `<button class="dot${index === 0 ? " active" : ""}" type="button" aria-label="Show slide ${index + 1}"></button>`)
    .join("");
  const cards = data.home.cards
    .map(
      (card) => `<article>${renderCardMedia(card.image, card.title, card.number)}<div class="card-body"><span>${esc(card.number)}</span><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></div></article>`
    )
    .join("");

  const content = `<section class="hero-slider" aria-label="Featured property">
    ${slides}
    ${activeSlides.length > 1 ? `<div class="slider-dots" aria-label="Banner controls">${dots}</div>` : ""}
  </section>
  <section class="intro">
    <p class="eyebrow">${esc(data.home.intro.eyebrow)}</p>
    <h2>${esc(data.home.intro.title)}</h2>
    <p>${esc(data.home.intro.body)}</p>
  </section>
  <section class="home-cards" aria-label="Property highlights">${cards}</section>
  ${mapSection(data)}`;

  res.send(renderLayout({ title: `${data.site.name} | ${data.site.tagline}`, content, activePath: "/", home: true }));
});

Object.entries(readContent().pages).forEach(([route]) => {
  app.get(route, (_req, res) => {
    const data = readContent();
    const page = data.pages[route];
    const cardMarkup = page.cards
      .map((card) => `<article>${renderCardMedia(card.image, card.title)}<div class="card-body"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></div></article>`)
      .join("");
    const floorPlanMarkup =
      route === "/floor-plans"
        ? `<section class="floor-plan-list" aria-label="Apartment floor plan models">
            ${page.floorPlans
              .map(
                (plan) => `<article>
              <div class="plan-media">
                ${plan.image ? `<img class="plan-image" src="${esc(plan.image)}" alt="${esc(plan.title)}">` : `<div class="plan-placeholder">${esc(plan.label)}</div>`}
              </div>
              <div class="plan-copy">
                <span>${esc(plan.label)}</span>
                <h2>${esc(plan.title)}</h2>
                <p>${esc(plan.body)}</p>
              </div>
            </article>`
              )
              .join("")}
          </section>`
        : "";

    const bodyContent =
      route === "/about"
        ? renderNewsSection(page)
        : route === "/sustainability"
          ? renderPropertyDetails(page)
          : route === "/community"
            ? renderAmenities(page)
            : route === "/eligibility"
              ? renderEligibility(page, data)
              : route === "/neiborhub"
                ? renderNeighborhood(page)
                : route === "/floor-plans"
                  ? ""
                  : `<section class="subpage-cards">${cardMarkup}</section>`;

    const heroBanner = route === "/about"
      ? renderAboutHero(page)
      : `<section class="page-banner" style="--banner-desktop:url('${esc(page.bannerImage)}')${page.bannerImageMobile ? `;--banner-mobile:url('${esc(page.bannerImageMobile)}')` : ""}">
          <div class="page-banner-content">
            ${optionalTag("p", "eyebrow", page.eyebrow)}
            ${optionalTag("h1", "", page.title)}
            ${optionalTag("p", "", page.body)}
          </div>
        </section>`;
    const content = `${heroBanner}
      ${bodyContent}
      ${floorPlanMarkup}
      ${route === "/contact" ? mapSection(data) : ""}`;

    res.send(renderLayout({ title: `${page.title} | ${data.site.name}`, content, activePath: route }));
  });
});

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/manager/login");
}

function field(label, name, data, type = "text") {
  const value = getByPath(data, name) || "";
  const input =
    type === "textarea"
      ? `<textarea name="${esc(name)}" rows="3">${esc(value)}</textarea>`
      : `<input type="${esc(type)}" name="${esc(name)}" value="${esc(value)}">`;
  return `<label><span>${esc(label)}</span>${input}</label>`;
}

function imageField(label, name, data) {
  const value = getByPath(data, name) || "";
  const clearBtn = value ? `<label class="checkbox-field clear-check"><input type="checkbox" name="__clear__${esc(name)}" value="1"><span>Remove image</span></label>` : "";
  return `<label><span>${esc(label)}</span><input type="file" name="${esc(name)}" accept="image/*,.svg"><small>${esc(value || "No image selected")}</small></label>${clearBtn}`;
}

function svgField(label, name, data) {
  const value = getByPath(data, name) || "";
  const note = value.startsWith("data:") ? "SVG code saved" : esc(value || "None");
  const clearBtn = value ? `<label class="checkbox-field clear-check"><input type="checkbox" name="__clear__${esc(name)}" value="1"><span>Remove SVG</span></label>` : "";
  return `<label><span>${esc(label)}</span><textarea name="__svg__${esc(name)}" rows="5" placeholder="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; ...&gt;...&lt;/svg&gt;"></textarea><small>Current: ${note}</small></label>${clearBtn}`;
}

function checkboxField(label, name, data) {
  const checked = getByPath(data, name) ? " checked" : "";
  return `<label class="checkbox-field"><input type="checkbox" name="${esc(name)}" value="true"${checked}><span>${esc(label)}</span></label>`;
}

function adminShell(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site Manager</title><link rel="stylesheet" href="/css/admin.css"></head><body>${content}<script src="/js/admin.js" defer></script></body></html>`;
}

app.get("/manager/login", (req, res) => {
  res.send(
    adminShell(`<main class="login-panel"><h1>Site Manager</h1><form method="post" action="/manager/login"><label>Email<input type="email" name="email" autocomplete="username" autofocus></label><label>Password<input type="password" name="password" autocomplete="current-password"></label><button>Login</button>${req.query.error ? "<p>Invalid email or password.</p>" : ""}</form></main>`)
  );
});

app.post("/manager/login", (req, res) => {
  if (req.body.email === adminUser && req.body.password === adminPassword) {
    req.session.admin = true;
    res.redirect("/manager");
    return;
  }
  res.redirect("/manager/login?error=1");
});

app.post("/manager/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/manager/login"));
});

app.get("/manager", requireAdmin, (_req, res) => {
  const data = readContent();
  const sections = [];
  sections.push(`<section><h2>Site</h2>${field("Name", "site.name", data)}${field("Tagline", "site.tagline", data)}${field("Brand initials", "site.brandInitials", data)}${svgField("Header logo SVG", "site.logoImage", data)}${svgField("Hamburger menu SVG", "site.menuIcon", data)}${field("Apply button label", "site.applyLabel", data)}${field("Apply button URL", "site.applyUrl", data)}</section>`);
  sections.push(`<section><h2>Scrolling Announcement</h2>${checkboxField("Show scrolling announcement", "announcement.enabled", data)}${field("Announcement text", "announcement.text", data, "textarea")}${field("Announcement link URL", "announcement.linkUrl", data)}${field("Speed in seconds", "announcement.speed", data, "number")}</section>`);
  sections.push(`<section><h2>Home Intro</h2>${field("Eyebrow", "home.intro.eyebrow", data)}${field("Title", "home.intro.title", data)}${field("Body", "home.intro.body", data, "textarea")}</section>`);
  data.home.slides.forEach((_, index) => {
    sections.push(`<section><h2>Home Banner ${index + 1}</h2>${checkboxField("Remove this banner", "removeHomeSlides", { removeHomeSlides: false }).replace('value="true"', `value="${index}"`)}${field("Eyebrow", `home.slides.${index}.eyebrow`, data)}${field("Title", `home.slides.${index}.title`, data)}${field("Body", `home.slides.${index}.body`, data, "textarea")}${field("Button Label", `home.slides.${index}.buttonLabel`, data)}${field("Button URL", `home.slides.${index}.buttonUrl`, data)}${imageField("Banner image (desktop)", `home.slides.${index}.image`, data)}${imageField("Banner image mobile (800×1000px)", `home.slides.${index}.imageMobile`, data)}</section>`);
  });
  sections.push(`<section><h2>Home Banners</h2><button class="secondary-button" type="submit" name="adminAction" value="addHomeSlide">Add home banner</button></section>`);
  data.home.cards.forEach((_, index) => {
    sections.push(`<section><h2>Home Card ${index + 1}</h2>${checkboxField("Remove this card", "removeHomeCards", { removeHomeCards: false }).replace('value="true"', `value="${index}"`)}${field("Number", `home.cards.${index}.number`, data)}${field("Title", `home.cards.${index}.title`, data)}${field("Body", `home.cards.${index}.body`, data, "textarea")}${imageField("Card image", `home.cards.${index}.image`, data)}</section>`);
  });
  sections.push(`<section><h2>Home Cards</h2><button class="secondary-button" type="submit" name="adminAction" value="addHomeCard">Add home card</button></section>`);
  Object.entries(data.pages).forEach(([route, page]) => {
    sections.push(`<section><h2>${esc(page.title)} Page</h2>${field("Eyebrow", `pages.${route}.eyebrow`, data)}${field("Title", `pages.${route}.title`, data)}${field("Body", `pages.${route}.body`, data, "textarea")}${imageField("Banner image (desktop)", `pages.${route}.bannerImage`, data)}${imageField("Banner image mobile (800×1000px)", `pages.${route}.bannerImageMobile`, data)}</section>`);
    if (route === "/about") {
      sections.push(`<section><h2>About / News Header</h2>${field("News Section Title", "pages./about.aboutSection.title", data)}${field("Eyebrow", "pages./about.eyebrow", data)}${field("Available Units (same field as Property Details)", "pages./sustainability.details.availableUnits", data)}</section>`);
      (page.news || []).forEach((_, index) => {
        sections.push(`<section><h2>News Item ${index + 1}</h2>${checkboxField("Remove this item", "removeNewsItems", { removeNewsItems: false }).replace('value="true"', `value="${index}"`)}${field("Date (YYYY-MM-DD)", `pages./about.news.${index}.date`, data)}${field("Category", `pages./about.news.${index}.category`, data)}${field("Title", `pages./about.news.${index}.title`, data)}${field("Body", `pages./about.news.${index}.body`, data, "textarea")}${field("More details link (URL)", `pages./about.news.${index}.link`, data)}${imageField("Image", `pages./about.news.${index}.image`, data)}</section>`);
      });
      sections.push(`<section><h2>News Items</h2><button class="secondary-button" type="submit" name="adminAction" value="addNewsItem">Add news item</button></section>`);
    }
    if (route === "/sustainability") {
      sections.push(`<section><h2>Property Details</h2>${field("Main Title", "pages./sustainability.details.title", data)}${field("Subtitle", "pages./sustainability.details.subtitle", data, "textarea")}${field("Units Label", "pages./sustainability.details.unitsLabel", data)}${field("Total Units", "pages./sustainability.details.unitsValue", data)}${field("Available Units (decreases as applicants are approved)", "pages./sustainability.details.availableUnits", data)}${field("Features Title", "pages./sustainability.details.featuresTitle", data)}${field("Unit Features", "pages./sustainability.details.featuresText", data, "textarea")}</section>`);
    }
    if (route === "/community") {
      sections.push(`<section><h2>Amenities</h2>${field("Title", "pages./community.amenities.title", data)}${field("Subtitle", "pages./community.amenities.subtitle", data)}${field("Amenities List", "pages./community.amenities.itemsText", data, "textarea")}</section>`);
      (page.amenities.items || []).forEach((_, index) => {
        sections.push(`<section><h2>Amenity ${index + 1}</h2>${field("Title", `pages./community.amenities.items.${index}.title`, data)}${svgField("Icon SVG", `pages./community.amenities.items.${index}.icon`, data)}</section>`);
      });
    }
    if (route === "/eligibility") {
      sections.push(`<section><h2>Eligibility Main</h2>${field("Intro Title", "pages./eligibility.eligibility.introTitle", data)}${field("Intro Subtitle", "pages./eligibility.eligibility.introSubtitle", data, "textarea")}${field("Maximum Income Title", "pages./eligibility.eligibility.incomeTitle", data)}${field("Maximum Income Subtitle", "pages./eligibility.eligibility.incomeSubtitle", data)}${field("Maximum Income Table", "pages./eligibility.eligibility.incomeTable", data, "textarea")}${field("Rental Amounts Title", "pages./eligibility.eligibility.rentTitle", data)}${field("Rental Amounts Subtitle", "pages./eligibility.eligibility.rentSubtitle", data)}${field("Rental Amounts Table", "pages./eligibility.eligibility.rentTable", data, "textarea")}${field("Occupancy Title", "pages./eligibility.eligibility.occupancyTitle", data)}${field("Occupancy Subtitle", "pages./eligibility.eligibility.occupancySubtitle", data)}${field("Occupancy Table", "pages./eligibility.eligibility.occupancyTable", data, "textarea")}</section>`);
      sections.push(`<section><h2>Eligibility Details</h2>${field("Limits Title", "pages./eligibility.eligibility.limitsTitle", data)}${field("Limits Body", "pages./eligibility.eligibility.limitsBody", data, "textarea")}${field("Availability Table", "pages./eligibility.eligibility.availabilityTable", data, "textarea")}${field("Apply Title", "pages./eligibility.eligibility.applyTitle", data)}${field("Apply Body", "pages./eligibility.eligibility.applyBody", data, "textarea")}${field("Ready Title", "pages./eligibility.eligibility.readyTitle", data)}${field("Ready Subtitle", "pages./eligibility.eligibility.readySubtitle", data, "textarea")}</section>`);
      (page.eligibility.requirements || []).forEach((_, index) => {
        sections.push(`<section><h2>Eligibility Requirement ${index + 1}</h2>${field("Title", `pages./eligibility.eligibility.requirements.${index}.title`, data)}${field("Body", `pages./eligibility.eligibility.requirements.${index}.body`, data, "textarea")}</section>`);
      });
      (page.eligibility.readyCards || []).forEach((_, index) => {
        sections.push(`<section><h2>Eligibility Action ${index + 1}</h2>${field("Title", `pages./eligibility.eligibility.readyCards.${index}.title`, data)}${field("Body", `pages./eligibility.eligibility.readyCards.${index}.body`, data, "textarea")}${field("Button Label", `pages./eligibility.eligibility.readyCards.${index}.buttonLabel`, data)}${field("Button URL", `pages./eligibility.eligibility.readyCards.${index}.buttonUrl`, data)}</section>`);
      });
    }
    if (route === "/neiborhub") {
      sections.push(`<section><h2>Neighborhood Content</h2>${field("Title", "pages./neiborhub.neighborhood.title", data)}${field("Subtitle", "pages./neiborhub.neighborhood.subtitle", data)}${field("Text", "pages./neiborhub.neighborhood.body", data, "textarea")}</section>`);
      page.cards.forEach((_, index) => {
        sections.push(`<section><h2>Neighborhood Card ${index + 1}</h2>${checkboxField("Remove this card", "removeNeiborhuudCards", { removeNeiborhuudCards: false }).replace('value="true"', `value="${index}"`)}${field("Title", `pages./neiborhub.cards.${index}.title`, data)}${field("Body", `pages./neiborhub.cards.${index}.body`, data, "textarea")}${imageField("Card image", `pages./neiborhub.cards.${index}.image`, data)}</section>`);
      });
      sections.push(`<section><h2>Neighborhood Cards</h2><button class="secondary-button" type="submit" name="adminAction" value="addNeiborhuudCard">Add Neighborhood card</button></section>`);
    }
    if (!["/about", "/sustainability", "/community", "/eligibility", "/neiborhub"].includes(route)) {
      page.cards.forEach((_, index) => {
        sections.push(`<section><h2>${esc(page.title)} Card ${index + 1}</h2>${field("Title", `pages.${route}.cards.${index}.title`, data)}${field("Body", `pages.${route}.cards.${index}.body`, data, "textarea")}${imageField("Card image", `pages.${route}.cards.${index}.image`, data)}</section>`);
      });
    }
    if (route === "/floor-plans") {
      page.floorPlans.forEach((_, index) => {
        sections.push(`<section><h2>Floor Plan ${index + 1}</h2>${field("Label", `pages./floor-plans.floorPlans.${index}.label`, data)}${field("Title", `pages./floor-plans.floorPlans.${index}.title`, data)}${field("Description", `pages./floor-plans.floorPlans.${index}.body`, data, "textarea")}${imageField("Floor plan image", `pages./floor-plans.floorPlans.${index}.image`, data)}</section>`);
      });
    }
  });
  sections.push(`<section><h2>Location</h2>${field("Eyebrow", "location.eyebrow", data)}${field("Title", "location.title", data)}${field("Body", "location.body", data, "textarea")}${field("Address", "location.address", data)}${field("Latitude", "location.lat", data, "number")}${field("Longitude", "location.lng", data, "number")}${field("Zoom", "location.zoom", data, "number")}</section>`);
  sections.push(`<section><h2>Footer</h2>${field("Headline", "footer.headline", data)}${svgField("Footer main logo SVG", "footer.logoImage", data)}${field("Body", "footer.body", data, "textarea")}${field("Address", "footer.address", data)}${field("Phone", "footer.phone", data)}${field("Email", "footer.email", data, "email")}${field("Copyright", "footer.copyright", data)}</section>`);
  (data.footer.officialLogos || []).forEach((_, index) => {
    sections.push(`<section><h2>Footer Official Logo ${index + 1}</h2>${field("Label", `footer.officialLogos.${index}.label`, data)}${field("URL", `footer.officialLogos.${index}.url`, data, "url")}${imageField("Logo SVG/image", `footer.officialLogos.${index}.image`, data)}</section>`);
  });
  res.send(
    adminShell(`<header class="admin-header"><h1>Site Manager</h1><div><a href="/" target="_blank">View site</a><form method="post" action="/manager/logout"><button>Logout</button></form></div></header><form class="admin-form" method="post" action="/manager" enctype="multipart/form-data">${sections.join("")}<button class="save-button">Save Changes</button></form>`)
  );
});

app.post("/manager", requireAdmin, upload.any(), (req, res) => {
  const data = readContent();
  const action = req.body.adminAction;
  const removeHomeSlides = req.body.removeHomeSlides;
  const removeHomeCards = req.body.removeHomeCards;
  const removeNeiborhuudCards = req.body.removeNeiborhuudCards;
  const removeNewsItems = req.body.removeNewsItems;
  delete req.body.adminAction;
  delete req.body.removeHomeSlides;
  delete req.body.removeHomeCards;
  delete req.body.removeNeiborhuudCards;
  delete req.body.removeNewsItems;
  data.announcement.enabled = false;
  const clearEntries = Object.keys(req.body).filter((k) => k.startsWith("__clear__"));
  clearEntries.forEach((key) => {
    const shouldClear = req.body[key];
    delete req.body[key];
    if (shouldClear) setByPath(data, key.slice(9), "");
  });
  const svgEntries = Object.keys(req.body).filter((k) => k.startsWith("__svg__"));
  svgEntries.forEach((key) => {
    const svgCode = String(req.body[key] || "").trim();
    delete req.body[key];
    if (svgCode) {
      const fieldName = key.slice(7);
      setByPath(data, fieldName, `data:image/svg+xml;base64,${Buffer.from(svgCode).toString("base64")}`);
    }
  });
  Object.entries(req.body).forEach(([name, value]) => {
    setByPath(data, name, value);
  });
  req.files.forEach((file) => {
    setByPath(data, file.fieldname, `/uploads/${file.filename}`);
  });
  if (removeHomeSlides !== undefined) {
    const indexes = new Set((Array.isArray(removeHomeSlides) ? removeHomeSlides : [removeHomeSlides]).map((value) => Number(value)));
    data.home.slides = data.home.slides.filter((_, index) => !indexes.has(index));
  }
  if (removeHomeCards !== undefined) {
    const indexes = new Set((Array.isArray(removeHomeCards) ? removeHomeCards : [removeHomeCards]).map((value) => Number(value)));
    data.home.cards = data.home.cards.filter((_, index) => !indexes.has(index));
  }
  if (removeNeiborhuudCards !== undefined) {
    const indexes = new Set((Array.isArray(removeNeiborhuudCards) ? removeNeiborhuudCards : [removeNeiborhuudCards]).map((value) => Number(value)));
    data.pages["/neiborhub"].cards = data.pages["/neiborhub"].cards.filter((_, index) => !indexes.has(index));
  }
  if (action === "addHomeSlide") {
    data.home.slides.push({
      eyebrow: "",
      title: "",
      body: "",
      buttonLabel: "Apply now",
      buttonUrl: "",
      image: "/assets/hero-cherry.png"
    });
  }
  if (action === "addHomeCard") {
    data.home.cards.push({
      number: String(data.home.cards.length + 1).padStart(2, "0"),
      title: "",
      body: "",
      image: ""
    });
  }
  if (action === "addNeiborhuudCard") {
    data.pages["/neiborhub"].cards.push({
      title: "",
      body: "",
      image: ""
    });
  }
  if (removeNewsItems !== undefined) {
    const indexes = new Set((Array.isArray(removeNewsItems) ? removeNewsItems : [removeNewsItems]).map(Number));
    data.pages["/about"].news = (data.pages["/about"].news || []).filter((_, index) => !indexes.has(index));
  }
  if (action === "addNewsItem") {
    if (!data.pages["/about"].news) data.pages["/about"].news = [];
    data.pages["/about"].news.push({ date: new Date().toISOString().slice(0, 10), category: "", title: "", body: "", image: "" });
  }
  data.location.lat = Number(data.location.lat);
  data.location.lng = Number(data.location.lng);
  data.location.zoom = Number(data.location.zoom);
  writeContent(data);
  res.redirect("/manager?saved=1");
});

app.listen(port, () => {
  console.log(`Cherry Street Commons site running on http://localhost:${port}`);
});
