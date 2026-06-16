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
