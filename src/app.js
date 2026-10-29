const header = document.querySelector("[data-site-header]");
const isSpanish = document.body?.dataset.locale !== "en";
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lockedScrollY = 0;
let menuPreviouslyFocused = null;

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  if (open) {
    menuPreviouslyFocused = document.activeElement;
    lockedScrollY = window.scrollY;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
  } else {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
  }
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? (isSpanish ? "Cerrar menú" : "Close menu") : (isSpanish ? "Abrir menú" : "Open menu"));
  mobileMenu.setAttribute("aria-hidden", String(!open));
  mobileMenu.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  if (open) mobileMenu.querySelector("a")?.focus();
  else menuPreviouslyFocused?.focus();
}

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
  if (event.key !== "Tab" || !document.body.classList.contains("menu-open")) return;
  const focusable = [...mobileMenu.querySelectorAll("a, button")].filter(item => !item.hasAttribute("disabled"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function syncHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 48);
}

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

const revealItems = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach(item => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: .08 });
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
    revealObserver.observe(item);
  });
}

if (!reduceMotion && !window.matchMedia("(pointer: coarse) and (max-width: 760px)").matches) {
  const parallaxItems = document.querySelectorAll("[data-parallax-media]");
  let ticking = false;
  const updateParallax = () => {
    const y = Math.min(window.scrollY * .085, 72);
    parallaxItems.forEach(item => item.style.setProperty("--parallax-y", `${y}px`));
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  }, { passive: true });
}

const journey = document.querySelector("[data-journey-hero]");
const landscapes = [...document.querySelectorAll("[data-landscape]")];
const journeyCta = document.querySelector("[data-journey-cta]");
const journeyCtaLabel = document.querySelector("[data-cta-label]");
const routePath = document.querySelector(".journey-route path");
const routeLabels = [...document.querySelectorAll(".journey-route span")];
const sceneLabel = document.querySelector("[data-scene-label]");
const sceneCount = document.querySelector("[data-scene-count]");
const worlds = document.querySelector(".worlds-section");
const worldTrack = document.querySelector(".worlds-track");
const worldProgress = document.querySelector(".worlds-progress span");
const memory = document.querySelector(".memory-section");

if (journey && !reduceMotion) {
  const sceneNames = isSpanish ? ["Chimborazo · 6.263 m", "Amazonía · Napo", "Costa · Chocó Andino", "Galápagos · Pacífico"] : ["Chimborazo · 6,263 m", "Amazon · Napo", "Coast · Chocó Andino", "Galápagos · Pacific"];
  const labels = isSpanish ? ["Descubre Ecuador", "Diseña tu ruta", "Planifica tu viaje"] : ["Discover Ecuador", "Design your route", "Plan your trip"];
  let scheduled = false;
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const paintJourney = () => {
    const bounds = journey.getBoundingClientRect();
    const progress = clamp01(-bounds.top / Math.max(1, bounds.height - window.innerHeight));
    const scene = Math.min(3, Math.floor(progress * 4));
    const blend = progress * 4 - scene;
    landscapes.forEach((layer, index) => {
      const opacity = index === scene ? 1 - blend * .78 : index === scene + 1 ? blend : index < scene ? 0 : 0;
      layer.style.opacity = String(Math.max(0, opacity));
      layer.style.transform = `scale(${1.08 - progress * .06}) translate3d(${(index - scene) * progress * -1.3}%,${-progress * (index + 1) * 1.2}%,0)`;
    });
    journey.style.setProperty("--fg-x", `${-progress * 30}px`);
    journey.querySelectorAll(".journey-copy h1 span, .journey-copy h1 em").forEach((word, index) => {
      const fade = Math.max(0, (progress - .12 - index * .025) / .28);
      word.style.transform = `translate3d(${index === 1 ? fade * 10 : 0}px,${fade * -28}px,0)`;
      word.style.filter = `blur(${Math.min(5, fade * 5)}px)`;
      word.style.opacity = String(Math.max(.45, 1 - fade * .5));
    });
    routePath?.style.setProperty("--route-draw", String(1200 * (1 - progress)));
    routeLabels.forEach((label, index) => label.style.setProperty("--route-opacity", progress > index * .23 + .08 ? "1" : "0"));
    if (journeyCtaLabel) journeyCtaLabel.textContent = progress < .34 ? labels[0] : progress < .7 ? labels[1] : labels[2];
    if (sceneLabel) sceneLabel.textContent = sceneNames[scene];
    if (sceneCount) sceneCount.textContent = `0${scene + 1} / 04`;
    scheduled = false;
  };
  const scheduleJourney = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(paintJourney); };
  window.addEventListener("scroll", scheduleJourney, { passive: true });
  window.addEventListener("resize", scheduleJourney, { passive: true });
  scheduleJourney();
}

