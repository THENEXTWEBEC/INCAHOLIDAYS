const header = document.querySelector("[data-site-header]");
const isSpanish = document.body?.dataset.locale !== "en";
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? (isSpanish ? "Cerrar menú" : "Close menu") : (isSpanish ? "Abrir menú" : "Open menu"));
  mobileMenu.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
}

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
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
