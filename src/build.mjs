import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { destinations, pages, site, villa } from "./content.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "src");
const dist = join(root, "dist");
const assetVersion = "20261029-destinations";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const iconPaths = {
  arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  diagonal: '<path d="M7 17 17 7M8 7h9v9"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  compass: '<circle cx="12" cy="12" r="8"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/>',
  leaf: '<path d="M20 4C12 4 5 7 5 14c0 2 1 4 3 5 1-6 5-9 9-11-3 3-6 7-7 12 7 1 10-5 10-16Z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18c5 0 2-8 7-8h1M8 6h3c3 0 3 4 1 5"/>',
  bird: '<path d="M4 16c5-1 7-4 8-8 2 3 4 4 8 4-2 2-4 3-7 3-2 3-5 4-9 1Z"/><path d="M12 8c-1-2-1-3 0-5 2 1 3 3 3 5"/>',
  home: '<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  phone: '<path d="M8 3 5 4c-1 1 0 5 3 9s7 7 9 7l2-3-4-3-2 2c-2-1-4-3-5-5l2-2-2-6Z"/>',
  whatsapp: '<path d="M20 11.5a8 8 0 0 1-12 7l-4 1 1-4a8 8 0 1 1 15-4Z"/><path d="M9 8c1 3 2 4 5 5l1-1 2 1c0 2-1 3-3 3-4-1-7-4-7-8 0-1 1-2 2-2l1 2-1 0Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 6c3 0 5 2 5 5M16 14c3 0 5 2 5 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  quote: '<path d="M7 10H4c0-4 2-6 6-7v2c-2 1-3 2-3 5v7H2v-7h5Zm12 0h-3c0-4 2-6 6-7v2c-2 1-3 2-3 5v7h-5v-7h5Z"/>'
};

function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
}