if (worlds && worldTrack && !reduceMotion && !window.matchMedia("(max-width: 760px)").matches) {
  let scheduled = false;
  const paintWorlds = () => {
    const bounds = worlds.getBoundingClientRect();
    const distance = Math.max(1, worlds.offsetHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -bounds.top / distance));
    const travel = Math.max(0, worldTrack.scrollWidth - window.innerWidth * .86);
    worldTrack.style.setProperty("--worlds-x", `${-travel * progress}px`);
    worldProgress?.style.setProperty("--progress", `${progress * 100}%`);
    scheduled = false;
  };
  const schedule = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(paintWorlds); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}

if (!reduceMotion && memory) {
  let scheduled = false;
  const paintMemory = () => {
    const bounds = memory.getBoundingClientRect();
    memory.style.setProperty("--memory-y", `${Math.max(-24, Math.min(24, (bounds.top - window.innerHeight) * -.035))}px`);
    scheduled = false;
  };
  const schedule = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(paintMemory); };
  window.addEventListener("scroll", schedule, { passive: true });
  schedule();
}

const expeditionStops = document.querySelectorAll(".expedition-stop");
if (reduceMotion || !("IntersectionObserver" in window)) expeditionStops.forEach(stop => stop.classList.add("is-active"));
else {
  const stopObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("is-active");
  }), { threshold: .45 });
  expeditionStops.forEach(stop => stopObserver.observe(stop));
}

document.querySelectorAll(".compass-cta").forEach(button => {
  if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
  button.addEventListener("pointermove", event => {
    const rect = button.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    button.style.transform = `translate(${dx * .08}px,${dy * .08}px)`;
    button.querySelector(".icon")?.style.setProperty("transform", `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`);
  });
  button.addEventListener("pointerleave", () => { button.style.transform = ""; button.querySelector(".icon")?.style.removeProperty("transform"); });
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCount = document.querySelector("[data-lightbox-count]");
const galleryItems = [...document.querySelectorAll("[data-gallery-item]")];
let activeGalleryIndex = 0;
let lightboxTouchStart = 0;

function closeLightbox() {
  lightbox?.close();
}

function showGalleryImage(index) {
  if (!lightboxImage || !galleryItems.length) return;
  activeGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeGalleryIndex];
  lightboxImage.src = item.dataset.src;
  lightboxImage.alt = item.dataset.alt;
  if (lightboxCount) lightboxCount.textContent = `${String(activeGalleryIndex + 1).padStart(2, "0")} / ${String(galleryItems.length).padStart(2, "0")}`;
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (!lightbox || !lightboxImage) return;
    showGalleryImage(index);
    if (!lightbox.open) lightbox.showModal();
  });
});

document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showGalleryImage(activeGalleryIndex - 1));
document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showGalleryImage(activeGalleryIndex + 1));
lightbox?.addEventListener("click", event => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") showGalleryImage(activeGalleryIndex - 1);
  if (event.key === "ArrowRight") showGalleryImage(activeGalleryIndex + 1);
});
lightbox?.addEventListener("touchstart", event => {
  lightboxTouchStart = event.changedTouches[0]?.clientX || 0;
}, { passive: true });
lightbox?.addEventListener("touchend", event => {
  const distance = (event.changedTouches[0]?.clientX || 0) - lightboxTouchStart;
  if (Math.abs(distance) < 45) return;
  showGalleryImage(activeGalleryIndex + (distance < 0 ? 1 : -1));
}, { passive: true });

const form = document.querySelector("[data-trip-form]");

