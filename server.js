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
const adminPassword = process.env.ADMIN_PASSWORD || "site-content";

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
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
app.use(express.static(path.join(__dirname, "public")));

function readContent() {
  const defaults = JSON.parse(fs.readFileSync(defaultDataPath, "utf8"));
  const content = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  return mergeMissing(defaults, content);
}

function writeContent(content) {
  fs.writeFileSync(dataPath, `${JSON.stringify(content, null, 2)}\n`);
}

function mergeMissing(defaultValue, currentValue) {
  if (currentValue === undefined || currentValue === null) return defaultValue;
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(currentValue)) return defaultValue;
    return defaultValue.map((item, index) => mergeMissing(item, currentValue[index]));
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

function esc(value = "") {
  return String(value)
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

function renderImage(image, alt) {
  return image ? `<img class="card-image" src="${esc(image)}" alt="${esc(alt)}">` : "";
}

function renderBrandMark(data, extraClass = "") {
  if (data.site.logoImage) {
    return `<span class="brand-mark image-mark ${esc(extraClass)}"><img src="${esc(data.site.logoImage)}" alt="${esc(data.site.name)}"></span>`;
  }
  return `<span class="brand-mark ${esc(extraClass)}">${esc(data.site.brandInitials)}</span>`;
}

function renderMenuIcon(data) {
  if (data.site.menuIcon) {
    return `<img class="menu-icon-image" src="${esc(data.site.menuIcon)}" alt="">`;
  }
  return "<span></span><span></span><span></span>";
}

function renderLayout({ title, content, activePath = "/", home = false }) {
  const data = readContent();
  const nav = data.nav
    .map((item) => {
      const active = item.href === activePath ? " active" : "";
      return `<a class="nav-link${active}" href="${esc(item.href)}">${esc(item.label)}</a>`;
    })
    .join("");

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
      <header class="site-header">
        <div class="header-inner">
          <div class="brand-row">
            <button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" data-menu-button>
              ${renderMenuIcon(data)}
            </button>
            <a class="brand" href="/">
              ${renderBrandMark(data)}
              <span>
                <strong>${esc(data.site.name)}</strong>
                <small>${esc(data.site.tagline)}</small>
              </span>
            </a>
          </div>
          <nav class="desktop-nav" aria-label="Primary navigation">${nav}</nav>
        </div>
      </header>
      <aside class="side-menu" aria-hidden="true" data-side-menu>
        <div class="side-menu-top">
          ${renderBrandMark(data)}
          <button class="close-button" type="button" aria-label="Close menu" data-close-menu>&times;</button>
        </div>
        <nav aria-label="Mobile navigation">${nav}</nav>
      </aside>
      <div class="menu-backdrop" data-menu-backdrop></div>
      <main>${content}</main>
      ${footer}
    </body>
  </html>`;
}

function renderFooter(data) {
  const links = data.nav.map((item) => `<a href="${esc(item.href)}">${esc(item.label)}</a>`).join("");
  const social = data.footer.social
    .map((item) => `<a class="social-link" href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.label)}</a>`)
    .join("");
  const officialLogos = (data.footer.officialLogos || [])
    .filter((item) => item.image || item.label)
    .map((item) => {
      const logo = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(item.label)}">`
        : `<span>${esc(item.label)}</span>`;
      return item.url
        ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${logo}</a>`
        : `<div>${logo}</div>`;
    })
    .join("");
  const footerLogo = data.footer.logoImage
    ? `<img class="footer-logo-image" src="${esc(data.footer.logoImage)}" alt="${esc(data.footer.headline)}">`
    : renderBrandMark(data);

  return `<footer class="site-footer">
    <div class="footer-brand">
      ${footerLogo}
      <h2>${esc(data.footer.headline)}</h2>
      <p>${esc(data.footer.body)}</p>
      <a class="footer-cta" href="${esc(data.footer.ctaUrl)}">${esc(data.footer.ctaLabel)}</a>
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
    <div class="footer-column">
      <h3>Social</h3>
      <div class="social-links">${social}</div>
    </div>
    <div class="footer-logos">${officialLogos}</div>
    <div class="footer-bottom">${esc(data.footer.copyright)}</div>
  </footer>`;
}

function mapSection(data) {
  return `<section class="map-section" aria-label="Property location">
    <div class="map-copy">
      <p class="eyebrow">${esc(data.location.eyebrow)}</p>
      <h2>${esc(data.location.title)}</h2>
      <p>${esc(data.location.body)}</p>
    </div>
    <div class="property-map" id="property-map" role="img" aria-label="Interactive map showing ${esc(data.location.address)}"></div>
  </section>`;
}

app.get("/", (_req, res) => {
  const data = readContent();
  const slides = data.home.slides
    .map(
      (slide, index) => `<div class="slide${index === 0 ? " active" : ""}" style="background-image:url('${esc(slide.image)}')">
      <div class="hero-content">
        <p class="eyebrow">${esc(slide.eyebrow)}</p>
        <h1>${esc(slide.title)}</h1>
        <p>${esc(slide.body)}</p>
        <a class="primary-button" href="${esc(slide.buttonUrl)}">${esc(slide.buttonLabel)}</a>
      </div>
    </div>`
    )
    .join("");
  const dots = data.home.slides
    .map((_, index) => `<button class="dot${index === 0 ? " active" : ""}" type="button" aria-label="Show slide ${index + 1}"></button>`)
    .join("");
  const cards = data.home.cards
    .map(
      (card) => `<article>${renderImage(card.image, card.title)}<span>${esc(card.number)}</span><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></article>`
    )
    .join("");

  const content = `<section class="hero-slider" aria-label="Featured property">
    ${slides}
    <div class="slider-dots" aria-label="Banner controls">${dots}</div>
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
      .map((card) => `<article>${renderImage(card.image, card.title)}<h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></article>`)
      .join("");
    const floorPlanMarkup =
      route === "/floor-plans"
        ? `<section class="floor-plan-gallery" aria-label="Apartment floor plan models">
            ${page.floorPlans
              .map(
                (plan) => `<article>
              ${plan.image ? `<img class="plan-image" src="${esc(plan.image)}" alt="${esc(plan.title)}">` : `<div class="plan-placeholder">${esc(plan.label)}</div>`}
              <h2>${esc(plan.title)}</h2>
              <p>${esc(plan.body)}</p>
            </article>`
              )
              .join("")}
          </section>`
        : "";

    const content = `<section class="page-banner" style="background-image:url('${esc(page.bannerImage)}')">
        <div class="page-banner-content">
          <p class="eyebrow">${esc(page.eyebrow)}</p>
          <h1>${esc(page.title)}</h1>
          <p>${esc(page.body)}</p>
          <a class="primary-button" href="${esc(data.site.applyUrl)}">${esc(data.site.applyLabel)}</a>
        </div>
      </section>
      <section class="subpage-cards">${cardMarkup}</section>
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
  return `<label><span>${esc(label)}</span><input type="file" name="${esc(name)}" accept="image/*,.svg"><small>${esc(value || "No image selected")}</small></label>`;
}

function adminShell(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site Manager</title><link rel="stylesheet" href="/css/admin.css"></head><body>${content}</body></html>`;
}

