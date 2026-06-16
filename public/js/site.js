const menuButton = document.querySelector("[data-menu-button]");
const closeButton = document.querySelector("[data-close-menu]");
const sideMenu = document.querySelector("[data-side-menu]");
const backdrop = document.querySelector("[data-menu-backdrop]");

function setMenu(open) {
  if (!sideMenu || !backdrop || !menuButton) return;
  sideMenu.classList.toggle("open", open);
  backdrop.classList.toggle("open", open);
  sideMenu.setAttribute("aria-hidden", String(!open));
  menuButton.setAttribute("aria-expanded", String(open));
}

menuButton?.addEventListener("click", () => setMenu(true));
closeButton?.addEventListener("click", () => setMenu(false));
backdrop?.addEventListener("click", () => setMenu(false));

document.querySelectorAll(".nav-apply[href='#'], .primary-button[href='#'], .footer-cta[href='#']").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

const slides = Array.from(document.querySelectorAll(".slide"));
const dots = Array.from(document.querySelectorAll(".dot"));
let activeSlide = 0;

function showSlide(index) {
  if (!slides.length) return;
  activeSlide = index % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === activeSlide);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === activeSlide);
  });
}

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => showSlide(index));
});

if (slides.length > 1) {
  setInterval(() => showSlide(activeSlide + 1), 6000);
}

function initPropertyMap() {
  const mapElement = document.getElementById("property-map");
  if (!mapElement || !window.L) return;

  const location = window.siteLocation || {};
  const propertyCenter = [Number(location.lat || 37.5049699), Number(location.lng || -122.2601696)];
  const map = L.map(mapElement, {
    scrollWheelZoom: false,
    zoomControl: true
  }).setView(propertyCenter, Number(location.zoom || 14));

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const marker = L.divIcon({
    className: "property-marker",
    html: "<span></span>",
    iconSize: [28, 38],
    iconAnchor: [14, 38]
  });

  L.marker(propertyCenter, { icon: marker })
    .addTo(map)
    .bindPopup(`<strong>Cherry Street Commons</strong><br>${location.address || "1244 Cherry Street, San Carlos, CA"}`);
}

window.addEventListener("load", initPropertyMap);