function localizedPath(path, locale = "es") {
  if (locale !== "en") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

function nav(pageKey, locale = "es") {
  const destinationActive = pageKey === "destinations" || pageKey.startsWith("destination-");
  const otherLocale = locale === "es" ? "en" : "es";
  const currentPath = pageKey === "404" ? "/" : (pages[pageKey]?.path || (pageKey.startsWith("destination-") ? `/destinations/${pageKey.replace("destination-", "")}/` : "/"));
  const languagePath = localizedPath(currentPath, otherLocale);
  return `<header class="site-header" data-site-header>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="header-inner">
      <a class="brand" href="/" aria-label="Inca Holidays home">
        <img src="/assets/images/brand-idol.png" width="46" height="62" alt="" aria-hidden="true">
        <span><strong>Inca Holidays</strong><small>Ecuador · Galapagos</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="${localizedPath("/destinations/", locale)}" ${destinationActive ? 'aria-current="page"' : ""}>Destinations</a>
        <a href="${localizedPath("/villa-doris/", locale)}" ${pageKey === "villa" ? 'aria-current="page"' : ""}>Villa Doris</a>
        <a href="${localizedPath("/about/", locale)}" ${pageKey === "about" ? 'aria-current="page"' : ""}>About</a>
      </nav>
      <div class="header-actions"><a class="language-switch" href="__LANGUAGE_PATH__" aria-label="${locale === "es" ? "Switch to English" : "Cambiar a español"}">${locale === "es" ? "EN" : "ES"}</a><a class="header-cta" href="${localizedPath("/plan-your-trip/", locale)}">Plan your trip ${icon("arrow")}</a></div>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" data-menu-toggle>
        <span class="menu-open">${icon("menu")}</span><span class="menu-close">${icon("close")}</span>
      </button>
    </div>
    <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" aria-hidden="true" data-mobile-menu>
      <a href="${localizedPath("/", locale)}">Home <span>00</span></a>
      <a href="${localizedPath("/destinations/", locale)}">Destinations <span>01–04</span></a>
      <a href="${localizedPath("/villa-doris/", locale)}">Villa Doris <span>05</span></a>
      <a href="${localizedPath("/about/", locale)}">About <span>06</span></a>
      <a href="${localizedPath("/plan-your-trip/", locale)}">Plan your trip ${icon("diagonal")}</a>
    </nav>
  </header>`;
}

function footer(locale = "es") {
  return `<footer class="site-footer">
    <div class="footer-lead shell">
      <div>
        <span class="eyebrow light">From Quito to the islands</span>
        <h2>Begin with a conversation.</h2>
      </div>
      <a class="circle-link" href="${localizedPath("/plan-your-trip/", locale)}" aria-label="Plan your trip">${icon("diagonal")}</a>
    </div>
    <div class="footer-grid shell">
      <div class="footer-brand">
        <img src="/assets/images/brand-idol.png" width="66" height="89" alt="Inca Holidays ceremonial gold figure">
        <p>Tailor-made cultural and soft-adventure journeys for independent travelers and small groups.</p>
      </div>
      <div>
        <h3>Explore</h3>
        ${destinations.map(d => `<a href="${localizedPath(`/destinations/${d.slug}/`, locale)}">${d.name}</a>`).join("")}
        <a href="${localizedPath("/villa-doris/", locale)}">Villa Doris</a>
      </div>
      <div>
        <h3>Contact</h3>
        <a href="mailto:${site.emailHref}">${site.email}</a>
        <a href="mailto:${site.emailHref}">${site.emailSecondary}</a>
        <a href="tel:${site.phoneHref}">${site.phoneDisplay}</a>
        <a href="https://wa.me/${site.whatsappHref}" rel="noopener">WhatsApp ${site.whatsappDisplay}</a>
        <span>${site.location}</span>
      </div>
      <div class="footer-note">
        <h3>Travel thoughtfully</h3>
        <p>Every itinerary begins with the places, people and pace that matter to you.</p>
        <a href="${localizedPath("/plan-your-trip/", locale)}">Request a custom itinerary ${icon("arrow")}</a>
      </div>
    </div>
    <div class="footer-bottom shell">
      <span>© ${new Date().getFullYear()} Inca Holidays</span>
      <div><a href="${localizedPath("/privacy/", locale)}">Privacy</a><a href="${localizedPath("/terms/", locale)}">Website terms</a></div>
      <span>Quito, Ecuador</span>
    </div>
  </footer>`;
}

function picture(base, widths, alt, options = {}) {
  const largest = widths.at(-1);
  const srcset = widths.map(width => `/assets/images/${base}-${width}.webp ${width}w`).join(", ");
  return `<picture>
    <img src="/assets/images/${base}-${largest}.webp" srcset="${srcset}" sizes="${options.sizes || "100vw"}" alt="${escapeHtml(alt)}" width="${largest}" height="${Math.round(largest * (options.ratio || .667))}" ${options.priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--media-position:${options.position || "50% 50%"}">
  </picture>`;
}

function pageHero({ eyebrow, title, copy, hero, widths, position, alt, credit, compact = false }) {
  return `<section class="page-hero ${compact ? "page-hero--compact" : ""}">
    <div class="page-hero__media" data-parallax-media>${picture(hero, widths, alt, { priority: true, position, ratio: .68 })}</div>
    <div class="page-hero__shade"></div>
    <div class="page-hero__content shell">
      <span class="eyebrow light reveal">${eyebrow}</span>
      <h1 class="reveal">${title}</h1>
      ${copy ? `<p class="reveal">${copy}</p>` : ""}
    </div>
    ${credit ? `<span class="photo-credit">${credit}</span>` : ""}
    <a class="scroll-cue" href="#story" aria-label="Continue to the story"><span></span>Scroll to discover</a>
  </section>`;
}

function destinationTile(d, index) {
  const sizes = index === 0 ? "(max-width: 760px) 100vw, 62vw" : "(max-width: 760px) 100vw, 38vw";
  return `<article class="destination-tile destination-tile--${index + 1} reveal">
    <a href="/destinations/${d.slug}/" aria-label="Explore ${d.name}">
      <div class="destination-tile__image">${picture(d.hero, d.heroWidths, `${d.name}, Ecuador`, { position: d.heroPosition, sizes, ratio: index === 0 ? .78 : .94 })}</div>
      <div class="destination-tile__overlay"></div>
      <span class="destination-tile__number">${d.number}</span>
      <div class="destination-tile__copy"><span>${d.eyebrow}</span><h3>${d.name}</h3><p>${d.short}</p></div>
      <span class="destination-tile__link">Explore ${icon("diagonal")}</span>
    </a>
  </article>`;
}

function gallery(items, variant = "") {
  return `<div class="gallery-grid${variant ? ` gallery-grid--${variant}` : ""}">
    ${items.map(([file, alt], index) => `<button class="gallery-item gallery-item--${(index % 4) + 1} reveal" type="button" data-gallery-item data-src="/assets/images/${file}" data-alt="${escapeHtml(alt)}" aria-label="Open image: ${escapeHtml(alt)}">
      <img src="/assets/images/${file}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">${variant === "villa" ? "" : `
      <span class="gallery-item__number">${String(index + 1).padStart(2, "0")}</span>`}
    </button>`).join("")}
  </div>`;
}

function finalCta(kicker = "Your journey, made personal", title = "Tell us what you want to discover.") {
  return `<section class="final-cta">
    <div class="final-cta__line" aria-hidden="true"></div>
    <div class="shell final-cta__inner reveal">
      <span class="eyebrow">${kicker}</span>
      <h2>${title}</h2>
      <p>Share your dates, interests and travel style. We will use them to begin shaping a journey around you.</p>
      <a class="button button--ink" href="/plan-your-trip/">Request a custom itinerary ${icon("arrow")}</a>
    </div>
  </section>`;
}

function homePage() {
  return `<main id="main">
    <section class="home-hero">
      <div class="home-hero__media" data-parallax-media>${picture("hero-andes", [1200, 2400], "Cotopaxi volcano rising above Ecuador's Andean landscape", { priority: true, position: "50% 50%", ratio: .667 })}</div>
      <div class="home-hero__wash"></div>
      <div class="home-hero__content shell">
        <span class="eyebrow light reveal">Private journeys through Ecuador & Galapagos</span>
        <h1 class="reveal"><span>Travel deeper</span><em>into Ecuador.</em></h1>
        <p class="reveal">Cultural encounters, soft adventure and tailor-made routes for independent travelers and small groups.</p>
        <div class="hero-actions reveal"><a class="button button--light" href="/plan-your-trip/">Plan your trip ${icon("arrow")}</a><a class="text-link light" href="/destinations/">Explore destinations ${icon("diagonal")}</a></div>
      </div>
      <div class="hero-index shell" aria-label="Featured destinations">
        ${destinations.map(d => `<a href="/destinations/${d.slug}/"><span>${d.number}</span>${d.name}</a>`).join("")}
      </div>
      <span class="photo-credit">Hero photograph: Andres Medina / Unsplash</span>
    </section>

    <section class="intro-section section" id="story">
      <div class="shell intro-grid">
        <div class="intro-image"><img src="/assets/images/about-local-connection.webp" alt="A traveler sharing a warm moment with an Indigenous woman in Ecuador" loading="eager" decoding="async"><span>People before places</span></div>
        <div class="intro-copy">
          <span class="eyebrow reveal">Ecuador, known from within</span>
          <h2 class="reveal">The celebrated wonders. The quiet corners. The stories in between.</h2>
          <div class="intro-copy__body reveal"><p>Inca Holidays creates cultural and soft-adventure experiences that balance Ecuador's highlights with the less-known places that make a journey feel personal.</p><a class="text-link" href="/about/">Meet Inca Holidays ${icon("arrow")}</a></div>
        </div>
      </div>
    </section>

    <section class="destinations-section section">
      <div class="shell section-heading split-heading">
        <div><span class="eyebrow reveal">Four distinct worlds</span><h2 class="reveal">Choose a direction.<br>We will shape the route.</h2></div>
        <p class="reveal">From volcanic islands to cloud forest, each region offers a different way into Ecuador.</p>
      </div>
      <div class="shell destination-grid">${destinations.map(destinationTile).join("")}</div>
    </section>

    <section class="custom-section section">
      <div class="shell custom-grid">
        <div class="custom-copy reveal">
          <span class="eyebrow light">Tailor-made by design</span>
          <h2>No fixed formula.<br>One considered journey.</h2>
          <p>Start with the landscapes and experiences that draw you in. Inca Holidays brings them into a balanced itinerary, with the duration and pace adapted to your trip.</p>
          <a class="button button--light" href="/plan-your-trip/">Start planning ${icon("arrow")}</a>
        </div>
        <ol class="process-list">
          <li class="reveal"><span>01</span><div><h3>Tell us what moves you</h3><p>Share your dates, interests, group and preferred rhythm.</p></div>${icon("compass")}</li>
          <li class="reveal"><span>02</span><div><h3>Shape the route together</h3><p>Balance signature places with quieter, authentic experiences.</p></div>${icon("route")}</li>
          <li class="reveal"><span>03</span><div><h3>Travel with local knowledge</h3><p>Arrive with a journey built around Ecuador, not around a template.</p></div>${icon("leaf")}</li>
        </ol>
      </div>
    </section>

    <section class="experience-section section">
      <div class="shell section-heading"><span class="eyebrow reveal">A richer way to travel</span><h2 class="reveal">Small moments make the distance worthwhile.</h2></div>
      <div class="experience-collage shell">
        <figure class="experience-collage__large reveal"><img src="/assets/images/amazon-macaw.webp" alt="Scarlet macaw in the Ecuadorian Amazon" loading="lazy"><figcaption>Wildlife that rewards patience</figcaption></figure>
        <blockquote class="experience-quote reveal">${icon("quote")}<p>“A balance between the highlights and the off-the-beaten-path gems of Ecuador.”</p><cite>Inca Holidays brochure</cite></blockquote>
        <figure class="experience-collage__small reveal"><img src="/assets/images/andes-festival.webp" alt="Traditional dancing in Ecuador's highlands" loading="lazy"><figcaption>Culture with context</figcaption></figure>
      </div>
    </section>

    <section class="villa-feature section">
      <div class="shell villa-feature__grid">
        <div class="villa-feature__media reveal"><img src="/assets/images/hero-villa-1600.webp" srcset="/assets/images/hero-villa-1200.webp 1200w, /assets/images/hero-villa-1600.webp 1600w" sizes="(max-width: 800px) 100vw, 58vw" alt="Villa Doris country house in the green landscape of Nono" loading="lazy"><span>Nono · Choco Andino</span></div>
        <div class="villa-feature__copy reveal"><span class="eyebrow">Stay close to nature</span><h2>Villa Doris</h2><p>A country house surrounded by the biodiversity and village life of Nono, presented in the brochure as a welcoming place to begin or end an Ecuador journey.</p><a class="button button--ink" href="/villa-doris/">Discover Villa Doris ${icon("arrow")}</a></div>
      </div>
    </section>

    <section class="responsibility-section">
      <div class="shell responsibility-grid">
        <div class="responsibility-symbol reveal">${icon("leaf", "icon icon--xl")}</div>
        <div class="reveal"><span class="eyebrow light">Travel with care</span><h2>Nature, hospitality and community belong in the same story.</h2></div>
        <p class="reveal">The brochure places responsible travel at the heart of Amazon lodging choices and Villa Doris's relationship with its local community. That perspective guides how these journeys are presented.</p>
      </div>
    </section>
    ${finalCta()}
  </main>`;
}

function destinationsPage() {
  return `<main id="main">
    ${pageHero({ eyebrow: "Ecuador in four directions", title: "One small country. Four immense worlds.", copy: "Explore the archipelago, highlands, rainforest and cloud forest, then bring them together in a journey shaped around you.", hero: "hero-galapagos", widths: [1200,2400], position: "50% 44%", alt: "Giant tortoise in the Galapagos highlands", credit: "Hero photograph: Bjarn Bronsveld / Unsplash" })}
    <section class="atlas-section section" id="story">
      <div class="shell atlas-intro"><span class="eyebrow reveal">The destination atlas</span><p class="reveal">Each region stands on its own. Together, they reveal the remarkable range of Ecuador.</p></div>
      <div class="shell atlas-list">
        ${destinations.map(d => `<article class="atlas-row reveal">
          <a href="/destinations/${d.slug}/">
            <span class="atlas-row__number">${d.number}</span>
            <div class="atlas-row__image">${picture(d.hero,d.heroWidths,`${d.name}, Ecuador`,{position:d.heroPosition,sizes:"(max-width: 760px) 100vw, 35vw",ratio:.68})}</div>
            <div class="atlas-row__copy"><span>${d.eyebrow}</span><h2>${d.name}</h2><p>${d.short}</p></div>
            <span class="atlas-row__arrow">${icon("diagonal")}</span>
          </a>
        </article>`).join("")}
      </div>
    </section>
    ${finalCta("Combine regions", "Let Ecuador unfold one landscape at a time.")}
  </main>`;
}

function destinationPage(d) {
  return `<main id="main">
    ${pageHero({ eyebrow: `${d.number} · ${d.eyebrow}`, title: d.title, copy: d.short, hero: d.hero, widths: d.heroWidths, position: d.heroPosition, alt: `${d.name}, Ecuador`, credit: d.credit })}
    <section class="destination-story section" id="story">
      <div class="shell story-grid">
        <div class="story-index reveal"><span>${d.number}</span><div></div><small>${d.name}</small></div>
        <div class="story-lead reveal"><span class="eyebrow">The experience</span><h2>${d.intro}</h2></div>
        <div class="story-detail reveal"><p>${d.detail}</p><a class="text-link" href="/plan-your-trip/?destination=${d.slug}">Include ${d.name} in your trip ${icon("arrow")}</a></div>
      </div>
    </section>
    <section class="experience-list-section section section--muted">
      <div class="shell section-heading split-heading"><div><span class="eyebrow reveal">Ways to explore</span><h2 class="reveal">Designed around<br>how you travel.</h2></div><p class="reveal">These are the ingredients documented in the Inca Holidays brochure. Your itinerary can bring them together in a way that suits your time and interests.</p></div>
      <div class="shell experience-list">
        ${d.experiences.map(([title,copy],index)=>`<article class="experience-row reveal"><span>${String(index+1).padStart(2,"0")}</span><h3>${title}</h3><p>${copy}</p>${icon(index % 2 ? "route" : "compass")}</article>`).join("")}
      </div>
    </section>
    <section class="gallery-section section">
      <div class="shell section-heading"><span class="eyebrow reveal">A sense of place</span><h2 class="reveal">Look closer.</h2></div>
      <div class="shell">${gallery(d.gallery)}</div>
    </section>
    ${finalCta(`Build a journey with ${d.name}`, "Make this landscape part of your story.")}
  </main>`;
}

function villaPage() {
  return `<main id="main">
    ${pageHero({ eyebrow: "Nono · Choco Andino cloud forest", title: villa.title, copy: "Our own country house, shared with the warmth and care we would offer invited friends.", hero: "hero-villa", widths: [1200,1600], position: "50% 46%", alt: "Villa Doris country house in Nono, Ecuador" })}
    <section class="destination-story section" id="story">
      <div class="shell story-grid"><div class="story-index reveal"><span>05</span><div></div><small>Villa Doris</small></div><div class="story-lead reveal"><span class="eyebrow">A stay with context</span><h2>${villa.intro}</h2></div><div class="story-detail reveal"><p>${villa.detail}</p><a class="text-link" href="/plan-your-trip/?destination=villa-doris">Ask about Villa Doris ${icon("arrow")}</a></div></div>
    </section>
    <section class="villa-landscape section section--muted">
      <div class="shell villa-landscape__grid">
        <div class="villa-landscape__image reveal"><img src="/assets/images/villa-landscape.webp" alt="Villa Doris within the green Andean landscape" loading="lazy"></div>
        <div class="villa-landscape__copy reveal"><span class="eyebrow">Cloud-forest setting</span><h2>Close to Quito.<br>Surrounded by another rhythm.</h2><p>Villa Doris sits in the Choco Andino cloud forest, about a 30-minute drive from Quito. Close enough to reach with ease, it feels like a quieter world and a natural beginning or final chapter for an Ecuador journey.</p>${icon("home", "icon icon--xl")}</div>
      </div>
      <div class="shell experience-list villa-highlights">${villa.highlights.map(([title,copy],index)=>`<article class="experience-row reveal"><span>${String(index+1).padStart(2,"0")}</span><h3>${title}</h3><p>${copy}</p>${icon(index === 0 ? "bird" : index === 1 ? "pin" : index === 2 ? "home" : "leaf")}</article>`).join("")}</div>
    </section>
    <section class="gallery-section gallery-section--villa section" aria-label="Villa Doris photo gallery"><div class="shell">${gallery(villa.gallery, "villa")}</div></section>
    ${finalCta("Stay at Villa Doris", "Begin or end your Ecuador journey in Nono.")}
  </main>`;
}

function aboutPage() {
  return `<main id="main">
    <section class="about-hero">
      <div class="shell about-hero__grid">
        <div class="about-hero__copy"><span class="eyebrow reveal">About Inca Holidays</span><h1 class="reveal">Ecuador is not a list of places. It is a network of stories.</h1><p class="reveal">Inca Holidays creates cultural and soft-adventure experiences for independent travelers and small groups, balancing well-known highlights with Ecuador's quieter corners.</p></div>
        <div class="about-hero__image reveal"><img src="/assets/images/about-local-connection.webp" alt="A traveler and an Indigenous Ecuadorian woman sharing a warm moment" fetchpriority="high"><span>Local knowledge. Personal journeys.</span></div>
      </div>
    </section>
    <section class="about-statement section" id="story"><div class="shell about-statement__grid"><span class="eyebrow reveal">What guides the work</span><h2 class="reveal">Know the wonders.<br>Know the corners.<br>Know the secrets.</h2><div class="reveal"><p>The brochure describes a custom-design approach: journeys that connect Ecuador's headline landscapes with off-the-beaten-path experiences, shaped for the people taking them.</p><p>That approach is especially suited to travelers who want nature, culture and soft adventure without losing the human scale of the journey.</p></div></div></section>
    <section class="values-section section section--muted"><div class="shell values-grid">
      <article class="reveal"><span>01</span>${icon("compass","icon icon--lg")}<h3>Designed, not packaged</h3><p>The itinerary begins with your interests, duration and preferred pace.</p></article>
      <article class="reveal"><span>02</span>${icon("route","icon icon--lg")}<h3>Highlights and hidden corners</h3><p>Signature places are balanced with quieter routes and local context.</p></article>
      <article class="reveal"><span>03</span>${icon("leaf","icon icon--lg")}<h3>Nature with responsibility</h3><p>Conservation and community matter in the choices described by the brochure.</p></article>
    </div></section>
    <section class="contact-band"><div class="shell contact-band__grid"><div><span class="eyebrow light">Based in Quito</span><h2>Close to the journey from its first idea.</h2></div><div><p>Speak with Inca Holidays about the regions, experiences and pace you want.</p><a class="button button--light" href="/plan-your-trip/">Start the conversation ${icon("arrow")}</a></div></div></section>
    ${finalCta()}
  </main>`;
}

function planPage() {
  const checks = destinations.map(d => `<label class="check-card"><input type="checkbox" name="destinations" value="${d.name}"><span class="check-mark"></span><strong>${d.name}</strong><small>${d.eyebrow}</small></label>`).join("");
  return `<main id="main" class="plan-page">
    <section class="plan-intro"><div class="shell"><span class="eyebrow reveal">Plan your trip</span><h1 class="reveal">Tell us where your curiosity leads.</h1><p class="reveal">Share the outline of your trip. The details below will open a pre-filled email to Inca Holidays so you can review and send it from your own email account.</p></div></section>
    <section class="plan-form-section section" id="story"><div class="shell plan-grid">
      <aside class="plan-aside reveal"><span class="eyebrow">Direct contact</span><h2>Prefer to talk first?</h2><p>Contact Inca Holidays in Quito through the details published in the brochure.</p><a href="mailto:${site.emailHref}">${icon("mail")}<span><small>Email</small>${site.email}</span></a><a href="mailto:${site.emailHref}">${icon("mail")}<span><small>Direct inbox</small>${site.emailSecondary}</span></a><a href="tel:${site.phoneHref}">${icon("phone")}<span><small>Phone</small>${site.phoneDisplay}</span></a><a href="https://wa.me/${site.whatsappHref}" rel="noopener">${icon("whatsapp")}<span><small>WhatsApp</small>${site.whatsappDisplay}</span></a><div class="aside-note">${icon("pin")}<span><small>Based in</small>${site.location}</span></div></aside>
      <form class="trip-form reveal" data-trip-form novalidate>
        <div class="form-step"><span>01</span><div><h2>About you</h2><p>Who should we contact about this journey?</p></div></div>
        <div class="form-row"><label>Full name <input type="text" name="name" autocomplete="name" required><span class="field-error"></span></label><label>Email <input type="email" name="email" autocomplete="email" required><span class="field-error"></span></label></div>
        <div class="form-row"><label>WhatsApp with country code <input type="tel" name="whatsapp" autocomplete="tel" placeholder="+1 415 555 0142" required><span class="field-error"></span></label><label>Number of travelers <input type="number" name="travelers" min="1" max="30" inputmode="numeric" required><span class="field-error"></span></label></div>
        <div class="form-step form-step--spaced"><span>02</span><div><h2>Where would you like to go?</h2><p>Select every region that interests you.</p></div></div>
        <fieldset class="destination-checks"><legend class="sr-only">Destinations of interest</legend>${checks}<label class="check-card"><input type="checkbox" name="destinations" value="Villa Doris"><span class="check-mark"></span><strong>Villa Doris</strong><small>Country house in Nono</small></label></fieldset><span class="group-error" data-destination-error></span>
        <div class="form-step form-step--spaced"><span>03</span><div><h2>Shape the journey</h2><p>Approximate information is enough to begin.</p></div></div>
        <div class="form-row"><label>Approximate start <input type="month" name="start" required><span class="field-error"></span></label><label>Approximate end <input type="month" name="end"><span class="field-error"></span></label></div>
        <label>Preferred experience <select name="experience" required><option value="">Choose one</option><option>Cultural experiences</option><option>Soft adventure</option><option>Nature and wildlife</option><option>Birdwatching</option><option>A balanced mix</option></select><span class="field-error"></span></label>
        <label>Comments or preferences <textarea name="comments" rows="6" placeholder="Tell us about your interests, pace, mobility needs, celebrations or anything else that would help shape the route."></textarea><span class="field-error"></span></label>
        <label class="consent"><input type="checkbox" name="consent" required><span class="check-mark"></span><span>I agree to use these details to prepare and send an enquiry to Inca Holidays.</span></label><span class="field-error consent-error"></span>
        <label class="honeypot" aria-hidden="true">Company website <input type="text" name="company_website" tabindex="-1" autocomplete="off"></label>
        <button class="button button--ink submit-button" type="submit"><span>Prepare my trip request</span>${icon("arrow")}</button>
        <div class="form-status" role="status" aria-live="polite" data-form-status></div>
      </form>
    </div></section>
  </main>`;
}

function privacyPage() {
  return `<main id="main" class="legal-page"><section class="legal-hero"><div class="shell"><span class="eyebrow">Website information</span><h1>Privacy notice</h1><p>Last reviewed for this website draft: October 26, 2026.</p></div></section><section class="legal-content section"><div class="shell legal-grid"><aside><a href="#enquiries">Trip enquiries</a><a href="#contact">Contact</a><a href="#choices">Your choices</a></aside><article><h2 id="enquiries">Trip enquiries</h2><p>The trip form prepares an email draft in your own email application. This website does not store the form details in a database. Your information is sent only when you choose to send the email to Inca Holidays.</p><h2 id="contact">Contact information</h2><p>Use <a href="mailto:${site.emailHref}">${site.email}</a> or <a href="mailto:${site.emailHref}">${site.emailSecondary}</a> for questions about information you have shared with Inca Holidays.</p><h2 id="choices">Your choices</h2><p>You can contact Inca Holidays directly without using the form. Do not include sensitive personal or payment information in an initial enquiry.</p><p class="legal-note">This notice describes the behavior of this website draft. It should be reviewed by the business before the final domain launch.</p></article></div></section></main>`;
}

function termsPage() {
  return `<main id="main" class="legal-page"><section class="legal-hero"><div class="shell"><span class="eyebrow">Website information</span><h1>Website terms</h1><p>Plain-language terms for this website draft.</p></div></section><section class="legal-content section"><div class="shell legal-grid"><aside><a href="#information">Travel information</a><a href="#enquiries">Enquiries</a><a href="#imagery">Imagery</a></aside><article><h2 id="information">Travel information</h2><p>The website introduces the destinations and experiences documented in the Inca Holidays brochure. It does not display prices, live availability, confirmed bookings or automatic reservations.</p><h2 id="enquiries">Enquiries are not bookings</h2><p>Submitting or emailing a trip request begins a conversation. A booking exists only after Inca Holidays provides and confirms the relevant commercial terms directly with you.</p><h2 id="imagery">Photography</h2><p>Destination photography is illustrative of the documented regions. Villa Doris photography is drawn from verified property material supplied through the brochure and the existing Inca Holidays website.</p><p class="legal-note">These draft terms should be reviewed by the business before the final domain launch.</p></article></div></section></main>`;
}

const spanishTranslations = [
  ["Tailor-made journeys through Ecuador and the Galapagos Islands", "Viajes a medida por Ecuador y las islas Galápagos"],
  ["Private journeys through Ecuador & Galapagos", "Viajes privados por Ecuador y Galápagos"],
  ["Destinations", "Destinos"], ["About", "Nosotros"], ["Plan your trip", "Planifica tu viaje"], ["Home", "Inicio"], ["Explore destinations", "Explora los destinos"],
  ["Skip to content", "Ir al contenido"], ["Close menu", "Cerrar menú"], ["Open menu", "Abrir menú"], ["Ecuador · Galapagos", "Ecuador · Galápagos"],
  ["From Quito to the islands", "De Quito a las islas"], ["Begin with a conversation.", "Comienza con una conversación."],
  ["Tailor-made cultural and soft-adventure journeys for independent travelers and small groups.", "Viajes culturales y de aventura suave, diseñados para viajeros independientes y grupos pequeños."],
  ["Explore", "Explora"], ["Contact", "Contacto"], ["Travel thoughtfully", "Viaja con conciencia"], ["Every itinerary begins with the places, people and pace that matter to you.", "Cada itinerario comienza con los lugares, las personas y el ritmo que te importan."], ["Request a custom itinerary", "Solicita un itinerario a medida"], ["Privacy", "Privacidad"], ["Website terms", "Términos del sitio"], ["Quito, Ecuador", "Quito, Ecuador"],
  ["Private journeys through Ecuador & Galapagos", "Viajes privados por Ecuador y Galápagos"], ["Travel deeper", "Viaja más profundo"], ["into Ecuador.", "por Ecuador."], ["Cultural encounters, soft adventure and tailor-made routes for independent travelers and small groups.", "Encuentros culturales, aventura suave y rutas a medida para viajeros independientes y grupos pequeños."], ["Explore destinations", "Explora los destinos"],
  ["People before places", "Las personas antes que los lugares"], ["Ecuador, known from within", "Ecuador, conocido desde dentro"], ["The celebrated wonders. The quiet corners. The stories in between.", "Las maravillas célebres. Los rincones tranquilos. Las historias entre ambos."], ["Inca Holidays creates cultural and soft-adventure experiences that balance Ecuador's highlights with the less-known places that make a journey feel personal.", "Inca Holidays crea experiencias culturales y de aventura suave que equilibran los grandes atractivos de Ecuador con lugares menos conocidos que hacen que cada viaje sea personal."], ["Meet Inca Holidays", "Conoce Inca Holidays"],
  ["Four distinct worlds", "Cuatro mundos distintos"], ["Choose a direction.", "Elige una dirección."], ["We will shape the route.", "Nosotros trazaremos la ruta."], ["From volcanic islands to cloud forest, each region offers a different way into Ecuador.", "De las islas volcánicas al bosque nublado, cada región ofrece una forma distinta de descubrir Ecuador."], ["Explore", "Explora"],
  ["Tailor-made by design", "Diseñado a tu medida"], ["No fixed formula.", "Sin fórmulas fijas."], ["One considered journey.", "Un viaje pensado para ti."], ["Start with the landscapes and experiences that draw you in. Inca Holidays brings them into a balanced itinerary, with the duration and pace adapted to your trip.", "Comienza con los paisajes y experiencias que te atraen. Inca Holidays los reúne en un itinerario equilibrado, con duración y ritmo adaptados a tu viaje."], ["Start planning", "Comienza a planificar"], ["Tell us what moves you", "Cuéntanos qué te inspira"], ["Share your dates, interests, group and preferred rhythm.", "Comparte tus fechas, intereses, grupo y ritmo preferido."], ["Shape the route together", "Diseñemos la ruta juntos"], ["Balance signature places with quieter, authentic experiences.", "Equilibra lugares emblemáticos con experiencias auténticas y tranquilas."], ["Travel with local knowledge", "Viaja con conocimiento local"], ["Arrive with a journey built around Ecuador, not around a template.", "Llega con un viaje construido alrededor de Ecuador, no de una plantilla."],
  ["A richer way to travel", "Una forma más profunda de viajar"], ["Small moments make the distance worthwhile.", "Los pequeños momentos hacen que la distancia valga la pena."], ["Wildlife that rewards patience", "Fauna que recompensa la paciencia"], ["Culture with context", "Cultura con contexto"], ["Stay close to nature", "Quédate cerca de la naturaleza"], ["A country house surrounded by the biodiversity and village life of Nono, presented in the brochure as a welcoming place to begin or end an Ecuador journey.", "Una casa de campo rodeada por la biodiversidad y la vida de Nono, presentada en el folleto como un lugar acogedor para comenzar o terminar un viaje por Ecuador."], ["Discover Villa Doris", "Descubre Villa Doris"], ["Travel with care", "Viaja con cuidado"], ["Nature, hospitality and community belong in the same story.", "La naturaleza, la hospitalidad y la comunidad forman parte de la misma historia."], ["The brochure places responsible travel at the heart of Amazon lodging choices and Villa Doris's relationship with its local community. That perspective guides how these journeys are presented.", "El folleto sitúa el viaje responsable en el centro de las decisiones de alojamiento en la Amazonía y de la relación de Villa Doris con su comunidad local. Esa perspectiva guía la forma en que presentamos estos viajes."], ["Your journey, made personal", "Tu viaje, hecho personal"], ["Tell us what you want to discover.", "Cuéntanos qué quieres descubrir."], ["Share your dates, interests and travel style. We will use them to begin shaping a journey around you.", "Comparte tus fechas, intereses y estilo de viaje. Los usaremos para empezar a diseñar un viaje alrededor de ti."],
  ["Ecuador in four directions", "Ecuador en cuatro direcciones"], ["One small country. Four immense worlds.", "Un país pequeño. Cuatro mundos inmensos."], ["Explore the archipelago, highlands, rainforest and cloud forest, then bring them together in a journey shaped around you.", "Explora el archipiélago, las tierras altas, la selva y el bosque nublado, y únelos en un viaje diseñado para ti."], ["The destination atlas", "El atlas de destinos"], ["Each region stands on its own. Together, they reveal the remarkable range of Ecuador.", "Cada región tiene su propia esencia. Juntas revelan la extraordinaria diversidad de Ecuador."], ["Combine regions", "Combina regiones"], ["Let Ecuador unfold one landscape at a time.", "Deja que Ecuador se revele paisaje a paisaje."],
  ["The experience", "La experiencia"], ["Include", "Incluye"], ["Ways to explore", "Formas de explorar"], ["Designed around", "Diseñado según"], ["how you travel.", "tu forma de viajar."], ["These are the ingredients documented in the Inca Holidays brochure. Your itinerary can bring them together in a way that suits your time and interests.", "Estos son los ingredientes que aparecen en el folleto de Inca Holidays. Tu itinerario puede reunirlos de una forma que se adapte a tu tiempo e intereses."], ["A sense of place", "El espíritu del lugar"], ["Look closer.", "Mira más de cerca."], ["Build a journey with", "Construye un viaje con"], ["Make this landscape part of your story.", "Haz que este paisaje sea parte de tu historia."],
  ["A stay with context", "Una estancia con contexto"], ["Ask about Villa Doris", "Pregunta por Villa Doris"], ["Cloud-forest setting", "Entorno de bosque nublado"], ["Close to Quito.<br>Surrounded by another rhythm.", "Cerca de Quito.<br>Rodeada de otro ritmo."], ["Villa Doris, from within", "Villa Doris, por dentro"], ["A place close to our hearts.", "Un lugar que llevamos en el corazón."], ["Walk through the house, gardens and valley that make Villa Doris feel like home. Select any photograph to see it in full.", "Recorre la casa, los jardines y el valle que hacen de Villa Doris un hogar. Selecciona cualquier fotografía para verla en detalle."], ["Stay at Villa Doris", "Alójate en Villa Doris"], ["Begin or end your Ecuador journey in Nono.", "Comienza o termina tu viaje por Ecuador en Nono."],
  ["About Inca Holidays", "Sobre Inca Holidays"], ["Ecuador is not a list of places. It is a network of stories.", "Ecuador no es una lista de lugares. Es una red de historias."], ["Inca Holidays creates cultural and soft-adventure experiences for independent travelers and small groups, balancing well-known highlights with Ecuador's quieter corners.", "Inca Holidays crea experiencias culturales y de aventura suave para viajeros independientes y grupos pequeños, equilibrando los lugares conocidos con los rincones más tranquilos de Ecuador."], ["Local knowledge. Personal journeys.", "Conocimiento local. Viajes personales."], ["What guides the work", "Lo que guía nuestro trabajo"], ["Know the wonders.<br>Know the corners.<br>Know the secrets.", "Conoce las maravillas.<br>Conoce los rincones.<br>Conoce los secretos."], ["Designed, not packaged", "Diseñado, no empaquetado"], ["Highlights and hidden corners", "Lugares destacados y rincones ocultos"], ["Nature with responsibility", "Naturaleza con responsabilidad"], ["Based in Quito", "Con sede en Quito"], ["Close to the journey from its first idea.", "Cerca del viaje desde su primera idea."], ["Speak with Inca Holidays about the regions, experiences and pace you want.", "Habla con Inca Holidays sobre las regiones, experiencias y ritmo que deseas."], ["Start the conversation", "Comienza la conversación"],
  ["Plan your trip", "Planifica tu viaje"], ["Tell us where your curiosity leads.", "Cuéntanos adónde te lleva tu curiosidad."], ["Share the outline of your trip. The details below will open a pre-filled email to Inca Holidays so you can review and send it from your own email account.", "Comparte la idea general de tu viaje. Los datos siguientes abrirán un correo preparado para Inca Holidays, para que puedas revisarlo y enviarlo desde tu propia cuenta."], ["Direct contact", "Contacto directo"], ["Prefer to talk first?", "¿Prefieres hablar primero?"], ["Contact Inca Holidays in Quito through the details published in the brochure.", "Contacta con Inca Holidays en Quito usando los datos publicados en el folleto."], ["Email", "Correo electrónico"], ["Phone", "Teléfono"], ["Based in", "Con sede en"], ["About you", "Sobre ti"], ["Who should we contact about this journey?", "¿Con quién debemos contactar sobre este viaje?"], ["Full name", "Nombre completo"], ["WhatsApp with country code", "WhatsApp con código de país"], ["Number of travelers", "Número de viajeros"], ["Where would you like to go?", "¿Adónde te gustaría ir?"], ["Select every region that interests you.", "Selecciona cada región que te interese."], ["Country house in Nono", "Casa de campo en Nono"], ["Shape the journey", "Diseña el viaje"], ["Approximate information is enough to begin.", "La información aproximada es suficiente para comenzar."], ["Approximate start", "Inicio aproximado"], ["Approximate end", "Fin aproximado"], ["Preferred experience", "Experiencia preferida"], ["Choose one", "Elige una"], ["Cultural experiences", "Experiencias culturales"], ["Soft adventure", "Aventura suave"], ["Nature and wildlife", "Naturaleza y fauna"], ["Birdwatching", "Observación de aves"], ["A balanced mix", "Una combinación equilibrada"], ["Comments or preferences", "Comentarios o preferencias"], ["Prepare my trip request", "Preparar mi solicitud de viaje"], ["Please review the highlighted fields.", "Revisa los campos destacados."], ["This field is required.", "Este campo es obligatorio."], ["Select at least one destination.", "Selecciona al menos un destino."], ["Please confirm before preparing the email.", "Confirma antes de preparar el correo."], ["The end month must be after the start month.", "El mes de finalización debe ser posterior al de inicio."], ["Creating a pre-filled email for your review.", "Creando un correo preparado para que lo revises."], ["Your request is ready.", "Tu solicitud está lista."], ["Review and send it from your email application.", "Revísala y envíala desde tu aplicación de correo."], ["Open the email draft", "Abrir el borrador de correo"],
  ["Privacy notice", "Aviso de privacidad"], ["Website information", "Información del sitio"], ["Trip enquiries", "Consultas de viaje"], ["Your choices", "Tus opciones"], ["Contact information", "Información de contacto"], ["Website terms", "Términos del sitio web"], ["Plain-language terms for this website draft.", "Términos claros para este borrador del sitio web."], ["Travel information", "Información de viaje"], ["Enquiries are not bookings", "Las consultas no son reservas"], ["Photography", "Fotografía"], ["Page not found", "Página no encontrada"], ["The trail ends here", "El sendero termina aquí"], ["This page has wandered off route.", "Esta página se ha desviado de la ruta."], ["Return to the destination atlas or begin planning a new journey.", "Vuelve al atlas de destinos o comienza a planificar un nuevo viaje."], ["Return home", "Volver al inicio"], ["Explore destinations", "Explora los destinos"],
  ["Galapagos", "Galápagos"], ["Andes & Highlands", "Andes y tierras altas"], ["Amazon Rainforest", "Selva amazónica"], ["Nono Cloud Forest", "Bosque nublado de Nono"], ["Cruises & island hopping", "Cruceros y rutas entre islas"], ["Volcanoes, heritage & living culture", "Volcanes, patrimonio y cultura viva"], ["Biodiversity & conservation", "Biodiversidad y conservación"], ["A hidden Andean paradise", "Un paraíso andino escondido"], ["Wildlife encounters shaped around your pace.", "Encuentros con la fauna al ritmo que elijas."], ["Where altitude reveals a living history.", "Donde la altura revela una historia viva."], ["Enter one of the planet's richest ecosystems.", "Entra en uno de los ecosistemas más ricos del planeta."], ["Cloud forest, hummingbirds and village life.", "Bosque nublado, colibríes y vida de pueblo."], ["Cruises and island-hopping journeys amid volcanic landscapes and endemic wildlife.", "Cruceros y viajes entre islas, entre paisajes volcánicos y fauna endémica."], ["Snow-capped volcanoes, colonial haciendas, markets and communities across Ecuador's highlands.", "Volcanes nevados, haciendas coloniales, mercados y comunidades en las tierras altas de Ecuador."], ["Guided jungle walks, quiet canoe rides, birdwatching and cultural experiences in the rainforest.", "Caminatas guiadas por la selva, paseos tranquilos en canoa, observación de aves y experiencias culturales en la Amazonía."], ["Two- and three-day journeys from Quito into a natural and cultural landscape in the Andean cloud forest.", "Viajes de dos y tres días desde Quito hacia un paisaje natural y cultural en el bosque nublado andino."], ["The Galapagos Islands reward unhurried exploration.", "Las islas Galápagos recompensan la exploración sin prisa."], ["Volcanic landscapes", "Paisajes volcánicos"], ["Colonial haciendas", "Haciendas coloniales"], ["Markets & heritage", "Mercados y patrimonio"], ["Local cultures", "Culturas locales"], ["Guided walks", "Caminatas guiadas"], ["Canoe journeys", "Viajes en canoa"], ["Wildlife & birds", "Fauna y aves"], ["Cultural connection", "Conexión cultural"], ["Two or three days", "Dos o tres días"], ["Active exploration", "Exploración activa"], ["Birdlife", "Vida de aves"], ["Local life", "Vida local"], ["Cruises", "Cruceros"], ["Island hopping", "Ruta entre islas"], ["Endemic wildlife", "Fauna endémica"], ["Flexible duration", "Duración flexible"]
];

spanishTranslations.push(
  ["Our home in the cloud forest.", "Nuestra casa en el bosque nublado."],
  ["Nono · Choco Andino cloud forest", "Nono · Bosque nublado del Chocó Andino"],
  ["Our own country house, shared with the warmth and care we would offer invited friends.", "Nuestra propia casa de campo, compartida con la calidez y el cuidado que ofreceríamos a nuestros amigos."],
  ["Villa Doris is Inca Holidays' own country house in Nono, surrounded by the nature of the Choco Andino cloud forest and connected to the biodiversity, food and people of the valley.", "Villa Doris es la casa de campo propia de Inca Holidays en Nono, rodeada por la naturaleza del bosque nublado del Chocó Andino y conectada con la biodiversidad, la gastronomía y la gente del valle."],
  ["Because Villa Doris is ours, every stay feels personal. It is a place we know by heart and love to share: warm Ecuadorian hospitality, generous gardens, local flavors and the cloud forest just beyond the door.", "Como Villa Doris es nuestra, cada estadía se siente personal. Es un lugar que conocemos de memoria y nos encanta compartir: hospitalidad ecuatoriana, jardines generosos, sabores locales y el bosque nublado al otro lado de la puerta."],
  ["Between valley and cloud forest", "Entre el valle y el bosque nublado"], ["The house", "La casa"], ["Gardens in bloom", "Jardines en flor"], ["Wake to the garden", "Despertar frente al jardín"], ["Gather around the table", "Reunirse alrededor de la mesa"], ["Country character", "Carácter de campo"], ["A warm corner", "Un rincón cálido"], ["Slow mornings", "Mañanas sin prisa"], ["A room with a view", "Una habitación con vista"], ["Room to breathe", "Espacio para respirar"], ["Tea beneath the trees", "Té bajo los árboles"], ["Wild neighbors", "Vecinos silvestres"], ["Cloud-forest wings", "Alas del bosque nublado"], ["The Nono valley", "El valle de Nono"], ["Rest in the quiet", "Descansar en la calma"], ["Space to share", "Espacio para compartir"],
  ["Open image:", "Abrir imagen:"], ["Previous image", "Imagen anterior"], ["Next image", "Imagen siguiente"],
  ["Close image", "Cerrar imagen"],
  ["Villa Doris sits in the Choco Andino cloud forest, about a 30-minute drive from Quito. Close enough to reach with ease, it feels like a quieter world and a natural beginning or final chapter for an Ecuador journey.", "Villa Doris se encuentra en el bosque nublado del Chocó Andino, a unos 30 minutos de Quito. Está lo suficientemente cerca para llegar con facilidad, pero se siente como un mundo más tranquilo y como el inicio o cierre natural de un viaje por Ecuador."],
  ["Nature at the door", "Naturaleza en la puerta"], ["Gardens, mountain air and a landscape rich in birdlife surround the property.", "Jardines, aire de montaña y un paisaje rico en aves rodean la propiedad."], ["Close to Quito", "Cerca de Quito"], ["The brochure places Villa Doris about a 30-minute drive from Quito.", "Villa Doris se encuentra a unos 30 minutos en auto de Quito."], ["Local hospitality", "Hospitalidad local"], ["The stay connects guests with Ecuadorian hospitality, food and nearby experiences.", "La estadía conecta a los huéspedes con la hospitalidad ecuatoriana, la gastronomía y las experiencias cercanas."], ["Responsible travel", "Viaje responsable"], ["The property is presented in the context of community development and responsible tourism.", "La propiedad forma parte de una visión de desarrollo comunitario y turismo responsable."],
  ["Villa Doris embraced by the green Nono valley", "Villa Doris abrazada por el verde valle de Nono"], ["The sunny terrace and main house at Villa Doris", "La terraza soleada y la casa principal de Villa Doris"], ["Flower garden and paths at Villa Doris", "Jardines de flores y senderos de Villa Doris"], ["Bright guest suite with garden views at Villa Doris", "Habitación luminosa con vista al jardín de Villa Doris"], ["Dining room framed by windows and greenery", "Comedor rodeado de ventanales y vegetación"], ["Stone cottage and red roof at Villa Doris", "Casa de piedra y techo rojo en Villa Doris"], ["Rustic living room with fireplace at Villa Doris", "Sala rústica con chimenea en Villa Doris"], ["Bathroom with a freestanding tub and valley light", "Baño con tina exenta y la luz del valle"], ["Guest room looking toward the Nono landscape", "Habitación con vista al paisaje de Nono"], ["Wide lawn and mature trees in the Villa Doris garden", "Amplio césped y árboles maduros en el jardín de Villa Doris"], ["Garden patio tucked among the trees", "Patio del jardín entre los árboles"], ["Blue bird among the branches near Villa Doris", "Ave azul entre las ramas cerca de Villa Doris"], ["Hummingbird feeding from a pink flower in Nono", "Colibrí alimentándose de una flor rosada en Nono"], ["Green valley and mountain landscape surrounding Villa Doris", "Valle verde y paisaje montañoso alrededor de Villa Doris"], ["Cozy bedroom with timber ceiling at Villa Doris", "Habitación acogedora con techo de madera en Villa Doris"], ["Spacious twin room with timber beams and garden windows", "Habitación doble amplia con vigas de madera y ventanas al jardín"],
  ["Inca Holidays creates cruises and island-hopping journeys that bring you close to the archipelago's wildlife and distinctive island landscapes.", "Inca Holidays crea cruceros y viajes entre islas que te acercan a la fauna del archipiélago y a sus paisajes únicos."],
  ["Packages begin at four days and can be adapted to the length of stay you want. The balance of islands, wildlife and time ashore is shaped around your travel style.", "Los programas comienzan en cuatro días y se adaptan a la duración de tu estancia. El equilibrio entre islas, fauna y tiempo en tierra se diseña según tu estilo de viaje."],
  ["Explore the archipelago by water, with each day opening onto a different island environment.", "Explora el archipiélago por agua y descubre cada día un entorno insular diferente."],
  ["Build a land-based journey across islands while keeping the experience personal and flexible.", "Construye un viaje terrestre entre islas, manteniendo una experiencia personal y flexible."],
  ["Look for giant tortoises, marine iguanas, sea lions and the birdlife that make the islands singular.", "Busca tortugas gigantes, iguanas marinas, lobos marinos y las aves que hacen únicas a estas islas."],
  ["Begin with four days and adapt the itinerary to the time you have available.", "Comienza con cuatro días y adapta el itinerario al tiempo que tengas disponible."],
  ["From the majestic Andes and snow-capped volcanoes to colonial-style haciendas and colorful markets, Ecuador's highlands hold layers of history, landscape and living culture.", "Desde los majestuosos Andes y los volcanes nevados hasta las haciendas de estilo colonial y los mercados coloridos, las tierras altas de Ecuador reúnen historia, paisaje y cultura viva."],
  ["Inca Holidays custom-designs experiences that take you into the heart of the region: its people, traditions, heritage and the quieter places between celebrated landmarks.", "Inca Holidays diseña experiencias a medida que te llevan al corazón de la región: su gente, tradiciones, patrimonio y los lugares tranquilos entre los grandes atractivos."],
  ["Travel through high-altitude scenery shaped by Ecuador's mountain corridor.", "Recorre paisajes de altura formados por el corredor montañoso de Ecuador."],
  ["Stay close to the character and history of the highlands in traditional settings.", "Acércate al carácter y la historia de las tierras altas en entornos tradicionales."],
  ["Meet the color, craft and everyday rhythms of Andean towns and markets.", "Conoce el color, la artesanía y los ritmos cotidianos de los pueblos y mercados andinos."],
  ["Create respectful encounters that connect landscape with the people who live there.", "Crea encuentros respetuosos que conecten el paisaje con las personas que lo habitan."],
  ["The Ecuadorian Amazon is an invitation to pay attention: to birds above the canopy, water moving beside a canoe and the extraordinary density of life within the forest.", "La Amazonía ecuatoriana invita a prestar atención: a las aves sobre el dosel, al agua junto a la canoa y a la extraordinaria densidad de vida del bosque."],
  ["Journeys can include guided jungle walks, tranquil canoe rides, wildlife and bird watching, storytelling and selected lodging considered for its environmental credibility and commitment to preserving the rainforest ecosystem.", "Los viajes pueden incluir caminatas guiadas por la selva, paseos tranquilos en canoa, observación de fauna y aves, relatos y alojamientos seleccionados por su compromiso ambiental y con la conservación de la selva."],
  ["Read the forest with guides who reveal the relationships hidden beneath the canopy.", "Lee el bosque junto a guías que revelan las relaciones ocultas bajo el dosel."],
  ["Move quietly along rainforest waterways and experience the landscape from the river.", "Avanza en silencio por los ríos de la selva y vive el paisaje desde el agua."],
  ["Observe the extraordinary diversity of species that inhabit Ecuador's Amazon basin.", "Observa la extraordinaria diversidad de especies que habitan la cuenca amazónica de Ecuador."],
  ["Include thoughtful experiences that place people and conservation within the same story.", "Incluye experiencias conscientes que sitúen a las personas y la conservación dentro de la misma historia."],
  ["Nono opens onto a greener, quieter Ecuador: folded cloud-forest valleys, hummingbirds, local food and the rhythms of a small Andean village.", "Nono abre la puerta a un Ecuador más verde y tranquilo: valles de bosque nublado, colibríes, comida local y los ritmos de un pequeño pueblo andino."],
  ["Two- and three-day inclusive tours depart from Quito and can bring together local encounters, cycling, horseback riding, hiking, birdwatching, a private bird sanctuary, food experiences and overnight stays at Villa Doris.", "Los tours inclusivos de dos y tres días salen de Quito y pueden reunir encuentros locales, ciclismo, cabalgatas, senderismo, observación de aves, un santuario privado, experiencias gastronómicas y noches en Villa Doris."],
  ["Leave Quito for a compact journey that still makes space for the valley's slower rhythm.", "Deja Quito para vivir un viaje breve que aún deja espacio al ritmo pausado del valle."],
  ["Cycle, ride on horseback or walk part of the hummingbird route toward the Tandayapa Valley.", "Pedalea, monta a caballo o camina parte de la ruta de colibríes hacia el valle de Tandayapa."],
  ["Watch hummingbirds and visit a private bird sanctuary within the cloud-forest landscape.", "Observa colibríes y visita un santuario privado de aves en el paisaje del bosque nublado."],
  ["Meet residents, enjoy local gastronomy and stay overnight at Villa Doris Country House.", "Conoce a los habitantes, disfruta la gastronomía local y pasa la noche en Villa Doris Country House."],
  ["Villa Doris is surrounded by nature in the Choco Andino cloud forest, close to Quito and connected to the biodiversity, food and people of Nono.", "Villa Doris está rodeada de naturaleza en el bosque nublado del Chocó Andino, cerca de Quito y conectada con la biodiversidad, la gastronomía y la gente de Nono."],
  ["The brochure presents Villa Doris as a place to begin or end an Ecuador journey: an expression of Ecuadorian hospitality with access to local gastronomy, excursions and the cloud-forest setting.", "El folleto presenta Villa Doris como un lugar para comenzar o terminar un viaje por Ecuador: una expresión de la hospitalidad ecuatoriana con acceso a gastronomía local, excursiones y al entorno del bosque nublado."],
  ["Scroll to discover", "Desplázate para descubrir"], ["A balance between the highlights and the off-the-beaten-path gems of Ecuador.", "Un equilibrio entre los lugares destacados y las joyas poco conocidas de Ecuador."], ["in your trip", "en tu viaje"], ["Hero photograph:", "Fotografía principal:"]
);

function translateToSpanish(html) {
  let translated = html;
  for (const [from, to] of [...spanishTranslations].sort((a, b) => b[0].length - a[0].length)) translated = translated.split(from).join(to);
  translated = translated.replaceAll("Contactoo", "Contacto").replaceAll("Contactoa", "Contacta");
  translated = translated.replace('<html lang="en">', '<html lang="es">');
  return translated;
}

function lightbox() {
  return `<dialog class="lightbox" data-lightbox><button class="lightbox__close" type="button" aria-label="Close image" data-lightbox-close>${icon("close")}</button><button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image" data-lightbox-prev>${icon("arrow")}</button><figure><img alt="" data-lightbox-image><small class="lightbox__count" data-lightbox-count></small></figure><button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image" data-lightbox-next>${icon("arrow")}</button></dialog>`;
}

const spanishMeta = {
  home: { title: "Viajes a medida por Ecuador y Galápagos", description: "Viajes privados a medida por las islas Galápagos, los Andes ecuatorianos, la Amazonía y el bosque nublado de Nono." },
  destinations: { title: "Destinos en Ecuador y Galápagos", description: "Explora viajes a medida por Galápagos, los Andes, la Amazonía y el bosque nublado de Nono." },
  "destination-galapagos": { title: "Viajes a medida por Galápagos", description: "Cruceros y viajes entre islas, entre paisajes volcánicos y fauna endémica." },
  "destination-andes": { title: "Viajes a medida por los Andes", description: "Volcanes nevados, haciendas coloniales, mercados y comunidades en las tierras altas de Ecuador." },
  "destination-amazon": { title: "Viajes a medida por la Amazonía", description: "Caminatas guiadas, paseos en canoa, observación de aves y experiencias culturales en la selva." },
  "destination-nono": { title: "Viajes a medida por Nono", description: "Viajes de dos y tres días al bosque nublado andino, con colibríes, vida local y naturaleza." },
  villa: { title: "Villa Doris en el bosque nublado de Nono", description: "Descubre Villa Doris, una casa de campo rodeada de naturaleza en el bosque nublado del Chocó Andino, cerca de Quito." },
  about: { title: "Sobre Inca Holidays", description: "Conoce Inca Holidays, una empresa de viajes de Quito que crea experiencias culturales, de aventura suave y viajes a medida." },
  plan: { title: "Planifica tu viaje a medida", description: "Cuéntale a Inca Holidays tus fechas, intereses y estilo de viaje para comenzar a diseñar tu itinerario." },
  privacy: { title: "Aviso de privacidad", description: "Cómo se gestiona la información de las consultas de viaje en el sitio web de Inca Holidays." },
  terms: { title: "Términos del sitio web", description: "Términos para utilizar el sitio web de Inca Holidays y enviar consultas de viaje." },
  404: { title: "Página no encontrada", description: "La página solicitada no se encuentra disponible." }
};

function baseHtml({ pageKey, title, description, path, main, image = "/assets/images/hero-andes-1200.webp", locale = "es" }) {
  const localizedMeta = locale === "es" ? (spanishMeta[pageKey] || { title, description }) : { title, description };
  const canonicalPath = locale === "en" ? localizedPath(path, "en") : path;
  const canonical = `${site.origin}${canonicalPath}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: site.name,
    url: site.origin,
    email: site.email,
    telephone: site.phoneDisplay,
    address: { "@type": "PostalAddress", addressLocality: "Quito", addressCountry: "EC" },
    areaServed: ["Ecuador", "Galapagos Islands"],
    description: locale === "es" ? spanishMeta.about.description : pages.about.description
  };
  const rendered = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(localizedMeta.title)} | ${site.name}</title>
  <meta name="description" content="${escapeHtml(localizedMeta.description)}">
  <meta name="theme-color" content="#20382b">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${escapeHtml(localizedMeta.title)}">
  <meta property="og:description" content="${escapeHtml(localizedMeta.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${site.origin}${image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/images/brand-idol.png" type="image/png">
  <link rel="preload" href="/assets/styles.css?v=${assetVersion}" as="style">
  <link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>
  <script src="/assets/app.js?v=${assetVersion}" type="module"></script>
</head>
<body data-page="${pageKey}" data-locale="${locale}">
  ${nav(pageKey, locale)}
  ${main}
  ${footer(locale)}
  ${lightbox()}
</body>
</html>`;
  const localized = locale === "es" ? translateToSpanish(rendered).replace("__LANGUAGE_PATH__", localizedPath(path, "en")) : rendered;
  if (locale !== "en") return localized;
  return localized.replaceAll('href="/', 'href="/en/').replaceAll('content="/', 'content="/en/').replaceAll('href="/en/assets/', 'href="/assets/').replaceAll('href="/en/en/', 'href="/en/').replace('__LANGUAGE_PATH__', localizedPath(path, "es"));
}

const outputPages = [
  { key: "home", ...pages.home, main: homePage() },
  { key: "destinations", ...pages.destinations, main: destinationsPage(), image: "/assets/images/hero-galapagos-1200.webp" },
  ...destinations.map(d => ({ key: `destination-${d.slug}`, path: `/destinations/${d.slug}/`, title: `${d.name} tailor-made journeys`, description: d.short, main: destinationPage(d), image: `/assets/images/${d.hero}-1200.webp` })),
  { key: "villa", ...pages.villa, main: villaPage(), image: "/assets/images/hero-villa-1200.webp" },
  { key: "about", ...pages.about, main: aboutPage(), image: "/assets/images/about-local-connection.webp" },
  { key: "plan", ...pages.plan, main: planPage() },
  { key: "privacy", ...pages.privacy, main: privacyPage() },
  { key: "terms", ...pages.terms, main: termsPage() }
];

async function writeRoute(route, html) {
  const routeDir = route === "/" ? dist : join(dist, route.replace(/^\//, ""));
  await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, "index.html"), html);
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "assets"), { recursive: true });
await cp(join(src, "assets"), join(dist, "assets"), { recursive: true });
await cp(join(src, "styles.css"), join(dist, "assets", "styles.css"));
await cp(join(src, "app.js"), join(dist, "assets", "app.js"));
await cp(join(root, ".openai"), join(dist, ".openai"), { recursive: true });
await mkdir(join(dist, "en"), { recursive: true });
await cp(join(src, "assets"), join(dist, "en", "assets"), { recursive: true });
await cp(join(src, "styles.css"), join(dist, "en", "assets", "styles.css"));
await cp(join(src, "app.js"), join(dist, "en", "assets", "app.js"));