if (form) {
  const params = new URLSearchParams(window.location.search);
  const requestedDestination = params.get("destination");
  const destinationAliases = {
    galapagos: "Galapagos",
    andes: "Andes & Highlands",
    amazon: "Amazon Rainforest",
    nono: "Nono Cloud Forest",
    "villa-doris": "Villa Doris"
  };
  if (requestedDestination && destinationAliases[requestedDestination]) {
    const checkbox = [...form.querySelectorAll('input[name="destinations"]')]
      .find(input => input.value === destinationAliases[requestedDestination]);
    if (checkbox) checkbox.checked = true;
  }

  const clearError = field => {
    field.removeAttribute("aria-invalid");
    const error = field.closest("label")?.querySelector(".field-error");
    if (error) error.textContent = "";
  };

  const showError = (field, message) => {
    field.setAttribute("aria-invalid", "true");
    const error = field.closest("label")?.querySelector(".field-error");
    if (error) error.textContent = message;
  };

  form.querySelectorAll("input, select, textarea").forEach(field => {
    field.addEventListener("input", () => clearError(field));
    field.addEventListener("change", () => clearError(field));
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector('button[type="submit"]');
    const submitLabel = submit.querySelector("span");
    const fields = [...form.querySelectorAll("input[required], select[required], textarea[required]")];
    let valid = true;
    let firstInvalid = null;

    fields.forEach(field => {
      clearError(field);
      if (field.type === "checkbox") return;
      if (!field.value.trim()) {
        showError(field, isSpanish ? "Este campo es obligatorio." : "This field is required.");
        valid = false;
        firstInvalid ||= field;
      } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        showError(field, isSpanish ? "Introduce un correo válido." : "Enter a valid email address.");
        valid = false;
        firstInvalid ||= field;
      }
    });

    const destinations = [...form.querySelectorAll('input[name="destinations"]:checked')];
    const destinationError = form.querySelector("[data-destination-error]");
    destinationError.textContent = "";
    if (!destinations.length) {
      destinationError.textContent = isSpanish ? "Selecciona al menos un destino." : "Select at least one destination.";
      valid = false;
      firstInvalid ||= form.querySelector('input[name="destinations"]');
    }

    const consent = form.querySelector('input[name="consent"]');
    const consentError = form.querySelector(".consent-error");
    consentError.textContent = "";
    if (!consent.checked) {
      consent.setAttribute("aria-invalid", "true");
      consentError.textContent = isSpanish ? "Confirma antes de preparar el correo." : "Please confirm before preparing the email.";
      valid = false;
      firstInvalid ||= consent;
    }

    const start = form.elements.start.value;
    const end = form.elements.end.value;
    if (start && end && end < start) {
      showError(form.elements.end, isSpanish ? "El mes de finalización debe ser posterior al de inicio." : "The end month must be after the start month.");
      valid = false;
      firstInvalid ||= form.elements.end;
    }

    if (!valid) {
      status.className = "form-status";
      status.textContent = isSpanish ? "Revisa los campos destacados." : "Please review the highlighted fields.";
      firstInvalid?.focus();
      return;
    }

    if (form.elements.company_website?.value) {
      form.reset();
      status.textContent = "Thank you. Your request has been prepared.";
      return;
    }

    submit.disabled = true;
    submitLabel.textContent = isSpanish ? "Preparando tu solicitud" : "Preparing your request";
    status.className = "form-status";
    status.textContent = isSpanish ? "Creando un correo preparado para que lo revises." : "Creating a pre-filled email for your review.";

    const data = new FormData(form);
    const selectedDestinations = data.getAll("destinations").join(", ");
    const body = [
      isSpanish ? "Hola, Inca Holidays:" : "Hello Inca Holidays,",
      "",
      isSpanish ? "Me gustaría comenzar a planificar un viaje a medida." : "I would like to begin planning a tailor-made journey.",
      "",
      `${isSpanish ? "Nombre" : "Name"}: ${data.get("name")}`,
      `${isSpanish ? "Correo" : "Email"}: ${data.get("email")}`,
      `WhatsApp: ${data.get("whatsapp")}`,
      `${isSpanish ? "Viajeros" : "Travelers"}: ${data.get("travelers")}`,
      `${isSpanish ? "Destinos" : "Destinations"}: ${selectedDestinations}`,
      `${isSpanish ? "Inicio aproximado" : "Approximate start"}: ${data.get("start")}`,
      `${isSpanish ? "Fin aproximado" : "Approximate end"}: ${data.get("end") || (isSpanish ? "Flexible" : "Flexible")}`,
      `${isSpanish ? "Experiencia preferida" : "Preferred experience"}: ${data.get("experience")}`,
      "",
      isSpanish ? "Comentarios o preferencias:" : "Comments or preferences:",
      data.get("comments") || (isSpanish ? "Todavía no hay comentarios adicionales." : "No additional comments yet."),
      "",
      isSpanish ? "Gracias." : "Thank you."
    ].join("\n");
    const mailto = `mailto:incaholidays@yahoo.com?subject=${encodeURIComponent(`Custom Ecuador itinerary request — ${data.get("name")}`)}&body=${encodeURIComponent(body)}`;

    window.setTimeout(() => {
      submit.disabled = false;
      submitLabel.textContent = isSpanish ? "Preparar mi solicitud de viaje" : "Prepare my trip request";
      status.className = "form-status is-success";
      status.innerHTML = isSpanish ? `<strong>Tu solicitud está lista.</strong><br>Revísala y envíala desde tu aplicación de correo.<br><a href="${mailto}">Abrir el borrador de correo</a>` : `<strong>Your request is ready.</strong><br>Review and send it from your email application.<br><a href="${mailto}">Open the email draft</a>`;
      status.querySelector("a")?.focus();
    }, 450);
  });
}
