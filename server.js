const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Sustainability", href: "/sustainability" },
  { label: "Community", href: "/community" },
  { label: "Floor Plans", href: "/floor-plans" },
  { label: "Contact", href: "/contact" }
];

const pages = {
  "/about": {
    title: "About Cherry Street Commons",
    eyebrow: "Affordable homes with everyday access",
    body:
      "Cherry Street Commons is planned around practical, welcoming homes for residents who want stability, comfort, and connection. The property brings together thoughtful layouts, accessible paths, and shared spaces that support daily life.",
    cards: [
      ["Resident first", "Homes and common areas are arranged for clear navigation, comfort, and everyday convenience."],
      ["Built for access", "The site emphasizes walkability, transit-friendly living, and approachable application guidance."],
      ["Long-term value", "Durable materials and efficient systems help keep the community reliable over time."]
    ]
  },
  "/sustainability": {
    title: "Sustainability",
    eyebrow: "Efficient living, responsible choices",
    body:
      "The community is shaped by resource-conscious decisions, from energy-aware building practices to landscape choices that make the property easier to maintain and more pleasant to live in.",
    cards: [
      ["Energy smart", "Efficient fixtures and systems are intended to reduce waste and support resident affordability."],
      ["Healthy grounds", "Landscaping is planned to provide shade, soften the site, and create a calmer street presence."],
      ["Lower impact", "Shared amenities and compact layouts help make daily living more efficient."]
    ]
  },
  "/community": {
    title: "Community",
    eyebrow: "A place to feel connected",
    body:
      "Cherry Street Commons is designed to support a balanced neighborhood experience, with places to gather, clear outdoor circulation, and a residential scale that feels approachable.",
    cards: [
      ["Gathering areas", "Shared spaces encourage neighborly connection without overwhelming private residential life."],
      ["Neighborhood scale", "The property is designed to feel grounded in the surrounding community."],
      ["Everyday support", "Clear contact paths help applicants and residents get information when they need it."]
    ]
  },
  "/floor-plans": {
    title: "Floor Plans",
    eyebrow: "Simple layouts for real daily needs",
    body:
      "Floor plan details can be presented by bedroom count, availability, and household needs. Applicants can contact the property team for current availability and eligibility requirements.",
    cards: [
      ["One bedroom", "Efficient private homes for individuals or smaller households."],
      ["Two bedroom", "Balanced layouts with more room for daily routines."],
      ["Accessible options", "Select homes may support accessibility needs. Contact the property team for details."]
    ]
  },
  "/contact": {
    title: "Contact",
    eyebrow: "Apply or ask a question",
    body:
      "Use the application button or contact the property team to learn about availability, income guidelines, required documents, and next steps for Cherry Street Commons.",
    cards: [
      ["Apply online", "Start the application process and receive next-step instructions."],
      ["Ask about eligibility", "Confirm household, income, and document requirements before applying."],
      ["Visit the property", "Use the map to locate Cherry Street Commons and plan your visit."]
    ]
  }
};

app.use(express.static(path.join(__dirname, "public")));