for (const page of outputPages) {
  await writeRoute(page.path, baseHtml({ pageKey: page.key, title: page.title, description: page.description, path: page.path, main: page.main, image: page.image, locale: "es" }));
  await writeRoute(localizedPath(page.path, "en"), baseHtml({ pageKey: page.key, title: page.title, description: page.description, path: page.path, main: page.main, image: page.image, locale: "en" }));
}

const notFoundMain = `<main id="main" class="not-found"><div class="shell"><span class="not-found__number">404</span><span class="eyebrow">The trail ends here</span><h1>This page has wandered off route.</h1><p>Return to the destination atlas or begin planning a new journey.</p><div><a class="button button--ink" href="/">Return home ${icon("arrow")}</a><a class="text-link" href="/destinations/">Explore destinations ${icon("diagonal")}</a></div></div></main>`;
const notFoundEs = baseHtml({
  pageKey: "404",
  title: "Page not found",
  description: "The requested page could not be found.",
  path: "/404.html",
  main: notFoundMain,
  locale: "es"
});
const notFoundEn = baseHtml({
  pageKey: "404",
  title: "Page not found",
  description: "The requested page could not be found.",
  path: "/404.html",
  main: notFoundMain,
  locale: "en"
});
await writeFile(join(dist, "404.html"), notFoundEs);
await writeFile(join(dist, "en", "404.html"), notFoundEn);

const sitemapRoutes = outputPages.filter(p => !["privacy", "terms"].includes(p.key)).map(p => `${site.origin}${p.path}`);
await writeFile(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);

console.log(`Built ${outputPages.length} pages and 1 custom 404 page in ${dist}`);
