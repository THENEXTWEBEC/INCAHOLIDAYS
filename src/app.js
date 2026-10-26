const header = document.querySelector("[data-site-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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

if (!reduceMotion) {
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
const lightboxCaption = document.querySelector("[data-lightbox-caption]");

function closeLightbox() {
  lightbox?.close();
}

document.querySelectorAll("[data-gallery-item]").forEach(item => {
  item.addEventListener("click", () => {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;
    lightboxImage.src = item.dataset.src;
    lightboxImage.alt = item.dataset.alt;
    lightboxCaption.textContent = item.dataset.alt;
    lightbox.showModal();
  });
});

document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", event => {
  if (event.target === lightbox) closeLightbox();
});

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
        showError(field, "This field is required.");
        valid = false;
        firstInvalid ||= field;
      } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        showError(field, "Enter a valid email address.");
        valid = false;
        firstInvalid ||= field;
      }
    });

    const destinations = [...form.querySelectorAll('input[name="destinations"]:checked')];
    const destinationError = form.querySelector("[data-destination-error]");
    destinationError.textContent = "";
    if (!destinations.length) {
      destinationError.textContent = "Select at least one destination.";
      valid = false;
      firstInvalid ||= form.querySelector('input[name="destinations"]');
    }

    const consent = form.querySelector('input[name="consent"]');
    const consentError = form.querySelector(".consent-error");
    consentError.textContent = "";
    if (!consent.checked) {
      consent.setAttribute("aria-invalid", "true");
      consentError.textContent = "Please confirm before preparing the email.";
      valid = false;
      firstInvalid ||= consent;
    }

    const start = form.elements.start.value;
    const end = form.elements.end.value;
    if (start && end && end < start) {
      showError(form.elements.end, "The end month must be after the start month.");
      valid = false;
      firstInvalid ||= form.elements.end;
    }

    if (!valid) {
      status.className = "form-status";
      status.textContent = "Please review the highlighted fields.";
      firstInvalid?.focus();
      return;
    }

    if (form.elements.company_website.value) {
      form.reset();
      status.textContent = "Thank you. Your request has been prepared.";
      return;
    }

    submit.disabled = true;
    submitLabel.textContent = "Preparing your request";
    status.className = "form-status";
    status.textContent = "Creating a pre-filled email for your review.";

    const data = new FormData(form);
    const selectedDestinations = data.getAll("destinations").join(", ");
    const body = [
      "Hello Inca Holidays,",
      "",
      "I would like to begin planning a tailor-made journey.",
      "",
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `WhatsApp: ${data.get("whatsapp")}`,
      `Travelers: ${data.get("travelers")}`,
      `Destinations: ${selectedDestinations}`,
      `Approximate start: ${data.get("start")}`,
      `Approximate end: ${data.get("end") || "Flexible"}`,
      `Preferred experience: ${data.get("experience")}`,
      "",
      "Comments or preferences:",
      data.get("comments") || "No additional comments yet.",
      "",
      "Thank you."
    ].join("\n");
    const mailto = `mailto:info@incaholidays.com?subject=${encodeURIComponent(`Custom Ecuador itinerary request — ${data.get("name")}`)}&body=${encodeURIComponent(body)}`;

    window.setTimeout(() => {
      submit.disabled = false;
      submitLabel.textContent = "Prepare my trip request";
      status.className = "form-status is-success";
      status.innerHTML = `<strong>Your request is ready.</strong><br>Review and send it from your email application.<br><a href="${mailto}">Open the email draft</a>`;
      status.querySelector("a")?.focus();
    }, 450);
  });
}