function renderLayout({ title, content, activePath = "/", home = false }) {
  const nav = navItems
    .map((item) => {
      const active = item.href === activePath ? " active" : "";
      return `<a class="nav-link${active}" href="${item.href}">${item.label}</a>`;
    })
    .join("");

  const footer = home
    ? ""
    : `<footer class="site-footer">
        <p>Cherry Street Commons</p>
        <a href="/contact">Contact the property team</a>
      </footer>`;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <meta name="description" content="Affordable homes at Cherry Street Commons.">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/css/styles.css">
      <script src="/js/site.js" defer></script>
    </head>
    <body>
      <header class="site-header">
        <div class="header-inner">
          <div class="brand-row">
            <button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" data-menu-button>
              <span></span><span></span><span></span>
            </button>
            <a class="brand" href="/">
              <span class="brand-mark">CS</span>
              <span>
                <strong>Cherry Street</strong>
                <small>Affordable Homes</small>
              </span>
            </a>
          </div>
          <nav class="desktop-nav" aria-label="Primary navigation">${nav}</nav>
        </div>
      </header>
      <aside class="side-menu" aria-hidden="true" data-side-menu>
        <div class="side-menu-top">
          <span class="brand-mark">CS</span>
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

function mapSection() {
  return `<section class="map-section" aria-label="Property location">
    <div class="map-copy">
      <p class="eyebrow">Location</p>
      <h2>Find Cherry Street Commons</h2>
      <p>Use the interactive map to locate the property and plan your route.</p>
    </div>
    <iframe
      title="Map to Cherry Street Commons"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=1244%20Cherry%20Street&output=embed"></iframe>
  </section>`;
}

app.get("/", (_req, res) => {
  const content = `<section class="hero-slider" aria-label="Featured property">
    <div class="slide active" style="background-image:url('/assets/hero-cherry.png')">
      <div class="hero-content">
        <p class="eyebrow">Affordable Homes</p>
        <h1>Cherry Street Commons</h1>
        <p>Modern, welcoming homes designed for comfort, access, and community.</p>
        <a class="primary-button" href="/contact">Apply for the Property</a>
      </div>
    </div>
    <div class="slide" style="background-image:url('/assets/hero-cherry.png')">
      <div class="hero-content">
        <p class="eyebrow">Now welcoming applicants</p>
        <h1>A practical place to call home</h1>
        <p>Thoughtful layouts, shared green space, and a location built around daily needs.</p>
        <a class="primary-button" href="/floor-plans">View Floor Plans</a>
      </div>
    </div>
    <div class="slide" style="background-image:url('/assets/hero-cherry.png')">
      <div class="hero-content">
        <p class="eyebrow">Connected living</p>
        <h1>Comfort with community nearby</h1>
        <p>Explore affordable housing created for stability, belonging, and long-term value.</p>
        <a class="primary-button" href="/about">Learn More</a>
      </div>
    </div>
    <div class="slider-dots" aria-label="Banner controls">
      <button class="dot active" type="button" aria-label="Show slide 1"></button>
      <button class="dot" type="button" aria-label="Show slide 2"></button>
      <button class="dot" type="button" aria-label="Show slide 3"></button>
    </div>
  </section>
  <section class="intro">
    <p class="eyebrow">Welcome home</p>
    <h2>Affordable homes planned around real life.</h2>
    <p>Cherry Street Commons brings together comfortable residences, useful community spaces, and a simple path for applicants who want a clear next step.</p>
  </section>
  <section class="home-cards" aria-label="Property highlights">
    <article><span>01</span><h3>Affordable Living</h3><p>Homes designed to support household budgets without sacrificing comfort.</p></article>
    <article><span>02</span><h3>Community Spaces</h3><p>Outdoor and shared areas give residents room to connect and recharge.</p></article>
    <article><span>03</span><h3>Efficient Design</h3><p>Durable finishes and efficient systems support responsible long-term living.</p></article>
    <article><span>04</span><h3>Easy Application</h3><p>A direct application path helps residents understand eligibility and next steps.</p></article>
  </section>
  ${mapSection()}`;

  res.send(renderLayout({ title: "Cherry Street Commons | Affordable Homes", content, activePath: "/", home: true }));
});

Object.entries(pages).forEach(([route, page]) => {
  app.get(route, (_req, res) => {
    const cardMarkup = page.cards
      .map(([heading, text]) => `<article><h3>${heading}</h3><p>${text}</p></article>`)
      .join("");

    const content = `<section class="subpage-hero">
        <p class="eyebrow">${page.eyebrow}</p>
        <h1>${page.title}</h1>
        <p>${page.body}</p>
        <a class="primary-button" href="/contact">Apply for the Property</a>
      </section>
      <section class="subpage-cards">${cardMarkup}</section>
      ${route === "/contact" ? mapSection() : ""}`;

    res.send(renderLayout({ title: `${page.title} | Cherry Street Commons`, content, activePath: route }));
  });
});

app.listen(port, () => {
  console.log(`Cherry Street Commons site running on http://localhost:${port}`);
});