app.get("/manager/login", (req, res) => {
  res.send(
    adminShell(`<main class="login-panel"><h1>Site Manager</h1><form method="post" action="/manager/login"><label>Password<input type="password" name="password" autofocus></label><button>Login</button>${req.query.error ? "<p>Invalid password.</p>" : ""}</form></main>`)
  );
});

app.post("/manager/login", (req, res) => {
  if (req.body.password === adminPassword) {
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
  sections.push(`<section><h2>Site</h2>${field("Name", "site.name", data)}${field("Tagline", "site.tagline", data)}${field("Brand initials", "site.brandInitials", data)}${imageField("Affordable Homes / header logo SVG", "site.logoImage", data)}${imageField("Hamburger menu SVG", "site.menuIcon", data)}${field("Apply label", "site.applyLabel", data)}${field("Apply URL", "site.applyUrl", data)}</section>`);
  sections.push(`<section><h2>Home Intro</h2>${field("Eyebrow", "home.intro.eyebrow", data)}${field("Title", "home.intro.title", data)}${field("Body", "home.intro.body", data, "textarea")}</section>`);
  data.home.slides.forEach((_, index) => {
    sections.push(`<section><h2>Home Banner ${index + 1}</h2>${field("Eyebrow", `home.slides.${index}.eyebrow`, data)}${field("Title", `home.slides.${index}.title`, data)}${field("Body", `home.slides.${index}.body`, data, "textarea")}${field("Button Label", `home.slides.${index}.buttonLabel`, data)}${field("Button URL", `home.slides.${index}.buttonUrl`, data)}${imageField("Banner image", `home.slides.${index}.image`, data)}</section>`);
  });
  data.home.cards.forEach((_, index) => {
    sections.push(`<section><h2>Home Card ${index + 1}</h2>${field("Number", `home.cards.${index}.number`, data)}${field("Title", `home.cards.${index}.title`, data)}${field("Body", `home.cards.${index}.body`, data, "textarea")}${imageField("Card image", `home.cards.${index}.image`, data)}</section>`);
  });
  Object.entries(data.pages).forEach(([route, page]) => {
    sections.push(`<section><h2>${esc(page.title)} Page</h2>${field("Eyebrow", `pages.${route}.eyebrow`, data)}${field("Title", `pages.${route}.title`, data)}${field("Body", `pages.${route}.body`, data, "textarea")}${imageField("Banner image", `pages.${route}.bannerImage`, data)}</section>`);
    page.cards.forEach((_, index) => {
      sections.push(`<section><h2>${esc(page.title)} Card ${index + 1}</h2>${field("Title", `pages.${route}.cards.${index}.title`, data)}${field("Body", `pages.${route}.cards.${index}.body`, data, "textarea")}${imageField("Card image", `pages.${route}.cards.${index}.image`, data)}</section>`);
    });
    if (route === "/floor-plans") {
      page.floorPlans.forEach((_, index) => {
        sections.push(`<section><h2>Floor Plan ${index + 1}</h2>${field("Label", `pages./floor-plans.floorPlans.${index}.label`, data)}${field("Title", `pages./floor-plans.floorPlans.${index}.title`, data)}${field("Body", `pages./floor-plans.floorPlans.${index}.body`, data, "textarea")}${imageField("Plan image", `pages./floor-plans.floorPlans.${index}.image`, data)}</section>`);
      });
    }
  });
  sections.push(`<section><h2>Location</h2>${field("Eyebrow", "location.eyebrow", data)}${field("Title", "location.title", data)}${field("Body", "location.body", data, "textarea")}${field("Address", "location.address", data)}${field("Latitude", "location.lat", data, "number")}${field("Longitude", "location.lng", data, "number")}${field("Zoom", "location.zoom", data, "number")}</section>`);
  sections.push(`<section><h2>Footer</h2>${field("Headline", "footer.headline", data)}${imageField("Footer main logo SVG", "footer.logoImage", data)}${field("Body", "footer.body", data, "textarea")}${field("Address", "footer.address", data)}${field("Phone", "footer.phone", data)}${field("Email", "footer.email", data, "email")}${field("CTA Label", "footer.ctaLabel", data)}${field("CTA URL", "footer.ctaUrl", data)}${field("Copyright", "footer.copyright", data)}</section>`);
  (data.footer.officialLogos || []).forEach((_, index) => {
    sections.push(`<section><h2>Footer Official Logo ${index + 1}</h2>${field("Label", `footer.officialLogos.${index}.label`, data)}${field("URL", `footer.officialLogos.${index}.url`, data, "url")}${imageField("Logo SVG/image", `footer.officialLogos.${index}.image`, data)}</section>`);
  });
  data.footer.social.forEach((_, index) => {
    sections.push(`<section><h2>Social ${index + 1}</h2>${field("Label", `footer.social.${index}.label`, data)}${field("URL", `footer.social.${index}.url`, data, "url")}</section>`);
  });

  res.send(
    adminShell(`<header class="admin-header"><h1>Site Manager</h1><div><a href="/" target="_blank">View site</a><form method="post" action="/manager/logout"><button>Logout</button></form></div></header><form class="admin-form" method="post" action="/manager" enctype="multipart/form-data">${sections.join("")}<button class="save-button">Save Changes</button></form>`)
  );
});

app.post("/manager", requireAdmin, upload.any(), (req, res) => {
  const data = readContent();
  Object.entries(req.body).forEach(([name, value]) => {
    setByPath(data, name, value);
  });
  req.files.forEach((file) => {
    setByPath(data, file.fieldname, `/uploads/${file.filename}`);
  });
  data.location.lat = Number(data.location.lat);
  data.location.lng = Number(data.location.lng);
  data.location.zoom = Number(data.location.zoom);
  writeContent(data);
  res.redirect("/manager?saved=1");
});

app.listen(port, () => {
  console.log(`Cherry Street Commons site running on http://localhost:${port}`);
});
