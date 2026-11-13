import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { destinations, pages, site, villa } from "./content.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "src");
const dist = join(root, "dist");
const assetVersion = "20261112-tour-programs";
const fullContent = JSON.parse(await readFile(join(src, "full-content.json"), "utf8"));
const fullContentEs = JSON.parse(await readFile(join(src, "full-content-es.json"), "utf8"));

const execFile = promisify(execFileCallback);
async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  await execFile("/bin/cp", ["-R", `${from}/.`, to]);
}

function amazonSource(locale = "en") {
  const content = locale === "es" ? fullContentEs : fullContent;
  if (content["Amazon Rainforest"]) return content["Amazon Rainforest"];
  const combined = content["Galápagos Islands"] || "";
  const start = combined.indexOf("Amazon Rainforest");
  const end = combined.indexOf("Galápagos Islands", start + 1);
  return start >= 0 ? combined.slice(start, end >= 0 ? end : combined.length) : "";
}

function itineraryDays(locale, heading, count) {
  const source = amazonSource(locale);
  const start = source.indexOf(heading);
  if (start < 0) return Array.from({ length: count }, () => "");
  const nextProgram = ["Amazon program", "Birding & Photography", "Amazon Adventure Experience", "Deep Jungle Experience", "La Selva Eco-Lodge", "Sani Lodge", "Galápagos Islands"]
    .map(label => source.indexOf(label, start + heading.length))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];
  const chunk = source.slice(start, nextProgram || source.length);
  const dayPattern = locale === "es" ? /Día\s+(\d+)\s*:\s*([^\n]*)/g : /Day\s+(\d+)\s*:\s*([^\n]*)/g;
  const matches = [...chunk.matchAll(dayPattern)];
  return Array.from({ length: count }, (_, index) => {
    const match = matches[index];
    if (!match) return "";
    const bodyStart = match.index + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? chunk.length;
    const body = chunk.slice(bodyStart, bodyEnd).trim().replace(/\s+/g, " ");
    return `${match[2].trim()}${body ? ` ${body}` : ""}`.trim();
  });
}

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
  plus: '<path d="M12 5v14M5 12h14"/>',
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
        <img src="/assets/images/brand-idol.webp" width="46" height="62" alt="" aria-hidden="true">
        <span><strong>Inca Holidays</strong><small>Ecuador · Galapagos</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="${localizedPath("/destinations/", locale)}" ${destinationActive ? 'aria-current="page"' : ""}>Destinations</a>
        <a href="${localizedPath("/destinations/#experiences", locale)}">Experiences</a>
        <a href="${localizedPath("/villa-doris/", locale)}" ${pageKey === "villa" ? 'aria-current="page"' : ""}>Villa Doris</a>
        <a href="${localizedPath("/about/", locale)}" ${pageKey === "about" ? 'aria-current="page"' : ""}>About</a>
      </nav>
      <div class="header-actions"><a class="language-switch" href="__LANGUAGE_PATH__" aria-label="${locale === "es" ? "Switch to English" : "Cambiar a español"}">${locale === "es" ? "EN" : "ES"}</a><a class="header-cta" href="${localizedPath("/plan-your-trip/", locale)}">Plan your trip ${icon("arrow")}</a></div>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" data-menu-toggle>
        <span class="menu-open">${icon("menu")}</span><span class="menu-close">${icon("close")}</span>
      </button>
    </div>
    <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" aria-hidden="true" data-mobile-menu>
      <a href="${localizedPath("/", locale)}">Home</a>
      <a href="${localizedPath("/destinations/", locale)}">Destinations <span>Galápagos · Andes · Amazon · Nono</span></a>
      <a href="${localizedPath("/destinations/#experiences", locale)}">Experiences <span>Lodges · cruises · stays</span></a>
      <a href="${localizedPath("/villa-doris/", locale)}">Villa Doris</a>
      <a href="${localizedPath("/about/", locale)}">About</a>
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
        <img src="/assets/images/brand-idol.webp" width="66" height="89" alt="Inca Holidays ceremonial gold figure" loading="lazy" decoding="async">
        <p>Tailor-made cultural and soft-adventure journeys for independent travelers and small groups.</p>
      </div>
      <div>
        <h3>Explore</h3>
        ${destinations.map(d => `<a href="${localizedPath(`/destinations/${d.slug}/`, locale)}">${d.name}</a>`).join("")}
        <a href="${localizedPath("/yacht-anahi/", locale)}">Yacht Anahi</a>
        <a href="${localizedPath("/endemic/", locale)}">Endemic</a>
        <a href="${localizedPath("/naturalist-expedition/", locale)}">Naturalist Expedition</a>
        <a href="${localizedPath("/darwins-steps/", locale)}">Darwin's Steps</a>
        <a href="${localizedPath("/villa-doris/", locale)}">Villa Doris</a>
      </div>
      <div>
        <h3>Contact</h3>
        <a href="mailto:${site.email}">${site.email}</a>
        <a href="mailto:${site.emailHref}">${site.emailSecondary}</a>
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
  if (/\.(?:jpe?g|png|webp)$/i.test(base)) {
    return `<img ${options.deferred ? "data-src" : "src"}="/assets/images/${base}" alt="${escapeHtml(alt)}" width="1600" height="900" ${options.priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--media-position:${options.position || "50% 50%"}">`;
  }
  const largest = widths.at(-1);
  const srcset = widths.map(width => `/assets/images/${base}-${width}.webp ${width}w`).join(", ");
  return `<picture>
    <img ${options.deferred ? "data-src" : "src"}="/assets/images/${base}-${largest}.webp" ${options.deferred ? "data-srcset" : "srcset"}="${srcset}" sizes="${options.sizes || "100vw"}" alt="${escapeHtml(alt)}" width="${largest}" height="${Math.round(largest * (options.ratio || .667))}" ${options.priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="--media-position:${options.position || "50% 50%"}">
  </picture>`;
}

function pageHero({ eyebrow, title, copy, hero, widths, position, alt, credit, compact = false, variant = "" }) {
  return `<section class="page-hero ${compact ? "page-hero--compact" : ""} ${variant ? `page-hero--${variant}` : ""}">
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

function destinationProgramLabel(d, locale = "es") {
  if (locale === "en") {
    return {
      galapagos: "Cruises and island hopping",
      andes: "Andean routes and living culture",
      amazon: "Amazon lodges and complete itineraries",
      nono: "Nono and the hummingbird route"
    }[d.slug];
  }
  return {
    galapagos: "Cruceros y rutas entre islas",
    andes: "Rutas andinas y cultura viva",
    amazon: "Lodges e itinerarios completos de la Amazonía",
    nono: "Nono y la ruta del colibrí"
  }[d.slug];
}

function destinationSequence(d, index, locale = "es") {
  const es = locale === "es";
  const galleryItems = d.gallery.slice(0, 3);
  return `<article class="destination-sequence reveal" id="${d.slug}">
    <div class="destination-sequence__number">${d.number}</div>
    <div class="destination-sequence__destination">
      <span class="eyebrow">${es ? "Destino" : "Destination"}</span>
      <h2>${d.name}</h2>
      <p>${d.short}</p>
      <a class="text-link" href="${localizedPath(`/destinations/${d.slug}/`, locale)}">${es ? "Ver destino" : "Explore destination"} ${icon("arrow")}</a>
    </div>
    <div class="destination-sequence__program">
      <span class="eyebrow">${es ? "Programa" : "Program"}</span>
      <h3>${destinationProgramLabel(d, locale)}</h3>
      <p>${es ? "Consulta el itinerario completo y adapta la duración a tu viaje." : "Open the complete itinerary and adapt the duration to your journey."}</p>
      <a class="text-link" href="${localizedPath(`/destinations/${d.slug}/`, locale)}#story">${es ? "Ver programas" : "View programs"} ${icon("diagonal")}</a>
    </div>
    <div class="destination-sequence__images">
      <span class="eyebrow">${es ? "Imágenes" : "Images"}</span>
      <div class="destination-sequence__gallery">${galleryItems.map(([file, alt]) => `<button type="button" data-gallery-item data-src="/assets/images/${file}" data-alt="${escapeHtml(alt)}" aria-label="${es ? "Abrir imagen" : "Open image"}: ${escapeHtml(alt)}"><img src="/assets/images/${file}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></button>`).join("")}</div>
    </div>
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
      <p>Tell us when and how you want to travel.</p>
      <a class="button button--ink" href="/plan-your-trip/">Request a custom itinerary ${icon("arrow")}</a>
    </div>
  </section>`;
}

function homePage() {
  return `<main id="main">
    <section class="journey-hero" data-journey-hero>
      <div class="journey-stage">
        <div class="journey-sky" aria-hidden="true"></div>
        <div class="journey-image journey-image--andes" data-landscape="0">${picture("hero-andes", [1200,2400], "Chimborazo above the Andean páramo", {priority:true, position:"50% 52%"})}</div>
        <div class="journey-image journey-image--amazon" data-landscape="1">${picture("hero-amazon-river.webp", [], "Amazon rainforest and river at dawn in Ecuador", {position:"50% 45%", deferred:true})}</div>
        <div class="journey-image journey-image--coast" data-landscape="2">${picture("hero-nono", [1200,2200], "Green Ecuadorian cloud forest", {position:"50% 50%", deferred:true})}</div>
        <div class="journey-image journey-image--islands" data-landscape="3">${picture("hero-galapagos", [1200,2400], "Volcanic shores of Galápagos", {position:"50% 46%", deferred:true})}</div>
        <div class="journey-shade"></div><div class="journey-foreground" aria-hidden="true"></div>
        <div class="journey-copy shell"><span class="eyebrow light">A medida · Ecuador y Galápagos</span><h1><span>Travel</span> <span>deeper</span><em>into Ecuador.</em></h1><p>Cultural encounters, soft adventure and considered routes for independent travelers and small groups.</p><div class="journey-actions"><a class="button button--light compass-cta" href="/destinations/" data-journey-cta><span data-cta-label>Explore destinations</span>${icon("compass")}</a><a class="text-link light" href="/plan-your-trip/">Plan your trip ${icon("diagonal")}</a></div></div>
        <div class="journey-route" aria-hidden="true"><svg viewBox="0 0 1000 150" preserveAspectRatio="none"><path d="M0 118 C120 118 112 44 250 64 S390 139 500 78 650 26 742 80 890 129 1000 26"/></svg><span>Altitude</span><span>Culture</span><span>Nature</span><span>Ocean</span></div>
        <div class="journey-caption"><span data-scene-label>Chimborazo · 6,263 m</span><span data-scene-count>01 / 04</span></div>
      </div>
    </section>
    <section class="worlds-section" id="worlds"><div class="worlds-sticky"><div class="worlds-heading"><span class="eyebrow">One country, four worlds</span><h2>Follow the feeling.</h2></div><div class="worlds-track">
      ${[["andes","hero-andes-1200.webp","Andes","Cotopaxi · 4,897 m"],["amazon","la-selva-aerial.jpg","Amazonía","Napo · Ecuador"],["nono","hero-nono-1200.webp","Costa y bosque nublado","Chocó Andino · 0°"],["galapagos","hero-galapagos-1200.webp","Galápagos","0° 45′ S · Pacífico"]].map(([slug,img,title,coord],i)=>`<article class="world-panel"><img src="/assets/images/${img}" alt="${title}, Ecuador" loading="lazy" decoding="async"><div class="world-panel__meta"><span>0${i+1} / ECUADOR</span><span>${coord}</span></div><h3>${title}</h3><a href="/destinations/${slug === "amazon" ? "amazon" : slug}/">Explore ${title} ${icon("diagonal")}</a></article>`).join("")}
    </div><div class="worlds-progress"><span></span></div></div></section>
    <section class="expedition-section"><div class="shell"><span class="eyebrow">A route that finds its own rhythm</span><h2>From the highlands<br>to the living ocean.</h2><div class="expedition-route"><div class="expedition-line"></div>${[["01","Quito","Begin with stories, colors and a table set for you."],["02","Andes","Cross high valleys at a pace that leaves room to stop."],["03","Amazonía","Follow waterways into a world that moves to its own time."],["04","Galápagos","End where ancient islands meet the open Pacific."]].map(([n,t,d])=>`<article class="expedition-stop"><span class="expedition-number">${n}</span><div><h3>${t}</h3><p>${d}</p></div><span class="expedition-pin">${icon("pin")}</span></article>`).join("")}</div></div></section>
    <section class="intent-section"><div class="shell"><span class="eyebrow light">Travel with intention</span><h2>Made personal,<br>at every turn.</h2><div class="intent-list"><p><span>01</span><strong>Small groups</strong><i>Space to notice more.</i></p><p><span>02</span><strong>Local hosts</strong><i>People who make a place mean something.</i></p><p><span>03</span><strong>Your own pace</strong><i>Room for the unplanned.</i></p></div></div></section>
    <section class="memory-section"><img src="/assets/images/amazon-community.webp" alt="A shared moment with a local host in Ecuador" loading="lazy"><div class="memory-shade"></div><blockquote><span class="eyebrow light">A memory to carry</span><p>“A balance between the highlights and the off-the-beaten-path gems of Ecuador.”</p><cite>— Inca Holidays brochure</cite></blockquote></section>
    <section class="journey-close"><div class="contour-lines"></div><span class="eyebrow light">Ecuador, at your own pace</span><h2>Your Ecuador<br>starts here.</h2><a class="button button--light compass-cta" href="/plan-your-trip/">Plan your trip ${icon("compass")}</a></section>
  </main>`;
}

function destinationsPage(locale = "en") {
  const es = locale === "es";
  return `<main id="main">
    ${pageHero({ eyebrow: "Ecuador in four directions", title: "One country. Four worlds.", copy: "Islands, highlands, rainforest and cloud forest, shaped into your journey.", hero: "hero-galapagos", widths: [1200,2400], position: "50% 44%", alt: "Giant tortoise in the Galapagos highlands", credit: "Hero photograph: Bjarn Bronsveld / Unsplash" })}
    <section class="atlas-section section" id="story">
      <div class="shell atlas-intro"><span class="eyebrow reveal">The destination atlas</span><p class="reveal">Four distinct regions. Endless ways to explore.</p></div>
      <div class="shell atlas-list">
        ${destinations.map(d => `<article class="atlas-row reveal">
          <a href="${localizedPath(`/destinations/${d.slug}/`, locale)}">
            <span class="atlas-row__number">${d.number}</span>
            <div class="atlas-row__image">${picture(d.hero,d.heroWidths,`${d.name}, Ecuador`,{position:d.heroPosition,sizes:"(max-width: 760px) 100vw, 35vw",ratio:.68})}</div>
            <div class="atlas-row__copy"><span>${d.eyebrow}</span><h2>${d.name}</h2><p>${d.short}</p></div>
            <span class="atlas-row__arrow">${icon("diagonal")}</span>
          </a>
        </article>`).join("")}
      </div>
    </section>
    <section class="experience-index section" id="experiences"><div class="shell"><div class="experience-index__heading"><span class="eyebrow">${es ? "Experiencias" : "Experiences"}</span><h2>${es ? "Elige una forma de viajar." : "Choose how you want to travel."}</h2></div><div class="experience-index__grid"><a href="${localizedPath("/destinations/amazon/#lodges", locale)}"><span>${es ? "Amazonía" : "Amazon"}</span><h3>${es ? "Lodges de selva" : "Rainforest lodges"}</h3><p>${es ? "Compara Huasquila, La Selva y Sani antes de abrir sus programas." : "Compare Huasquila, La Selva and Sani before opening their programs."}</p>${icon("diagonal")}</a><a href="${localizedPath("/destinations/galapagos/#cruises", locale)}"><span>${es ? "Galápagos" : "Galapagos"}</span><h3>${es ? "Cruceros y navegación" : "Cruises and sailing"}</h3><p>${es ? "Explora Yacht Anahi, Grand Ocean Spray y otras formas de descubrir las islas." : "Explore Yacht Anahi, Grand Ocean Spray and other ways to discover the islands."}</p>${icon("diagonal")}</a><a href="${localizedPath("/villa-doris/", locale)}"><span>${es ? "Nono" : "Nono"}</span><h3>Villa Doris</h3><p>${es ? "Conoce la casa, sus habitaciones, jardines y estancia en el bosque nublado." : "Explore the house, rooms, gardens and stay in the cloud forest."}</p>${icon("diagonal")}</a></div></div></section>
    ${finalCta("Combine regions", "Let Ecuador unfold one landscape at a time.")}
  </main>`;
}

function amazonLodges(locale = "en") {
  const es = locale === "es";
  const lodges = [
    { name: "Huasquila Amazon Lodge", tag: es ? "Cascadas · comunidad · río Napo" : "Waterfalls · community · Napo River", photos: 8, prefix: "huasquila", ext: "jpg", formats: ["webp"], intro: es ? "Un refugio para descubrir senderos, cascadas y tradiciones kichwa, con acceso por transporte privado." : "A gateway to forest trails, waterfalls and Kichwa traditions, reached by private transportation.", programs: [[es ? "Aventura amazónica · 4 días / 3 noches" : "Amazon tour · 4 days / 3 nights", es ? ["Llegada, caminata a una cascada y experiencia de chocolate.", "Caminata por el bosque, cueva, cascada y visita a una comunidad kichwa; recorrido nocturno.", "Día en canoa por el río Napo, laguna y visita al Centro de Rescate Amazónico.", "Desayuno y salida."] : ["Arrive at the lodge, walk to a waterfall and discover chocolate making.", "Hike through the forest to a cave and waterfall, visit a Kichwa community and explore at night.", "Spend a day on the Napo River by canoe, visiting a lagoon and the Amazónico Rescue Center.", "Breakfast and departure."]]] },
    { name: "La Selva Eco-Lodge", tag: es ? "Lagunas · dosel · bienestar" : "Lagoons · canopy · wellbeing", photos: 8, prefix: "la-selva", ext: "jpg", intro: es ? "Vuela de Quito a El Coca y continúa por el río hasta un refugio junto a la laguna Garzacocha." : "Fly from Quito to El Coca and continue along the river to a lodge beside Garzacocha lagoon.", programs: [[es ? "Programa amazónico · 4 días / 3 noches" : "Amazon program · 4 days / 3 nights", es ? ["Viaje en canoa, caminata al atardecer y exploración nocturna de la laguna.", "Torre de observación, lagunas y caminata nocturna; tiempo para kayak, yoga o masaje.", "Saladero de loros, comunidad Pilchi y sendero Coto.", "Traslado por río a El Coca y vuelo a Quito."] : ["Travel by canoe, walk at sunset and explore the lagoon after dark.", "Visit the observation tower and lakes, then walk at night; enjoy kayaking, yoga or a massage.", "Visit a parrot clay lick and the Pilchi community, then explore the Coto Trail.", "Return by river to El Coca for your flight to Quito."]], [es ? "Programa amazónico · 5 días / 4 noches" : "Amazon program · 5 days / 4 nights", es ? ["Llegada y sendero Matapalo Charapa; canoa nocturna.", "Torre de observación, lagunas y caminata nocturna.", "Saladero de loros, comunidad Pilchi y sendero Coto.", "Parque Nacional Yasuní y recorrido en canoa por Morete Yaku.", "Regreso a El Coca y vuelo a Quito."] : ["Arrive, explore the Matapalo Charapa Trail and paddle at night.", "Explore the observation tower and lakes, followed by a night walk.", "Visit the parrot clay lick, Pilchi community and Coto Trail.", "Discover Yasuní National Park and paddle Morete Yaku Creek.", "Return to El Coca and fly to Quito."]]] },
    { name: "Sani Lodge", tag: es ? "Aves · bosque inundado · cultura kichwa" : "Birds · flooded forest · Kichwa culture", photos: 7, prefix: "sani", formats: ["avif", "avif", "avif", "avif", "avif", "jpg", "webp"], intro: es ? "Desde El Coca, navega por el río Napo y el bosque inundado hasta la laguna Challwacocha." : "From El Coca, follow the Napo River and a flooded forest to Challwacocha lagoon.", programs: [[es ? "Aves y fotografía · 4 días / 3 noches" : "Birding & photography · 4 days / 3 nights", es ? ["Viaje por el Napo y bosque inundado; salida nocturna.", "Observación desde la torre y sendero Chorongo.", "Saladeros de loros en Yasuní o exploración de islas fluviales.", "Observación al amanecer y regreso a El Coca."] : ["Travel along the Napo and flooded forest; explore at night.", "Birdwatch from the canopy tower and along the Chorongo Trail.", "Visit parrot clay licks in Yasuní or explore river islands.", "Sunrise birdwatching and return to El Coca."]], [es ? "Aventura amazónica · 4 días / 3 noches" : "Amazon adventure · 4 days / 3 nights", es ? ["Llegada por el Napo y búsqueda nocturna de caimanes.", "Torre de observación, bosque primario y caminata nocturna.", "Yasuní y encuentro cultural con Sani Warmi.", "Canoa al amanecer y regreso a El Coca."] : ["Arrive via the Napo and search for caimans at night.", "Visit the canopy tower, primary forest and take a night walk.", "Discover Yasuní and meet the Sani Warmi women’s organization.", "Paddle at sunrise and return to El Coca."]], [es ? "Selva profunda · 5 días / 4 noches" : "Deep jungle · 5 days / 4 nights", es ? ["Llegada por el río y salida nocturna.", "Torre del dosel y caminatas por el bosque.", "Saladero de loros y cultura kichwa.", "Excursión de día completo por el sendero Chorongo Largo.", "Canoa al amanecer y regreso a El Coca."] : ["Arrive by river and explore at night.", "Visit the canopy tower and walk in the forest.", "Discover the parrot clay lick and Kichwa culture.", "Spend a full day exploring the Chorongo Largo Trail.", "Paddle at sunrise and return to El Coca."]]] }
  ];
  const sourceHeadings = es ? {
    huasquila: ["Tour amazónico: 4 días / 3 noches"],
    "la-selva": ["Programa amazónico: 4 días / 3 noches", "Programa amazónico: 5 días / 4 noches"],
    sani: ["Aves y fotografía: 4 días / 3 noches", "Aventura amazónica: 4 días / 3 noches", "Selva profunda: 5 días / 4 noches"]
  } : {
    huasquila: ["Amazon Tour"],
    "la-selva": ["Amazon program (4 days / 3 nights)", "Amazon program (5 days / 4 nights)"],
    sani: ["Birding & Photography", "Amazon Adventure Experience", "Deep Jungle Experience"]
  };
  lodges.forEach(lodge => {
    lodge.programs = lodge.programs.map(([title, days], index) => [title, days, itineraryDays(locale, sourceHeadings[lodge.prefix][index], days.length)]);
  });
  return `<section class="lodge-journey section" id="lodges"><div class="shell"><div class="lodge-intro"><span class="eyebrow">${es ? "Tres maneras de entrar en la selva" : "Three ways into the rainforest"}</span><h2>${es ? "La Amazonía, a tu ritmo." : "Your Amazon, your rhythm."}</h2><p>${es ? "Compara los tres lodges por su ubicación, actividades y duración antes de explorar cada itinerario." : "Compare the three lodges by setting, activities and duration before opening each itinerary."}</p><nav class="lodge-quick-links" aria-label="${es ? "Explorar lodges" : "Explore lodges"}">${lodges.map(l => `<a href="#${l.prefix}">${l.name} ${icon("diagonal")}</a>`).join("")}</nav></div>${lodges.map((l,i)=>`<article class="lodge" id="${l.prefix}"><div class="lodge-heading"><span class="lodge-number">0${i+1}</span><div><span class="eyebrow">${l.tag}</span><h3>${l.name}</h3><p>${l.intro}</p><p class="lodge-duration"><strong>${es ? "Duraciones disponibles:" : "Available durations:"}</strong> ${[...new Set(l.programs.map(([title]) => title.replace(/^.*?·\s*/, "")))].join(" · ")}</p><a class="text-link" href="#${l.prefix}-programs">${es ? "Ver itinerarios" : "View itineraries"} ${icon("arrow")}</a></div></div><div class="lodge-programs" id="${l.prefix}-programs"><span class="lodge-section-label">${es ? "Programas e itinerarios" : "Programs & itineraries"}</span>${l.programs.map(([title,days,details],p)=>`<details class="lodge-program"><summary>${title}${icon("plus")}</summary><div class="program-overview"><p>${days.slice(0,2).join(" ")}</p><a class="text-link" href="/plan-your-trip/?destination=amazon&lodge=${encodeURIComponent(l.prefix)}&program=${encodeURIComponent(title)}">${es ? "Consultar este programa" : "Ask about this program"} ${icon("arrow")}</a></div><ol>${days.map((day,n)=>`<li class="program-day"><div class="program-day__summary"><div><strong>${es ? "Día" : "Day"} ${n+1}</strong><p>${day}</p></div><details class="program-day__detail"><summary class="program-day__toggle" aria-label="${es ? "Abrir detalle del día" : "Open day details"}"><svg class="icon program-day__right" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg><svg class="icon program-day__down" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 10 4 4 4-4"/></svg><span class="sr-only">${es ? "Ver información completa" : "View full information"}</span></summary><div class="program-day__copy"><p>${details?.[n] || day}</p></div></details></div></li>`).join("")}</ol></details>`).join("")}</div><div class="lodge-images-heading"><span class="lodge-section-label">${es ? "Imágenes" : "Images"}</span><p class="lodge-hint">${es ? "Desliza para explorar las fotografías" : "Swipe to explore the photographs"} ${icon("arrow")}</p></div><div class="lodge-gallery" tabindex="0" aria-label="${es ? "Fotografías de" : "Photographs of"} ${l.name}">${Array.from({length:l.photos},(_,n)=>`<figure><img src="/assets/images/${l.prefix}-${n+1}.${l.formats?.[n] || l.ext || "webp"}" alt="${l.name} — ${es ? "fotografía" : "photograph"} ${n+1}" loading="lazy" decoding="async"><figcaption>${l.name} <span>${String(n+1).padStart(2,"0")} / ${String(l.photos).padStart(2,"0")}</span></figcaption></figure>`).join("")}</div><a class="text-link" href="/plan-your-trip/?destination=amazon&lodge=${encodeURIComponent(l.prefix)}">${es ? "Consulta por este lodge" : "Ask about this lodge"} ${icon("arrow")}</a></article>`).join("")}</div></section>`;
}

function galapagosCruise(locale = "en") {
  const es = locale === "es";
  const images = [
    ["grand-ocean-spray-exterior.jpeg", es ? "Grand Ocean Spray navegando por Galápagos" : "Grand Ocean Spray sailing through the Galápagos"],
    ["grand-ocean-spray-sky-deck.jpg", es ? "Sky deck del Grand Ocean Spray" : "Grand Ocean Spray sky deck"],
    ["grand-ocean-spray-lounge.jpeg", es ? "Sala de estar del Grand Ocean Spray" : "Grand Ocean Spray lounge"],
    ["grand-ocean-spray-cabin.jpg", es ? "Cabina del Grand Ocean Spray" : "Grand Ocean Spray cabin"],
    ["grand-ocean-spray-dining.jpg", es ? "Comedor del Grand Ocean Spray" : "Grand Ocean Spray dining room"],
    ["grand-ocean-spray-stern.jpg", es ? "Popa del Grand Ocean Spray" : "Grand Ocean Spray stern"]
  ];
  return `<section class="cruise-journey section" id="cruises"><div class="shell"><div class="galapagos-ways"><span class="eyebrow">${es ? "Formas de explorar" : "Ways to explore"}</span><h2>${es ? "Dos formas de recorrer Galápagos." : "Two ways to explore the Galápagos."}</h2><div class="galapagos-ways__grid"><a href="#cruises-options"><strong>${es ? "Cruceros · alojamiento a bordo" : "Cruises · stay on board"}</strong><span>${es ? "El alojamiento es a bordo; cambias de isla navegando." : "Stay aboard the vessel and travel between islands by sea."}</span></a><a href="#land-tours"><strong>${es ? "Tours terrestres · alojamiento en isla" : "Land tours · stay on an island"}</strong><span>${es ? "Te alojas en tierra y visitas las islas en excursiones guiadas." : "Stay on land and visit the islands on guided day excursions."}</span></a></div></div><div id="cruises-options"><div class="section-heading"><span class="eyebrow">${es ? "Cruceros de Galápagos · alojamiento a bordo" : "Galápagos cruises · accommodation on board"}</span><h2>${es ? "Elige tu embarcación." : "Choose your vessel."}</h2><p>${es ? "Yacht Anahi, Grand Ocean Spray y Endemic son viajes con alojamiento a bordo." : "Yacht Anahi, Grand Ocean Spray and Endemic are journeys with accommodation on board."}</p></div><a class="anahi-feature reveal" href="${localizedPath("/yacht-anahi/", locale)}"><div class="anahi-feature__image"><img src="/assets/images/yacht-anahi-exterior.jpg" alt="${es ? "Yacht Anahi navegando por Galápagos" : "Yacht Anahi sailing through the Galápagos"}" loading="lazy" decoding="async"></div><div class="anahi-feature__copy"><span class="eyebrow">${es ? "Crucero · Yacht Anahi" : "Cruise · Yacht Anahi"}</span><h2>Yacht Anahi</h2><p>${es ? "Explora el yate y su experiencia en su página dedicada." : "Explore the yacht and its experience on its dedicated page."}</p><span class="text-link">${es ? "Conocer el yate" : "Discover the yacht"} ${icon("arrow")}</span></div></a><div class="cruise-heading"><span class="eyebrow">${es ? "Crucero · Galápagos" : "Cruise · Galápagos"}</span><h2>Grand Ocean Spray</h2><p>${es ? "Un catamarán de última generación para recorrer las islas con comodidad, privacidad y sofisticación." : "A state-of-the-art catamaran for exploring the islands with comfort, privacy and sophistication."}</p></div><div class="cruise-program"><span class="lodge-section-label">${es ? "Itinerario" : "Itinerary"}</span><h3>Golden Treasure Expedition · ${es ? "8 días / 7 noches" : "8 days / 7 nights"}</h3><p>${es ? "Un crucero con itinerario propio a bordo del Grand Ocean Spray." : "A dedicated cruise itinerary aboard the Grand Ocean Spray."}</p><details class="cruise-itinerary"><summary>${es ? "Ver itinerario completo" : "View full itinerary"}</summary><ol>${(es ? [["Día 1 · Isla Baltra e islote Sombrero Chino","Llegada a Baltra, traslado al crucero y visita a Sombrero Chino, sus formaciones volcánicas y su fauna."],["Día 2 · Punta Vicente Roca y Punta Espinoza","Esnórquel en Punta Vicente Roca; luego, formaciones de lava, manglares y fauna en Punta Espinoza, Fernandina."],["Día 3 · Caleta Tagus y bahía Urbina","Observación de aves en Tagus Cove y caminata al mirador del lago Darwin. Continúa por los senderos costeros de bahía Urbina."],["Día 4 · Bahía Elizabeth y Punta Moreno","Paseo en panga entre manglares e islotes de Marielas; caminata sobre campos de lava y observación de aves en Punta Moreno."],["Día 5 · Estación Científica Charles Darwin y tierras altas","Conoce los programas de conservación de tortugas gigantes y explora las tierras altas, sumideros y túneles de lava."],["Día 6 · Islas Plaza Sur y Santa Fe","Observa cactus endémicos e iguanas terrestres en Plaza Sur. En Santa Fe, recorre senderos y nada o practica esnórquel con lobos marinos."],["Día 7 · Punta Suárez, bahía Gardner e islotes","Observa albatros de Galápagos en Punta Suárez y visita bahía Gardner; esnórquel opcional en los islotes Osborn y Gardner."],["Día 8 · Centro de Interpretación de San Cristóbal y salida","Visita el Centro de Interpretación y traslado al aeropuerto."]] : [["Day 1 · Baltra Island & Chinese Hat Islet","Arrive at Baltra, transfer to the cruise, and explore Chinese Hat’s volcanic formations and wildlife."],["Day 2 · Vicente Roca Point & Espinoza Point","Snorkel at Vicente Roca Point, then explore the lava formations, mangroves and wildlife of Espinoza Point on Fernandina."],["Day 3 · Tagus Cove & Urbina Bay","Look for seabirds at Tagus Cove and hike to the viewpoint above Darwin Lake. Continue along the coastal trails at Urbina Bay."],["Day 4 · Elizabeth Bay & Punta Moreno","Take a Zodiac ride through mangrove coves and the Marielas Islets, then walk across lava fields and observe birdlife at Punta Moreno."],["Day 5 · Charles Darwin Research Station & Highlands","Learn about giant tortoise conservation at the research station. Explore Santa Cruz’s highlands, sinkholes and lava tunnels."],["Day 6 · South Plaza & Santa Fe Islands","See endemic cacti and land iguanas on South Plaza. Walk the trails on Santa Fe and swim or snorkel with sea lions."],["Day 7 · Punta Suárez, Gardner Bay & Islets","Look for waved albatross at Punta Suárez and visit Gardner Bay; snorkeling at Osborn and Gardner Islets is an option."],["Day 8 · San Cristóbal Interpretation Center & Departure","Visit the Interpretation Center and transfer to the airport."]]).map(([day, summary]) => `<li><strong>${day}</strong> ${summary}</li>`).join("")}</ol></details><a class="text-link" href="/plan-your-trip/?destination=galapagos&program=Golden%20Treasure%20Expedition%20%288%20days%20%2F%207%20nights%29">${es ? "Consultar este programa" : "Ask about this program"} ${icon("arrow")}</a></div><div class="cruise-images-heading"><span class="lodge-section-label">${es ? "Imágenes" : "Images"}</span></div>${gallery(images, "cruise")}${endemicFeature(locale)}</div></div></section>`;
}

function yachtAnahiPage(locale = "en") {
  const es = locale === "es";
  const galleryItems = [
    ["yacht-anahi-blue-footed-boobies.jpg", es ? "Piqueros de patas azules en Galápagos" : "Blue-footed boobies in the Galápagos"],
    ["yacht-anahi-sea-lions.jpg", es ? "Lobos marinos descansando en la playa" : "Sea lions resting on a Galápagos beach"],
    ["yacht-anahi-kicker-rock.jpg", es ? "Kicker Rock frente a la costa de San Cristóbal" : "Kicker Rock off the coast of San Cristóbal"],
    ["yacht-anahi-galapagos-islets.jpg", es ? "Islas volcánicas y bahías de Galápagos" : "Volcanic islands and bays in the Galápagos"],
    ["yacht-anahi-marine-iguana.jpg", es ? "Iguana marina sobre la roca volcánica" : "Marine iguana on volcanic rock"],
    ["yacht-anahi-punta-suarez.jpg", es ? "Lobos marinos en Punta Suárez" : "Sea lions at Punta Suárez"]
  ];
  return `<main id="main">
    ${pageHero({ eyebrow: es ? "Galápagos · Yacht Anahi" : "Galápagos · Yacht Anahi", title: es ? "Las islas, a tu ritmo." : "The islands, at your pace.", copy: es ? "Descubre la fauna, las costas volcánicas y el silencio del Pacífico desde una base cómoda sobre el agua." : "Discover wildlife, volcanic shores and the quiet of the Pacific from a comfortable base on the water.", hero: "yacht-anahi-exterior.jpg", widths: [], position: "50% 52%", alt: es ? "Yacht Anahi navegando por las islas Galápagos" : "Yacht Anahi sailing through the Galápagos" })}
    <section class="anahi-intro section" id="story"><div class="shell anahi-intro__grid"><div class="anahi-intro__index"><span>05</span><small>${es ? "Una forma distinta de navegar" : "A different way to sail"}</small></div><div class="anahi-intro__lead"><span class="eyebrow">${es ? "El viaje" : "The journey"}</span><h2>${es ? "Cada día abre una nueva orilla." : "Every day opens onto a new shore."}</h2></div><div class="anahi-intro__detail"><p>${es ? "Yacht Anahi combina la libertad de moverse entre islas con la calma de tener siempre un lugar propio al que regresar. Baja a tierra para encontrarte con la vida silvestre y vuelve al barco para mirar el horizonte." : "Yacht Anahi combines the freedom of moving between islands with the ease of having a place of your own to return to. Step ashore for wildlife encounters, then come back on board to watch the horizon."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos&amp;experience=Yacht%20Anahi">${es ? "Consultar Yacht Anahi" : "Ask about Yacht Anahi"} ${icon("arrow")}</a></div></div></section>
    <section class="anahi-rhythm section section--muted"><div class="shell"><div class="section-heading anahi-rhythm__heading"><span class="eyebrow">${es ? "El ritmo a bordo" : "Life on board"}</span><h2>${es ? "Comodidad para mirar más lejos." : "Comfort that lets you look farther."}</h2></div><div class="anahi-rhythm__grid"><article><span>01</span><h3>${es ? "Días de fauna" : "Wildlife-led days"}</h3><p>${es ? "Piqueros, lobos marinos, iguanas marinas y aves únicas aparecen en las islas y junto a la costa." : "Boobies, sea lions, marine iguanas and singular birdlife appear on the islands and along the coast."}</p></article><article><span>02</span><h3>${es ? "Noches tranquilas" : "Quiet nights"}</h3><p>${es ? "Después de una jornada de exploración, regresa a una cabina fresca, luminosa y hecha para descansar." : "After a day of exploring, return to a cool, light-filled cabin made for resting."}</p></article><article><span>03</span><h3>${es ? "Isla por isla" : "Island by island"}</h3><p>${es ? "La ruta cambia con el paisaje: playas blancas, roca volcánica, bahías azules y horizontes abiertos." : "The route changes with the landscape: white beaches, volcanic rock, blue bays and open horizons."}</p></article></div></div></section>
    <section class="anahi-cabins section"><div class="shell anahi-cabins__grid"><div class="anahi-cabins__copy"><span class="eyebrow">${es ? "El espacio" : "The space"}</span><h2>${es ? "Un lugar al que da gusto volver." : "A place you will want to return to."}</h2><p>${es ? "Las cabinas combinan líneas limpias, luz natural y detalles suaves para que el descanso también forme parte de la expedición." : "The cabins pair clean lines, natural light and quiet details, making rest part of the expedition too."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos&amp;experience=Yacht%20Anahi">${es ? "Consultar Yacht Anahi" : "Ask about Yacht Anahi"} ${icon("arrow")}</a></div><figure class="anahi-cabin anahi-cabin--twin reveal"><img src="/assets/images/yacht-anahi-double-cabin.png" alt="${es ? "Cabina twin convertible de Yacht Anahi" : "Yacht Anahi convertible twin cabin"}" loading="lazy" decoding="async"><figcaption>${es ? "Cabina convertible twin" : "Convertible twin cabin"}</figcaption></figure><figure class="anahi-cabin anahi-cabin--suite reveal"><img src="/assets/images/yacht-anahi-triple-suite.png" alt="${es ? "Suite triple de Yacht Anahi" : "Yacht Anahi triple suite"}" loading="lazy" decoding="async"><figcaption>${es ? "Suite triple" : "Triple suite"}</figcaption></figure></div></section>
    <section class="anahi-wildlife section section--deep"><div class="shell anahi-wildlife__grid"><figure class="anahi-wildlife__image reveal"><img src="/assets/images/yacht-anahi-marine-iguana.jpg" alt="${es ? "Iguana marina de Galápagos sobre una roca" : "Galápagos marine iguana resting on rock"}" loading="lazy" decoding="async"></figure><div class="anahi-wildlife__copy"><span class="eyebrow light">${es ? "La vida silvestre" : "The wildlife"}</span><h2>${es ? "La naturaleza no está lejos." : "Nature is never far away."}</h2><p>${es ? "En Galápagos, el encuentro comienza antes de llegar a tierra: una silueta en el agua, unas alas sobre la cubierta, una iguana quieta sobre la lava." : "In the Galápagos, the encounter begins before you reach shore: a shape in the water, wings above the deck, an iguana still on the lava."}</p><a class="text-link light" href="${localizedPath("/destinations/galapagos/", locale)}">${es ? "Explorar Galápagos" : "Explore the Galápagos"} ${icon("diagonal")}</a></div></div></section>
    <section class="gallery-section section anahi-gallery" aria-label="${es ? "Galería de Yacht Anahi y Galápagos" : "Yacht Anahi and Galápagos gallery"}"><div class="shell section-heading"><span class="eyebrow reveal">${es ? "En tierra y en el agua" : "On shore and at sea"}</span><h2 class="reveal">${es ? "Mira más de cerca." : "Look closer."}</h2></div><div class="shell">${gallery(galleryItems, "anahi")}</div></section>
    ${finalCta(es ? "Tu viaje a Galápagos" : "Your Galápagos journey", es ? "Deja que las islas marquen el ritmo." : "Let the islands set the pace.")}
  </main>`;
}

function endemicFeature(locale = "en") {
  const es = locale === "es";
  const days = es ? [
    ["Día 1 | Isla Baltra e isla Santa Cruz: Cerro Dragón", "A tu llegada al aeropuerto de Baltra, recibirás asistencia y traslado al crucero. Visita Cerro Dragón, en la costa noroeste de Santa Cruz, por un sendero para observar iguanas terrestres, flamencos, patos rabudos y otras aves endémicas. Disfruta de esnórquel frente a la costa antes de regresar al yate."],
    ["Día 2 | Isla San Cristóbal: León Dormido, Witch Hill e isla Lobos", "Admira León Dormido, una impresionante formación geológica esculpida por la erosión, mientras el yate navega a su alrededor. Continúa a Witch Hill; un paseo en panga permite observar sus formaciones costeras, una playa de arena blanca y aguas cristalinas. En isla Lobos, practica esnórquel junto a los lobos marinos."],
    ["Día 3 | Isla Española: bahía Gardner, islotes Osborn y Gardner, y Punta Suárez", "Relájate en la playa de arena blanca de bahía Gardner, donde los lobos marinos descansan en la orilla. Como alternativa, explora los islotes Osborn y Gardner, conocidos por sus excelentes oportunidades de esnórquel. Continúa a Punta Suárez, reconocida por su población de albatros de Galápagos."],
    ["Día 4 | Islas Santa Fe y Santa Cruz: isla Santa Fe, Estación Científica Charles Darwin y tierras altas", "Explora isla Santa Fe por uno de sus dos senderos y observa especies endémicas. Nada o practica esnórquel junto a los lobos marinos en sus aguas tranquilas. Visita la Estación Científica Charles Darwin para conocer tortugas gigantes de distintas subespecies que se preparan para su reintroducción. Continúa a las tierras altas de Santa Cruz para observar tortugas gigantes en estado silvestre, sumideros y túneles de lava."],
    ["Día 5 | Islas Plaza Sur y Bartolomé", "Descubre Plaza Sur, un paisaje rocoso caracterizado por cactus endémicos y una numerosa población de iguanas terrestres. Continúa a Bartolomé, hogar del icónico Pináculo. Las playas cercanas ofrecen excelentes oportunidades para practicar esnórquel, incluso con la posibilidad de nadar junto a pingüinos."],
    ["Día 6 | Isla Floreana: Corona del Diablo, Punta Cormorant, mirador de la Baronesa y bahía Post Office", "Explora la Corona del Diablo, un cráter volcánico sumergido donde podrás practicar esnórquel con tiburones, tortugas marinas y rayas. Como alternativa, visita Punta Cormorant, conocida por su playa de arena verde olivina y una laguna cercana donde suelen verse flamencos. Continúa al mirador de la Baronesa para disfrutar de la costa de Floreana o visita bahía Post Office, donde puedes dejar una carta para alguien querido en el histórico barril postal que usaban los balleneros."],
    ["Día 7 | Islote Sombrero Chino e isla Seymour Norte", "Visita Sombrero Chino, un pequeño islote cuyo nombre alude a su forma cónica y que destaca por sus formaciones geológicas y fauna. Continúa a Seymour Norte, hogar de la mayor colonia de fragatas magníficas de Galápagos y de piqueros de patas azules que realizan su característico cortejo."],
    ["Día 8 | Isla Baltra: caleta Black Turtle y salida", "Disfruta de una última visita a caleta Black Turtle. Un paseo en panga permite observar tiburones, tortugas marinas, garzas y, posiblemente, bancos de rayas doradas. Después, traslado al aeropuerto de Baltra para tomar el vuelo de regreso al Ecuador continental, con asistencia y despedida en el aeropuerto."]
  ] : [
    ["Day 1 | Baltra Island & Santa Cruz Island: Dragon Hill", "Upon arrival at Baltra Airport, receive assistance and transfer to the cruise. Visit Dragon Hill, located on the northwestern coast of Santa Cruz Island, where a scenic walk offers opportunities to observe land iguanas, flamingos, pintail ducks, and other endemic birds. Enjoy offshore snorkeling before returning to the yacht."],
    ["Day 2 | San Cristóbal Island: Kicker Rock, Witch Hill & Lobos Island", "Admire Kicker Rock, an impressive geological formation sculpted by erosion, as the vessel circumnavigates the site. Continue to Witch Hill, where a Zodiac ride reveals striking coastal rock formations, a white-sand beach, and crystal-clear waters. At Lobos Island, enjoy snorkeling alongside sea lions."],
    ["Day 3 | Española Island: Gardner Bay, Osborn & Gardner Islets, and Punta Suárez", "Relax on the beautiful white-sand beach of Gardner Bay, where sea lions can be seen resting along the shore. Alternatively, explore Osborn and Gardner Islets, known for their excellent underwater snorkeling opportunities. Continue to Punta Suárez, renowned for its waved albatross population."],
    ["Day 4 | Santa Fe & Santa Cruz Islands: Santa Fe Island, Charles Darwin Research Station & Highlands", "Explore Santa Fe Island along one of its two walking trails, where endemic species can be observed. Enjoy the opportunity to swim or snorkel alongside sea lions in its calm waters. Visit the Charles Darwin Research Station to see giant tortoises from different subspecies being prepared for reintroduction. Continue to the highlands of Santa Cruz to observe giant tortoises in the wild, as well as sinkholes and impressive lava tunnels."],
    ["Day 5 | South Plaza & Bartolomé Islands", "Discover South Plaza Island, a rocky landscape characterized by endemic cacti and a thriving population of land iguanas. Continue to Bartolomé Island, home to the iconic Pinnacle Rock. The surrounding beaches offer excellent snorkeling opportunities, including the chance to swim with penguins."],
    ["Day 6 | Floreana Island: Devil's Crown, Cormorant Point, Baroness' Overlook & Post Office Bay", "Explore Devil's Crown, a submerged volcanic crater offering opportunities to snorkel with sharks, sea turtles, and rays. Alternatively, visit Cormorant Point, known for its green olivine sand beach and a nearby lagoon where flamingos can be observed. Continue to the Baroness' Overlook for beautiful views of the Floreana coastline, or visit Post Office Bay, where you can leave a letter for a loved one in the historic post barrel once used by whalers."],
    ["Day 7 | Chinese Hat & North Seymour Islands", "Visit Chinese Hat, a small islet named for its distinctive conical shape and known for its remarkable geological formations and wildlife. Continue to North Seymour Island, home to the largest colony of magnificent frigatebirds in the Galápagos, as well as blue-footed boobies performing their characteristic courtship dance."],
    ["Day 8 | Baltra Island: Black Turtle Cove & Departure", "Enjoy a final visit to Black Turtle Cove, where a Zodiac ride offers opportunities to observe sharks, sea turtles, herons, and possibly schools of golden rays gliding through the water. Afterwards, transfer to Baltra Airport for your return flight to mainland Ecuador, with assistance and farewell at the airport."]
  ];
  const programTitle = `Off The Beaten Path Expedition · ${es ? "8 días / 7 noches" : "8 days / 7 nights"}`;
  const programQuery = encodeURIComponent(`Off The Beaten Path Expedition · 8 days / 7 nights`);
  return `<a class="anahi-feature endemic-feature reveal" href="${localizedPath("/endemic/", locale)}"><div class="anahi-feature__image"><img src="/assets/images/endemic-exterior.jpg" alt="${es ? "Endemic navegando al atardecer por Galápagos" : "Endemic sailing through the Galápagos at sunset"}" loading="lazy" decoding="async"></div><div class="anahi-feature__copy"><span class="eyebrow">${es ? "Crucero · 8 días / 7 noches" : "Cruise · 8 days / 7 nights"}</span><h2>Endemic</h2><h3>${programTitle}</h3><p>${es ? "Una expedición de ocho días entre islas, con suites luminosas, espacios abiertos y actividades para descubrir la fauna de Galápagos por tierra y mar." : "An eight-day island-hopping expedition, with light-filled suites, open-air spaces and activities to discover Galápagos wildlife by land and sea."}</p><span class="text-link">${es ? "Conocer el yate" : "Discover the yacht"} ${icon("arrow")}</span></div></a><div class="cruise-program endemic-program"><span class="lodge-section-label">${es ? "Programa del crucero" : "Cruise program"}</span><h3>${programTitle}</h3><details class="cruise-itinerary"><summary>${es ? "Ver itinerario completo" : "View full itinerary"}</summary><ol>${days.map(([day, summary]) => `<li><strong>${day}</strong> ${summary}</li>`).join("")}</ol></details><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos&amp;program=${programQuery}">${es ? "Consultar este programa" : "Ask about this program"} ${icon("arrow")}</a></div>`;
}
function endemicYachtPage(locale = "en") {
  const es = locale === "es";
  const galleryItems = [
    ["endemic-kayak.jpg", es ? "Kayak junto a la costa volcánica de Galápagos" : "Kayaking beside the volcanic Galápagos coast"],
    ["endemic-jacuzzi.jpg", es ? "Jacuzzi y cubierta exterior de Endemic" : "Endemic jacuzzi and open-air deck"],
    ["endemic-sky.jpg", es ? "Cubierta y horizonte abierto de Endemic" : "Endemic deck beneath an open horizon"],
    ["endemic-lounge.jpg", es ? "Sala de estar de Endemic" : "Endemic lounge"],
    ["endemic-dinner.jpg", es ? "Comedor de Endemic frente al mar" : "Endemic dining room overlooking the sea"],
    ["endemic-golden-suite-6.jpg", es ? "Golden Suite de Endemic" : "Endemic Golden Suite"]
  ];
  return `<main id="main">
    ${pageHero({ eyebrow: es ? "Galápagos · Endemic" : "Galápagos · Endemic", title: es ? "Lujo que sigue al horizonte." : "Luxury that follows the horizon.", copy: es ? "Una experiencia de expedición elegante, con suites frente al mar, cubierta abierta y días para explorar las islas." : "An elegant expedition experience, with sea-facing suites, open-air decks and days shaped by the islands.", hero: "endemic-exterior.jpg", widths: [], position: "50% 52%", alt: es ? "Yacht Endemic navegando por Galápagos al atardecer" : "Endemic yacht sailing through the Galápagos at sunset" })}
    <section class="anahi-intro section" id="story"><div class="shell anahi-intro__grid"><div class="anahi-intro__index"><span>06</span><small>${es ? "Una expedición con calma" : "An expedition at ease"}</small></div><div class="anahi-intro__lead"><span class="eyebrow">${es ? "La experiencia" : "The experience"}</span><h2>${es ? "El mar abre la puerta." : "The sea opens the door."}</h2></div><div class="anahi-intro__detail"><p>${es ? "Endemic combina el espíritu de una expedición con una atmósfera íntima y contemporánea. Cada día invita a salir al agua, caminar entre lava antigua y volver a una suite con el océano enmarcado en la ventana." : "Endemic pairs the spirit of an expedition with an intimate, contemporary atmosphere. Each day invites you onto the water, across ancient lava and back to a suite with the ocean framed in the window."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos">${es ? "Consultar Endemic" : "Ask about Endemic"} ${icon("arrow")}</a></div></div></section>
    <section class="anahi-rhythm section section--muted"><div class="shell"><div class="section-heading anahi-rhythm__heading"><span class="eyebrow">${es ? "A bordo" : "On board"}</span><h2>${es ? "Cada detalle mira hacia afuera." : "Every detail looks outward."}</h2></div><div class="anahi-rhythm__grid"><article><span>01</span><h3>${es ? "Golden Suites" : "Golden Suites"}</h3><p>${es ? "Habitaciones luminosas, materiales naturales y vistas que mantienen el paisaje cerca incluso durante el descanso." : "Light-filled rooms, natural materials and views that keep the landscape close, even while you rest."}</p></article><article><span>02</span><h3>${es ? "Aventura activa" : "Active adventure"}</h3><p>${es ? "Kayak, desembarcos y recorridos que ponen la geografía de Galápagos en el centro del día." : "Kayaking, landings and excursions that place the geography of the Galápagos at the center of the day."}</p></article><article><span>03</span><h3>${es ? "Tiempo para quedarse" : "Time to linger"}</h3><p>${es ? "Jacuzzi, lounge y cubierta abierta para dejar que el océano marque el ritmo entre una experiencia y la siguiente." : "Jacuzzi, lounge and open-air decks for letting the ocean set the rhythm between experiences."}</p></article></div></div></section>
    <section class="anahi-cabins section"><div class="shell anahi-cabins__grid"><div class="anahi-cabins__copy"><span class="eyebrow">${es ? "El alojamiento" : "The accommodation"}</span><h2>${es ? "Una suite con el mar dentro." : "A suite with the sea inside."}</h2><p>${es ? "Las Golden Suites están diseñadas para que la luz, el agua y la sensación de amplitud acompañen cada noche del viaje." : "Golden Suites are designed so light, water and a sense of space accompany every night of the journey."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos">${es ? "Planificar Galápagos" : "Plan the Galápagos"} ${icon("arrow")}</a></div><figure class="anahi-cabin anahi-cabin--twin reveal"><img src="/assets/images/endemic-golden-suite-10.jpg" alt="${es ? "Golden Suite de Endemic con vistas al mar" : "Endemic Golden Suite with ocean views"}" loading="lazy" decoding="async"><figcaption>Golden Suite</figcaption></figure><figure class="anahi-cabin anahi-cabin--suite reveal"><img src="/assets/images/endemic-golden-suite-6.jpg" alt="${es ? "Segunda vista de una Golden Suite de Endemic" : "Endemic Golden Suite interior"}" loading="lazy" decoding="async"><figcaption>${es ? "Suite frente al mar" : "Sea-facing suite"}</figcaption></figure></div></section>
    <section class="anahi-wildlife section section--deep"><div class="shell anahi-wildlife__grid"><figure class="anahi-wildlife__image reveal"><img src="/assets/images/endemic-kayak.jpg" alt="${es ? "Viajeros en kayak junto a una costa volcánica de Galápagos" : "Travelers kayaking beside a volcanic Galápagos coast"}" loading="lazy" decoding="async"></figure><div class="anahi-wildlife__copy"><span class="eyebrow light">${es ? "La aventura" : "The adventure"}</span><h2>${es ? "El océano también es un sendero." : "The ocean is a trail too."}</h2><p>${es ? "Remar junto a la lava, cruzar una bahía tranquila y ver cómo la vida marina aparece a pocos metros: Endemic acerca la expedición al agua." : "Paddle beside lava, cross a quiet bay and watch marine life appear just metres away: Endemic brings the expedition close to the water."}</p><a class="text-link light" href="${localizedPath("/destinations/galapagos/", locale)}">${es ? "Explorar Galápagos" : "Explore the Galápagos"} ${icon("diagonal")}</a></div></div></section>
    <section class="gallery-section section anahi-gallery endemic-gallery" aria-label="${es ? "Galería de Endemic" : "Endemic gallery"}"><div class="shell section-heading"><span class="eyebrow reveal">${es ? "El yate por dentro y por fuera" : "Inside and out"}</span><h2 class="reveal">${es ? "Mira más de cerca." : "Look closer."}</h2></div><div class="shell">${gallery(galleryItems, "anahi")}</div></section>
    ${finalCta(es ? "Tu viaje a Galápagos" : "Your Galápagos journey", es ? "Deja que Endemic te acerque a las islas." : "Let Endemic bring you closer to the islands.")}
  </main>`.replaceAll(/(\.jpg)(?=["\\s])/g, "$1?v=20261112");
}

function landFeature(locale, kind, title, image, eyebrow, copy, label) {
  const es = locale === "es";
  const path = kind === "naturalist" ? "/naturalist-expedition/" : "/darwins-steps/";
  return `<a class="anahi-feature endemic-feature land-feature land-feature--${kind} reveal" href="${localizedPath(path, locale)}"><div class="anahi-feature__image"><img src="/assets/images/${image}" alt="${escapeHtml(es ? label.esAlt : label.enAlt)}" loading="lazy" decoding="async"></div><div class="anahi-feature__copy"><span class="eyebrow">${es ? eyebrow.es : eyebrow.en}</span><h2>${title}</h2><p>${es ? copy.es : copy.en}</p><span class="text-link">${es ? label.es : label.en} ${icon("arrow")}</span></div></a>`;
}

function naturalistFeature(locale = "en") {
  return landFeature(locale, "naturalist", "Naturalist Expedition", "naturalist-bahia-landscape.jpg", { en: "Land-based · wildlife-led", es: "Terrestre · fauna y paisaje" }, { en: "Volcanic shores, wildlife encounters and guided island days connected by time on the water.", es: "Costas volcánicas, encuentros con fauna y días guiados en las islas, unidos por el tiempo sobre el agua." }, { en: "Explore the expedition", es: "Ver la expedición", enAlt: "Volcanic bay and beach in the Galapagos", esAlt: "Bahía volcánica y playa en Galápagos" });
}

function darwinsStepsFeature(locale = "en") {
  return landFeature(locale, "darwins", "Darwin's Steps", "darwins-steps-walk.jpg", { en: "Santa Cruz base · land tour", es: "Base en Santa Cruz · tour terrestre" }, { en: "A wildlife-rich Galapagos tour based on Santa Cruz, with guided day excursions and a comfortable room to return to.", es: "Un tour de Galápagos con base en Santa Cruz, excursiones guiadas de día y una habitación cómoda a la que volver." }, { en: "Discover Darwin's Steps", es: "Descubrir Darwin's Steps", enAlt: "Travelers hiking on a Galapagos island from Santa Cruz", esAlt: "Viajeros caminando por una isla de Galápagos desde Santa Cruz" });
}

function naturalistExpeditionPage(locale = "en") {
  const es = locale === "es";
  const galleryItems = [
    ["naturalist-landing.jpg", es ? "Desembarco guiado en la costa de Galápagos" : "Guided landing on the Galapagos coast"],
    ["naturalist-turtle.jpg", es ? "Tortuga marina bajo el agua" : "Green sea turtle underwater"],
    ["naturalist-flamingo.jpg", es ? "Flamenco de Galápagos en aguas poco profundas" : "Galapagos flamingo in shallow water"],
    ["naturalist-lava-arches.jpg", es ? "Arcos de lava y cactus sobre el mar" : "Lava arches and cacti above the sea"],
    ["naturalist-booby.jpg", es ? "Piquero de patas azules sobre la lava" : "Blue-footed booby on volcanic ground"],
    ["naturalist-hiking.jpg", es ? "Caminata por un paisaje volcánico" : "Hiking through a volcanic landscape"],
    ["naturalist-boat.jpg", es ? "Lancha de apoyo navegando entre islas" : "Day boat moving between islands"]
  ];
  return `<main id="main">
    ${pageHero({ eyebrow: es ? "Galápagos · expedición naturalista" : "Galápagos · Naturalist Expedition", title: es ? "Las islas, de cerca." : "The islands, up close.", copy: es ? "Días de exploración guiada, fauna única y paisajes volcánicos, con el océano como parte del camino." : "Guided days of wildlife, volcanic landscapes and close encounters, with the ocean as part of the route.", hero: "naturalist-bahia-landscape.jpg", widths: [], position: "50% 52%", alt: es ? "Bahía volcánica de Galápagos" : "Volcanic Galapagos bay" })}
    <section class="anahi-intro section" id="story"><div class="shell anahi-intro__grid"><div class="anahi-intro__index"><span>07</span><small>${es ? "Fauna, lava y mar" : "Wildlife, lava and sea"}</small></div><div class="anahi-intro__lead"><span class="eyebrow">${es ? "La expedición" : "The expedition"}</span><h2>${es ? "Cada desembarco cambia la mirada." : "Every landing changes the view."}</h2></div><div class="anahi-intro__detail"><p>${es ? "Una experiencia naturalista para caminar, navegar y observar. La ruta pone el foco en los ecosistemas de Galápagos y deja espacio para que cada isla marque su propio ritmo." : "A naturalist experience shaped by walking, boating and observing. The route focuses on Galapagos ecosystems, leaving room for each island to set its own pace."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos">${es ? "Consultar la expedición" : "Ask about the expedition"} ${icon("arrow")}</a></div></div></section>
    <section class="anahi-rhythm section section--muted"><div class="shell"><div class="section-heading anahi-rhythm__heading"><span class="eyebrow">${es ? "El ritmo del viaje" : "The rhythm of the journey"}</span><h2>${es ? "La naturaleza lleva la agenda." : "Nature sets the agenda."}</h2></div><div class="anahi-rhythm__grid"><article><span>01</span><h3>${es ? "Desembarcos" : "Landings"}</h3><p>${es ? "Camina por costas de lava, playas claras y senderos donde la fauna no se esconde." : "Walk lava shores, bright beaches and trails where wildlife does not hide."}</p></article><article><span>02</span><h3>${es ? "Vida marina" : "Marine life"}</h3><p>${es ? "Nada o navega junto a tortugas, aves marinas y aguas transparentes." : "Swim or boat alongside turtles, seabirds and clear water."}</p></article><article><span>03</span><h3>${es ? "Mirada local" : "Local insight"}</h3><p>${es ? "Guías naturalistas conectan cada especie con el paisaje y la historia de las islas." : "Naturalist guides connect each species with the landscape and history of the islands."}</p></article></div></div></section>
    <section class="anahi-wildlife section section--deep"><div class="shell anahi-wildlife__grid"><figure class="anahi-wildlife__image reveal"><img src="/assets/images/naturalist-turtle.jpg" alt="${es ? "Tortuga marina nadando en Galápagos" : "Green sea turtle swimming in the Galapagos"}" loading="lazy" decoding="async"></figure><div class="anahi-wildlife__copy"><span class="eyebrow light">${es ? "La vida silvestre" : "The wildlife"}</span><h2>${es ? "La fauna está en todas partes." : "Wildlife is everywhere."}</h2><p>${es ? "Un flamenco en la laguna, un piquero sobre la lava o una tortuga bajo el agua: Galápagos recompensa la atención." : "A flamingo in the lagoon, a booby on the lava or a turtle below the surface: the Galapagos rewards attention."}</p><a class="text-link light" href="${localizedPath("/destinations/galapagos/", locale)}">${es ? "Explorar Galápagos" : "Explore the Galapagos"} ${icon("diagonal")}</a></div></div></section>
    <section class="gallery-section section anahi-gallery" aria-label="${es ? "Galería de la expedición naturalista" : "Naturalist Expedition gallery"}"><div class="shell section-heading"><span class="eyebrow reveal">${es ? "En tierra y en el agua" : "On shore and on the water"}</span><h2 class="reveal">${es ? "Mira más de cerca." : "Look closer."}</h2></div><div class="shell">${gallery(galleryItems, "anahi")}</div></section>
    ${finalCta(es ? "Tu viaje a Galápagos" : "Your Galapagos journey", es ? "Deja que las islas te sorprendan." : "Let the islands surprise you.")}
  </main>`;
}

function darwinsStepsPage(locale = "en") {
  const es = locale === "es";
  const galleryItems = [
    ["darwins-steps-walk.jpg", es ? "Caminata guiada junto a la costa" : "Guided walk beside the coast"],
    ["darwins-steps-frigatebird.jpg", es ? "Fragata entre la vegetación de Santa Cruz" : "Frigatebird among Santa Cruz vegetation"],
    ["darwins-steps-boobies.jpg", es ? "Familia de piqueros de patas azules" : "Family of blue-footed boobies"],
    ["darwins-steps-tortoise.jpg", es ? "Tortuga gigante de Santa Cruz" : "Santa Cruz giant tortoise"],
    ["darwins-steps-sally-lightfoot.jpg", es ? "Cangrejo zayapa sobre la roca" : "Sally Lightfoot crab on volcanic rock"],
    ["darwins-steps-iguana.jpg", es ? "Iguana marina descansando" : "Marine iguana resting"],
    ["darwins-steps-yacht.jpg", es ? "Yate de excursión frente a la costa" : "Excursion yacht off the coast"],
    ["darwins-steps-room-1.jpg", es ? "Habitación de Darwin's Steps" : "Darwin's Steps room"],
    ["darwins-steps-room-2.jpg", es ? "Suite con detalles inspirados en Galápagos" : "Suite with Galapagos-inspired details"]
  ];
  return `<main id="main">
    ${pageHero({ eyebrow: es ? "Santa Cruz · tour terrestre" : "Santa Cruz · land-based tour", title: es ? "Darwin's Steps, con base en Santa Cruz." : "Darwin's Steps, based in Santa Cruz.", copy: es ? "Una forma cercana y flexible de descubrir Galápagos: excursiones de día, fauna extraordinaria y el confort de volver siempre a la misma base." : "A close, flexible way to discover the Galapagos: wildlife-led day excursions and the comfort of returning to the same Santa Cruz base.", hero: "darwins-steps-walk.jpg", widths: [], position: "50% 52%", alt: es ? "Viajeros caminando por una isla de Galápagos" : "Travelers hiking across a Galapagos island" })}
    <section class="anahi-intro section" id="story"><div class="shell anahi-intro__grid"><div class="anahi-intro__index"><span>08</span><small>${es ? "No es crucero" : "Not a cruise"}</small></div><div class="anahi-intro__lead"><span class="eyebrow">${es ? "La idea" : "The idea"}</span><h2>${es ? "Una isla como punto de partida." : "One island as your starting point."}</h2></div><div class="anahi-intro__detail"><p>${es ? "Darwin's Steps es un tour terrestre con base en Santa Cruz. Cada día puedes salir hacia una nueva experiencia y regresar a una habitación cómoda, sin cambiar de barco ni de alojamiento." : "Darwin's Steps is a land-based tour with a Santa Cruz base. Each day opens onto a new experience before you return to a comfortable room—without changing boats or hotels."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos">${es ? "Planificar Santa Cruz" : "Plan Santa Cruz"} ${icon("arrow")}</a></div></div></section>
    <section class="anahi-rhythm section section--muted"><div class="shell"><div class="section-heading anahi-rhythm__heading"><span class="eyebrow">${es ? "Un día tras otro" : "Day after day"}</span><h2>${es ? "Explora más, empaca menos." : "Explore more, unpack once."}</h2></div><div class="anahi-rhythm__grid"><article><span>01</span><h3>${es ? "Base en Santa Cruz" : "Santa Cruz base"}</h3><p>${es ? "Una estancia cómoda en la isla que hace sencillo organizar cada salida." : "A comfortable island stay that makes each day trip easy to arrange."}</p></article><article><span>02</span><h3>${es ? "Excursiones guiadas" : "Guided day trips"}</h3><p>${es ? "Caminatas, costas, fauna y navegación en rutas elegidas según el clima y tus intereses." : "Walks, shores, wildlife and boat outings shaped around weather and your interests."}</p></article><article><span>03</span><h3>${es ? "Fauna extraordinaria" : "Remarkable wildlife"}</h3><p>${es ? "Tortugas gigantes, iguanas marinas, piqueros y fragatas aparecen en el camino." : "Giant tortoises, marine iguanas, boobies and frigatebirds appear along the way."}</p></article></div></div></section>
    <section class="anahi-cabins section"><div class="shell anahi-cabins__grid"><div class="anahi-cabins__copy"><span class="eyebrow">${es ? "Tu base" : "Your base"}</span><h2>${es ? "Vuelve a un lugar tranquilo." : "Return to somewhere calm."}</h2><p>${es ? "Una habitación luminosa para descansar entre excursiones y mantener el viaje sencillo, personal y conectado con la isla." : "A bright room to rest between excursions, keeping the journey simple, personal and connected to the island."}</p><a class="text-link" href="${localizedPath("/plan-your-trip/", locale)}?destination=galapagos">${es ? "Consultar el tour" : "Ask about the tour"} ${icon("arrow")}</a></div><figure class="anahi-cabin anahi-cabin--twin reveal"><img src="/assets/images/darwins-steps-room-1.jpg" alt="${es ? "Habitación doble de Darwin's Steps" : "Darwin's Steps double room"}" loading="lazy" decoding="async"><figcaption>${es ? "Habitación doble" : "Double room"}</figcaption></figure><figure class="anahi-cabin anahi-cabin--suite reveal"><img src="/assets/images/darwins-steps-room-2.jpg" alt="${es ? "Habitación de Darwin's Steps con cama matrimonial" : "Darwin's Steps room with double bed"}" loading="lazy" decoding="async"><figcaption>${es ? "Habitación con cama matrimonial" : "Double-bed room"}</figcaption></figure></div></section>
    <section class="anahi-wildlife section section--deep"><div class="shell anahi-wildlife__grid"><figure class="anahi-wildlife__image reveal"><img src="/assets/images/darwins-steps-tortoise.jpg" alt="${es ? "Tortuga gigante en Santa Cruz" : "Giant tortoise in Santa Cruz"}" loading="lazy" decoding="async"></figure><div class="anahi-wildlife__copy"><span class="eyebrow light">${es ? "La isla" : "The island"}</span><h2>${es ? "Santa Cruz abre muchas puertas." : "Santa Cruz opens many doors."}</h2><p>${es ? "Desde los bosques altos hasta la costa y las islas cercanas, Santa Cruz es una base natural para leer la historia viva de Galápagos." : "From the highlands to the coast and nearby islands, Santa Cruz is a natural base for reading the living history of the Galapagos."}</p><a class="text-link light" href="${localizedPath("/destinations/galapagos/", locale)}">${es ? "Explorar Galápagos" : "Explore the Galapagos"} ${icon("diagonal")}</a></div></div></section>
    <section class="gallery-section section anahi-gallery" aria-label="${es ? "Galería de Darwin's Steps" : "Darwin's Steps gallery"}"><div class="shell section-heading"><span class="eyebrow reveal">${es ? "La experiencia" : "The experience"}</span><h2 class="reveal">${es ? "Mira más de cerca." : "Look closer."}</h2></div><div class="shell">${gallery(galleryItems, "anahi")}</div></section>
    ${finalCta(es ? "Tu viaje a Galápagos" : "Your Galapagos journey", es ? "Descubre las islas desde Santa Cruz." : "Discover the islands from Santa Cruz.")}
  </main>`;
}

function destinationPage(d, locale = "en") {
  const es = locale === "es";
  return `<main id="main">
    ${pageHero({ eyebrow: `${d.number} · ${d.eyebrow}`, title: d.title, copy: d.short, hero: d.hero, widths: d.heroWidths, position: d.heroPosition, alt: `${d.name}, Ecuador`, credit: d.credit })}
    <section class="destination-story section" id="story">
      <div class="shell story-grid story-grid--destination">
        <div class="story-index reveal"><span>${d.number}</span><div></div><small>${d.name}</small></div>
        <div class="story-lead reveal"><span class="eyebrow">The experience</span><h2>${d.intro}</h2></div>
        <div class="story-detail reveal"><p>${d.detail}</p><a class="text-link" href="/plan-your-trip/?destination=${d.slug}">${es ? "Planifica tu viaje" : "Plan your trip"} ${icon("arrow")}</a></div>
        <figure class="story-visual reveal"><img src="/assets/images/${(d.storyImage || d.gallery[0])[0]}" alt="${escapeHtml((d.storyImage || d.gallery[0])[1])}" loading="lazy" decoding="async"></figure>
      </div>
    </section>
    ${d.slug === "amazon" ? amazonLodges(locale) : d.slug === "galapagos" ? `${galapagosCruise(locale)}<section id="land-tours" class="galapagos-program-group section section--muted"><div class="shell"><div class="section-heading"><span class="eyebrow">${es ? "Tours terrestres · alojamiento en tierra" : "Land-based tours · accommodation on land"}</span><h2>${es ? "Duerme en tierra. Explora las islas de día." : "Stay on land. Explore the islands by day."}</h2><p>${es ? "Estas opciones tienen alojamiento en una isla y excursiones guiadas; no son cruceros." : "These options include accommodation on an island and guided excursions; they are not cruises."}</p></div>${naturalistFeature(locale)}${darwinsStepsFeature(locale)}</div></section>` : ""}
    ${["nono", "andes"].includes(d.slug) ? `<section class="nono-stay-link section section--muted"><div class="shell"><div><span class="eyebrow">${es ? "Alojamiento en Nono" : "Stay in Nono"}</span><h2>${es ? "Conoce Villa Doris." : "Meet Villa Doris."}</h2><p>${es ? "Descubre la casa, sus habitaciones y jardines antes de planificar tu estancia." : "Explore the house, rooms and gardens as you plan your stay."}</p><a class="text-link" href="${localizedPath("/villa-doris/", locale)}">${es ? "Conoce Villa Doris" : "Discover Villa Doris"} ${icon("arrow")}</a></div></div></section>` : ""}
    <!--full-copy-->
    <section class="gallery-section section">
      <div class="shell section-heading"><span class="eyebrow reveal">A sense of place</span><h2 class="reveal">Look closer.</h2></div>
      <div class="shell">${gallery(d.gallery)}</div>
    </section>
    <section class="experience-list-section section section--muted">
      <div class="shell section-heading"><span class="eyebrow reveal">Ways to explore</span><h2 class="reveal">Explore your way.</h2></div>
      <div class="shell experience-list">
        ${d.experiences.map(([title,copy],index)=>`<article class="experience-row reveal"><span>${String(index+1).padStart(2,"0")}</span><h3>${title}</h3><p>${copy}</p>${icon(index % 2 ? "route" : "compass")}</article>`).join("")}
      </div>
    </section>
    ${finalCta(es ? `Diseña un viaje por ${d.name}` : `Build a journey with ${d.name}`, es ? "Haz de este paisaje parte de tu historia." : "Make this landscape part of your story.")}
  </main>`;
}

function villaPage(locale = "en") {
  const es = locale === "es";
  const programs = es ? [
    { name: "A Day in the Clouds", length: "Excursión de un día", note: "Visita cultural y natural a Nono, con Zuro Loma y almuerzo en la casa de campo. No incluye noche de alojamiento.", days: [["Durante el día", "Recorre Nono, conoce su historia y cultura local, observa colibríes, flores y bromelias, y visita la reserva de aves Zuro Loma. Incluye almuerzo en la casa de campo."]] },
    { name: "Nono & the Eco-route of the Hummingbird", length: "2 días / 1 noche", note: "Una escapada con una noche en Villa Doris.", days: [["Día 1 · Quito – Nono", "Traslado desde Quito, paseo por el pueblo y visita a la reserva Zuro Loma. Almuerzo, cena y alojamiento en Villa Doris."], ["Día 2 · Ruta del colibrí", "Desayuno campestre y recorrido por el valle de Tandayapa. Visita a una reserva natural de colibríes y tangaras, almuerzo en un restaurante local y regreso a Quito."]] },
    { name: "Eco-route of the Hummingbird", length: "4 días / 3 noches", note: "Tres noches en Nono para explorar distintos ecosistemas del bosque nublado.", days: [["Día 1 · Aeropuerto de Quito – Nono", "Traslado a Nono, cena de bienvenida y alojamiento en Villa Doris."], ["Día 2 · Reservas naturales", "Caminata matutina en Zuro Loma o Yanacocha, almuerzo tipo box lunch, tiempo libre en el pueblo, cena y alojamiento."], ["Día 3 · Ruta del colibrí", "Caminata en la Reserva Pahuma, visita a una reserva de aves, jardín de orquídeas y taller de cacao en Mindo. Almuerzo por cuenta propia. Regreso a Villa Doris para cenar y alojarse."], ["Día 4 · Regreso a Quito", "Desayuno y traslado a Quito. Ciclismo y cabalgata pueden añadirse como actividades opcionales."]] }
  ] : [
    { name: "A Day in the Clouds", length: "Day tour", note: "A cultural and nature day in Nono, including Zuro Loma and lunch at the country house. No overnight stay.", days: [["During the day", "Explore Nono’s history and local culture, look for hummingbirds, wildflowers and bromeliads, and visit Zuro Loma bird reserve. Lunch is served at the country house."]] },
    { name: "Nono & the Eco-route of the Hummingbird", length: "2 days / 1 night", note: "A short getaway with one overnight stay at Villa Doris.", days: [["Day 1 · Quito – Nono", "Transfer from Quito, walk through the village and visit Zuro Loma. Lunch, dinner and overnight at Villa Doris."], ["Day 2 · Eco-route of the Hummingbird", "Country breakfast and a journey through Tandayapa Valley. Visit a nature reserve for hummingbirds and tanagers, have lunch at a local restaurant and return to Quito."]] },
    { name: "Eco-route of the Hummingbird", length: "4 days / 3 nights", note: "Three nights in Nono, exploring the changing cloud-forest ecosystems.", days: [["Day 1 · Quito Airport – Nono", "Transfer to Nono, welcome dinner and overnight at Villa Doris."], ["Day 2 · Natural reserves", "Morning hike at Zuro Loma or Yanacocha, box lunch, free time in the village, dinner and overnight."], ["Day 3 · Eco-route of the Hummingbird", "Hike at Pahuma Reserve, visit a local bird reserve, an orchid garden and a cacao workshop in Mindo. Lunch at your own expense. Return to Villa Doris for dinner and overnight."], ["Day 4 · Return to Quito", "Breakfast and transfer to Quito. Biking and horseback riding are optional add-ons."]] }
  ];
  return `<main id="main">
    ${pageHero({ eyebrow: "Nono · Chocó Andino cloud forest", title: villa.title, copy: es ? "Una casa de campo en Nono, a poca distancia de Quito." : "A quiet country house in Nono, just beyond Quito.", hero: "hero-villa", widths: [1200,1600], position: "50% 46%", alt: "Villa Doris country house in Nono, Ecuador", variant: "villa" })}
    <section class="destination-story section" id="story">
      <div class="shell story-grid"><div class="story-index reveal"><span>05</span><div></div><small>Villa Doris</small></div><div class="story-lead reveal"><span class="eyebrow">${es ? "Una estancia tranquila" : "A peaceful stay"}</span><h2>${villa.intro}</h2></div><div class="story-detail reveal"><p>${villa.detail}</p><a class="text-link" href="/plan-your-trip/?destination=nono&program=Villa%20Doris%20Guest%20House">${es ? "Consultar estadía" : "Ask about a stay"} ${icon("arrow")}</a><a class="text-link" href="/destinations/nono/">${es ? "Descubrir Nono" : "Discover Nono"} ${icon("arrow")}</a></div></div>
    </section>
    <!--full-copy-->
    <section class="villa-landscape section section--muted">
      <div class="shell villa-landscape__grid">
        <div class="villa-landscape__image reveal"><img src="/assets/images/villa-doris-garden.webp" alt="Flowering garden and stone path at Villa Doris" loading="lazy"></div>
        <div class="villa-landscape__copy reveal"><span class="eyebrow">${es ? "Entorno de bosque nublado" : "Cloud-forest setting"}</span><h2>${es ? "Un refugio tranquilo,<br>cerca de Quito." : "A peaceful escape,<br>close to Quito."}</h2><p>${es ? "Explora los senderos y descansa en el jardín." : "Explore local trails, then unwind in the garden."}</p>${icon("home", "icon icon--xl")}</div>
      </div>
      <div class="shell experience-list villa-highlights">${villa.highlights.map(([title,copy],index)=>`<article class="experience-row reveal"><span>${String(index+1).padStart(2,"0")}</span><h3>${title}</h3><p>${copy}</p>${icon(index === 0 ? "bird" : index === 1 ? "pin" : index === 2 ? "home" : "leaf")}</article>`).join("")}</div>
    </section>
    <section class="villa-experiences section" id="villa-experiences"><div class="shell"><div class="section-heading"><span class="eyebrow">${es ? "Experiencias desde Villa Doris" : "Experiences from Villa Doris"}</span><h2>${es ? "Elige cómo explorar Nono." : "Choose how to explore Nono."}</h2><p>${es ? "Las actividades y noches de alojamiento dependen del programa seleccionado." : "Activities and overnight stays depend on the program selected."}</p></div><div class="villa-experience-grid">${programs.map((program,index)=>`<article class="villa-program-card"><span class="eyebrow">0${index+1} · ${program.length}</span><h3>${program.name}</h3><p>${program.note}</p><details><summary>${es ? "Ver itinerario" : "View itinerary"}</summary><div class="villa-program-days">${program.days.map(([day,copy])=>`<div><h4>${day}</h4><p>${copy}</p></div>`).join("")}</div></details><a class="text-link" href="/plan-your-trip/?destination=nono&program=${encodeURIComponent(program.name)}">${es ? "Consultar este programa" : "Ask about this program"} ${icon("arrow")}</a></article>`).join("")}</div></div></section>
    <section class="gallery-section gallery-section--villa section" aria-label="Villa Doris photo gallery"><div class="shell">${gallery(villa.gallery, "villa")}</div></section>
    ${finalCta(es ? "Hospédate en Villa Doris" : "Stay at Villa Doris", es ? "Comienza o termina tu viaje por Ecuador en Nono." : "Begin or end your Ecuador journey in Nono.")}
  </main>`;
}

function aboutPage() {
  return `<main id="main">
    <section class="about-hero">
      <div class="shell about-hero__grid">
        <div class="about-hero__copy"><span class="eyebrow reveal">About Inca Holidays</span><h1 class="reveal">Ecuador, seen closer.</h1><p class="reveal">Ecuadorian-led journeys across four regions, shaped by 24 years of local knowledge.</p></div>
        <div class="about-hero__image reveal"><img src="/assets/images/about-local-connection.webp" alt="A traveler and an Indigenous Ecuadorian woman sharing a warm moment" fetchpriority="high"><span>Local knowledge. Personal journeys.</span></div>
      </div>
    </section>
    <section class="about-statement section" id="story"><div class="shell about-statement__grid"><span class="eyebrow reveal">What guides the work</span><h2 class="reveal">Travel with local insight.</h2><div class="reveal"><p>Nature, culture and quieter places, connected at your pace.</p></div></div></section>
    <section class="about-visual-story section" aria-label="People, culture and wildlife in Ecuador">
      <div class="shell">
        <div class="about-visual-story__heading reveal"><span class="eyebrow">People, culture and place</span><h2>Every journey begins with connection.</h2></div>
        <div class="about-visual-story__grid">
          <figure class="about-photo about-photo--culture reveal"><img src="/assets/images/andes-festival.webp" alt="Traditional dance in an Andean community" loading="lazy" decoding="async"><figcaption>Culture · Andes</figcaption></figure>
          <figure class="about-photo about-photo--community reveal"><img src="/assets/images/amazon-community.webp" alt="Community member in the Ecuadorian Amazon" loading="lazy" decoding="async"><figcaption>Community · Amazonía</figcaption></figure>
          <figure class="about-photo about-photo--wildlife reveal"><img src="/assets/images/galapagos-seal.webp" alt="Sea lion and pup on a Galápagos beach" loading="lazy" decoding="async"><figcaption>Wildlife · Galápagos</figcaption></figure>
        </div>
      </div>
    </section>
    <section class="values-section section section--muted"><div class="shell values-grid">
      <article class="reveal"><span>01</span>${icon("compass","icon icon--lg")}<h3>Designed, not packaged</h3><p>The itinerary begins with your interests, duration and preferred pace.</p></article>
      <article class="reveal"><span>02</span>${icon("route","icon icon--lg")}<h3>Highlights and hidden corners</h3><p>Signature places are balanced with quieter routes and local context.</p></article>
      <article class="reveal"><span>03</span>${icon("leaf","icon icon--lg")}<h3>Nature with responsibility</h3><p>Conservation and community matter in the choices described by the brochure.</p></article>
    </div></section>
    <section class="contact-band"><div class="shell contact-band__grid"><div><span class="eyebrow light">Based in Quito</span><h2>Your journey begins here.</h2></div><div><p>Tell us where you want to go.</p><a class="button button--light" href="/plan-your-trip/">Start the conversation ${icon("arrow")}</a></div></div></section>
    ${finalCta()}
  </main>`;
}

function planPage() {
  const checks = destinations.map(d => `<label class="check-card"><input type="checkbox" name="destinations" value="${d.name}" data-destination="${d.slug}"><span class="check-mark"></span><strong>${d.name}</strong><small>${d.eyebrow}</small></label>`).join("");
  return `<main id="main" class="plan-page">
    <section class="plan-intro"><div class="shell"><span class="eyebrow reveal">Plan your trip</span><h1 class="reveal">Your journey starts here.</h1><p class="reveal">Choose your places and dates. Review the email request before sending.</p></div></section>
    <section class="plan-form-section section" id="story"><div class="shell plan-grid">
      <aside class="plan-aside reveal"><span class="eyebrow">Direct contact</span><h2>Prefer to talk first?</h2><p>Contact our team in Quito.</p><a href="mailto:${site.email}">${icon("mail")}<span><small>Email</small>${site.email}</span></a><a href="mailto:${site.emailHref}">${icon("mail")}<span><small>Direct inbox</small>${site.emailSecondary}</span></a><a href="https://wa.me/${site.whatsappHref}" rel="noopener">${icon("whatsapp")}<span><small>WhatsApp</small>${site.whatsappDisplay}</span></a><div class="aside-note">${icon("pin")}<span><small>Based in</small>${site.location}</span></div><div class="aside-note">${icon("calendar")}<span><small>Opening hours</small>Monday to Friday · 09:00–17:00</span></div><a href="https://instagram.com/nonovilladoris" rel="noopener">${icon("diagonal")}<span><small>Instagram / Facebook</small>@nonovilladoris</span></a></aside>
      <form class="trip-form reveal" data-trip-form novalidate>
        <input type="hidden" name="trip_context" value="">
        <div class="form-context" data-form-context hidden role="status"></div>
        <div class="form-step"><span>01</span><div><h2>About you</h2><p>Who should we contact about this journey?</p></div></div>
        <div class="form-row"><label>Full name <input type="text" name="name" autocomplete="name" required><span class="field-error"></span></label><label>Email <input type="email" name="email" autocomplete="email" required><span class="field-error"></span></label></div>
        <div class="form-row"><label>WhatsApp with country code <input type="tel" name="whatsapp" autocomplete="tel" placeholder="+1 415 555 0142" required><span class="field-error"></span></label><label>Number of travelers <input type="number" name="travelers" min="1" max="30" inputmode="numeric" required><span class="field-error"></span></label></div>
        <div class="form-step form-step--spaced"><span>02</span><div><h2>Where would you like to go?</h2><p>Select every region that interests you.</p></div></div>
        <fieldset class="destination-checks"><legend class="sr-only">Destinations of interest</legend>${checks}<label class="check-card"><input type="checkbox" name="destinations" value="Villa Doris" data-destination="villa-doris"><span class="check-mark"></span><strong>Villa Doris</strong><small>Country house in Nono</small></label></fieldset><span class="group-error" data-destination-error></span>
        <div class="form-step form-step--spaced"><span>03</span><div><h2>Shape the journey</h2><p>Approximate information is enough to begin.</p></div></div>
        <div class="form-row"><label>Approximate start <input type="month" name="start"><span class="field-error"></span></label><label>Approximate end <input type="month" name="end"><span class="field-error"></span></label></div>
        <label>Preferred experience <select name="experience" required><option value="">Choose one</option><option>Cultural experiences</option><option>Soft adventure</option><option>Nature and wildlife</option><option>Birdwatching</option><option>A balanced mix</option></select><span class="field-error"></span></label>
        <label>Comments or preferences <textarea name="comments" rows="6" placeholder="Tell us about your interests, pace, mobility needs, celebrations or anything else that would help shape the route."></textarea><span class="field-error"></span></label>
        <label class="consent"><input type="checkbox" name="consent" required><span class="check-mark"></span><span>I agree to use these details to prepare and send an enquiry to Inca Holidays.</span></label><span class="field-error consent-error"></span>
        <label class="honeypot" aria-hidden="true">Company website <input type="text" name="company_website" tabindex="-1" autocomplete="off"></label>
        <button class="button button--ink submit-button" type="submit"><span>Prepare my trip request</span>${icon("arrow")}</button>
        <div class="form-status" role="status" aria-live="polite" data-form-status></div>
        <a class="form-whatsapp" data-form-whatsapp href="https://wa.me/${site.whatsappHref}" target="_blank" rel="noopener">Continue by WhatsApp ${icon("whatsapp")}</a>
      </form>
    </div></section>
  </main>`;
}

function privacyPage() {
  return `<main id="main" class="legal-page"><section class="legal-hero"><div class="shell"><span class="eyebrow">Website information</span><h1>Privacy notice</h1><p>Last reviewed for this website draft: October 26, 2026.</p></div></section><section class="legal-content section"><div class="shell legal-grid"><aside><a href="#enquiries">Trip enquiries</a><a href="#contact">Contact</a><a href="#choices">Your choices</a></aside><article><h2 id="enquiries">Trip enquiries</h2><p>The trip form prepares an email draft in your own email application. This website does not store the form details in a database. Your information is sent only when you choose to send the email to Inca Holidays.</p><h2 id="contact">Contact information</h2><p>Use <a href="mailto:${site.email}">${site.email}</a> or <a href="mailto:${site.emailHref}">${site.emailSecondary}</a> for questions about information you have shared with Inca Holidays.</p><h2 id="choices">Your choices</h2><p>You can contact Inca Holidays directly without using the form. Do not include sensitive personal or payment information in an initial enquiry.</p><p class="legal-note">This notice describes the behavior of this website draft. It should be reviewed by the business before the final domain launch.</p></article></div></section></main>`;
}

function termsPage() {
  return `<main id="main" class="legal-page"><section class="legal-hero"><div class="shell"><span class="eyebrow">Website information</span><h1>Website terms</h1><p>Plain-language terms for this website draft.</p></div></section><section class="legal-content section"><div class="shell legal-grid"><aside><a href="#information">Travel information</a><a href="#enquiries">Enquiries</a><a href="#imagery">Imagery</a></aside><article><h2 id="information">Travel information</h2><p>The website introduces the destinations and experiences documented in the Inca Holidays brochure. It does not display prices, live availability, confirmed bookings or automatic reservations.</p><h2 id="enquiries">Enquiries are not bookings</h2><p>Submitting or emailing a trip request begins a conversation. A booking exists only after Inca Holidays provides and confirms the relevant commercial terms directly with you.</p><h2 id="imagery">Photography</h2><p>Destination photography is illustrative of the documented regions. Villa Doris photography is drawn from verified property material supplied through the brochure and the existing Inca Holidays website.</p><p class="legal-note">These draft terms should be reviewed by the business before the final domain launch.</p></article></div></section></main>`;
}

const spanishTranslations = [
  ["A measure · Ecuador and Galápagos", "A medida · Ecuador y Galápagos"], ["<span>Travel</span> <span>deeper</span>", "<span>Viaja</span> <span>más profundo</span>"], ["into Ecuador.", "por Ecuador."],
  ["Cultural encounters, soft adventure and considered routes for independent travelers and small groups.", "Encuentros culturales, aventura suave y rutas pensadas para viajeros independientes y grupos pequeños."],
  ["Chimborazo above the Andean páramo", "El Chimborazo sobre el páramo andino"], ["Rainforest canopy in Ecuador", "Dosel de la selva ecuatoriana"], ["Green Ecuadorian cloud forest", "Bosque nublado ecuatoriano"], ["Volcanic shores of Galápagos", "Costas volcánicas de Galápagos"], ["A shared moment with a local host in Ecuador", "Un momento compartido con un anfitrión local en Ecuador"], ["We felt welcomed into the real Ecuador, one thoughtful moment at a time.", "Nos sentimos bienvenidos al Ecuador auténtico, un momento especial a la vez."],
  ["Chimborazo · 6,263 m", "Chimborazo · 6.263 m"], ["Cotopaxi · 4,897 m", "Cotopaxi · 4.897 m"], ["Napo · Ecuador", "Napo · Ecuador"], ["Chocó Andino · 0°", "Chocó Andino · 0°"], ["0° 45′ S · Pacific", "0° 45′ S · Pacífico"], ["01 / ECUADOR", "01 / ECUADOR"], ["02 / ECUADOR", "02 / ECUADOR"], ["03 / ECUADOR", "03 / ECUADOR"], ["04 / ECUADOR", "04 / ECUADOR"],
  ["One country, four worlds", "Un país, cuatro mundos"], ["Follow the feeling.", "Sigue lo que te mueve."], ["Amazonía", "Amazonía"], ["Coast and cloud forest", "Costa y bosque nublado"], ["Coast", "Costa"], ["Explore Amazonía", "Explora Amazonía"], ["Explore Coast and cloud forest", "Explora Costa y bosque nublado"],
  ["A route that finds its own rhythm", "Una ruta que encuentra su propio ritmo"], ["From the highlands<br>to the living ocean.", "De los Andes<br>al océano vivo."], ["Begin with stories, colors and a table set for you.", "Empieza entre historias, colores y una mesa compartida."], ["Cross high valleys at a pace that leaves room to stop.", "Cruza valles altos a un ritmo que deja espacio para detenerse."], ["Follow waterways into a world that moves to its own time.", "Sigue los ríos hacia un mundo que vive a su propio ritmo."], ["End where ancient islands meet the open Pacific.", "Termina donde islas antiguas se encuentran con el Pacífico."],
  ["Travel with intention", "Viajar con intención"], ["Made personal,<br>at every turn.", "Hecho a tu medida,<br>en cada paso."], ["Small groups", "Grupos pequeños"], ["Space to notice more.", "Espacio para descubrir más."], ["Local hosts", "Anfitriones locales"], ["People who make a place mean something.", "Personas que dan sentido a cada lugar."], ["Your own pace", "Tu propio ritmo"], ["Room for the unplanned.", "Espacio para lo inesperado."], ["A memory to carry", "Un recuerdo para llevar"], ["— Inca Holidays traveler", "— Viajero de Inca Holidays"], ["Ecuador, at your own pace", "Ecuador, a tu propio ritmo"], ["Your Ecuador<br>starts here.", "Tu Ecuador<br>empieza aquí."], ["Discover Ecuador", "Descubre Ecuador"], ["Design your route", "Diseña tu ruta"], ["Altitude", "Altura"], ["Culture", "Cultura"], ["Nature", "Naturaleza"], ["Ocean", "Océano"],
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
  ["A richer way to travel", "Una forma más profunda de viajar"], ["Small moments make the distance worthwhile.", "Los pequeños momentos hacen que la distancia valga la pena."], ["Wildlife that rewards patience", "Fauna que recompensa la paciencia"], ["Culture with context", "Cultura con contexto"], ["Stay close to nature", "Quédate cerca de la naturaleza"], ["A country house surrounded by the biodiversity and village life of Nono, presented in the brochure as a welcoming place to begin or end an Ecuador journey.", "Una casa de campo rodeada por la biodiversidad y la vida de Nono, presentada en el folleto como un lugar acogedor para comenzar o terminar un viaje por Ecuador."], ["Discover Villa Doris", "Descubre Villa Doris"], ["Travel with care", "Viaja con cuidado"], ["Nature, hospitality and community belong in the same story.", "La naturaleza, la hospitalidad y la comunidad forman parte de la misma historia."], ["We work with local guides and community projects, support native forest restoration and make thoughtful choices at Villa Doris, from refillable water to seasonal local ingredients.", "El folleto sitúa el viaje responsable en el centro de las decisiones de alojamiento en la Amazonía y de la relación de Villa Doris con su comunidad local. Esa perspectiva guía la forma en que presentamos estos viajes."], ["Your journey, made personal", "Tu viaje, hecho personal"], ["Tell us what you want to discover.", "Cuéntanos qué quieres descubrir."], ["Tell us when and how you want to travel.", "Cuéntanos cuándo y cómo quieres viajar."],
  ["Ecuador in four directions", "Ecuador en cuatro direcciones"], ["One country. Four worlds.", "Un país. Cuatro mundos."], ["Islands, highlands, rainforest and cloud forest, shaped into your journey.", "Islas, Andes, Amazonía y bosque nublado en un viaje a tu medida."], ["The destination atlas", "El atlas de destinos"], ["Four distinct regions. Endless ways to explore.", "Cuatro regiones distintas. Infinitas formas de explorar."], ["Combine regions", "Combina regiones"], ["Let Ecuador unfold one landscape at a time.", "Deja que Ecuador se revele paisaje a paisaje."],
  ["The experience", "La experiencia"], ["Include", "Incluye"], ["Ways to explore", "Formas de explorar"], ["Designed around", "Diseñado según"], ["how you travel.", "tu forma de viajar."], ["These are the ingredients documented in the Inca Holidays brochure. Your itinerary can bring them together in a way that suits your time and interests.", "Estos son los ingredientes que aparecen en el folleto de Inca Holidays. Tu itinerario puede reunirlos de una forma que se adapte a tu tiempo e intereses."], ["A sense of place", "El espíritu del lugar"], ["Look closer.", "Mira más de cerca."], ["Build a journey with", "Construye un viaje con"], ["Make this landscape part of your story.", "Haz que este paisaje sea parte de tu historia."],
  ["A stay with context", "Una estancia con contexto"], ["Ask about Villa Doris", "Pregunta por Villa Doris"], ["Cloud-forest setting", "Entorno de bosque nublado"], ["Close to Quito.<br>Surrounded by another rhythm.", "Cerca de Quito.<br>Rodeada de otro ritmo."], ["Villa Doris, from within", "Villa Doris, por dentro"], ["A place close to our hearts.", "Un lugar que llevamos en el corazón."], ["Walk through the house, gardens and valley that make Villa Doris feel like home. Select any photograph to see it in full.", "Recorre la casa, los jardines y el valle que hacen de Villa Doris un hogar. Selecciona cualquier fotografía para verla en detalle."], ["Stay at Villa Doris", "Alójate en Villa Doris"], ["Begin or end your Ecuador journey in Nono.", "Comienza o termina tu viaje por Ecuador en Nono."],
  ["About Inca Holidays", "Sobre Inca Holidays"], ["Ecuador, seen closer.", "Ecuador, más de cerca."], ["Ecuadorian-led journeys across four regions, shaped by 24 years of local knowledge.", "Viajes por las cuatro regiones del Ecuador, diseñados con 24 años de conocimiento local."], ["Local knowledge. Personal journeys.", "Conocimiento local. Viajes personales."], ["What guides the work", "Lo que guía nuestro trabajo"], ["Travel with local insight.", "Viaja con mirada local."], ["Designed, not packaged", "Diseñado, no empaquetado"], ["Highlights and hidden corners", "Lugares destacados y rincones ocultos"], ["Nature with responsibility", "Naturaleza con responsabilidad"], ["Based in Quito", "Con sede en Quito"], ["Your journey begins here.", "Tu viaje comienza aquí."], ["Tell us where you want to go.", "Cuéntanos adónde quieres ir."], ["Start the conversation", "Comienza la conversación"],
  ["Plan your trip", "Planifica tu viaje"], ["Your journey starts here.", "Tu viaje empieza aquí."], ["Choose your places and dates. Review the email request before sending.", "Elige los destinos y fechas. Revisa el correo preparado antes de enviarlo."], ["Direct contact", "Contacto directo"], ["Prefer to talk first?", "¿Prefieres hablar primero?"], ["Contact our team in Quito.", "Contacta con nuestro equipo en Quito."], ["Email", "Correo electrónico"], ["Phone", "Teléfono"], ["Based in", "Con sede en"], ["About you", "Sobre ti"], ["Who should we contact about this journey?", "¿Con quién debemos contactar sobre este viaje?"], ["Full name", "Nombre completo"], ["WhatsApp with country code", "WhatsApp con código de país"], ["Number of travelers", "Número de viajeros"], ["Where would you like to go?", "¿Adónde te gustaría ir?"], ["Select every region that interests you.", "Selecciona cada región que te interese."], ["Country house in Nono", "Casa de campo en Nono"], ["Shape the journey", "Diseña el viaje"], ["Approximate information is enough to begin.", "La información aproximada es suficiente para comenzar."], ["Approximate start", "Inicio aproximado"], ["Approximate end", "Fin aproximado"], ["Preferred experience", "Experiencia preferida"], ["Choose one", "Elige una"], ["Cultural experiences", "Experiencias culturales"], ["Soft adventure", "Aventura suave"], ["Nature and wildlife", "Naturaleza y fauna"], ["Birdwatching", "Observación de aves"], ["A balanced mix", "Una combinación equilibrada"], ["Comments or preferences", "Comentarios o preferencias"], ["Prepare my trip request", "Preparar mi solicitud de viaje"], ["Please review the highlighted fields.", "Revisa los campos destacados."], ["This field is required.", "Este campo es obligatorio."], ["Select at least one destination.", "Selecciona al menos un destino."], ["Please confirm before preparing the email.", "Confirma antes de preparar el correo."], ["The end month must be after the start month.", "El mes de finalización debe ser posterior al de inicio."], ["Creating a pre-filled email for your review.", "Creando un correo preparado para que lo revises."], ["Your request is ready.", "Tu solicitud está lista."], ["Review and send it from your email application.", "Revísala y envíala desde tu aplicación de correo."], ["Open the email draft", "Abrir el borrador de correo"],
  ["Privacy notice", "Aviso de privacidad"], ["Website information", "Información del sitio"], ["Trip enquiries", "Consultas de viaje"], ["Your choices", "Tus opciones"], ["Contact information", "Información de contacto"], ["Website terms", "Términos del sitio web"], ["Plain-language terms for this website draft.", "Términos claros para este borrador del sitio web."], ["Travel information", "Información de viaje"], ["Enquiries are not bookings", "Las consultas no son reservas"], ["Photography", "Fotografía"], ["Page not found", "Página no encontrada"], ["The trail ends here", "El sendero termina aquí"], ["This page has wandered off route.", "Esta página se ha desviado de la ruta."], ["Return to the destination atlas or begin planning a new journey.", "Vuelve al atlas de destinos o comienza a planificar un nuevo viaje."], ["Return home", "Volver al inicio"], ["Explore destinations", "Explora los destinos"],
  ["Galapagos", "Galápagos"], ["Andes & Highlands", "Andes y tierras altas"], ["Amazon Rainforest", "Selva amazónica"], ["Nono Cloud Forest", "Bosque nublado de Nono"], ["Cruises & island hopping", "Cruceros y rutas entre islas"], ["Volcanoes, heritage & living culture", "Volcanes, patrimonio y cultura viva"], ["Biodiversity & conservation", "Biodiversidad y conservación"], ["A hidden Andean paradise", "Un paraíso andino escondido"], ["Wildlife at your pace.", "Fauna a tu ritmo."], ["Where the Andes come alive.", "Donde los Andes cobran vida."], ["Into the living Amazon.", "Entra en la Amazonía viva."], ["Cloud forest, close to Quito.", "Bosque nublado, cerca de Quito."], ["Volcanic islands, remarkable wildlife and journeys by sea or land.", "Islas volcánicas y fauna única, por mar o por tierra."], ["Volcanoes, markets and living traditions across Ecuador's highlands.", "Volcanes, mercados y tradiciones vivas en los Andes ecuatorianos."], ["Canoe journeys, forest trails and encounters with local guides.", "Canoas, senderos y encuentros con guías locales."], ["Hummingbirds, village life and forest trails in Nono.", "Colibríes, vida de pueblo y senderos en Nono."], ["The Galapagos Islands reward unhurried exploration.", "Las islas Galápagos recompensan la exploración sin prisa."], ["Volcanic landscapes", "Paisajes volcánicos"], ["Colonial haciendas", "Haciendas coloniales"], ["Markets & heritage", "Mercados y patrimonio"], ["Local cultures", "Culturas locales"], ["Guided walks", "Caminatas guiadas"], ["Canoe journeys", "Viajes en canoa"], ["Wildlife & birds", "Fauna y aves"], ["Cultural connection", "Conexión cultural"], ["One, two or four days", "Uno, dos o cuatro días"], ["Active exploration", "Exploración activa"], ["Birdlife", "Vida de aves"], ["Local life", "Vida local"], ["Cruises", "Cruceros"], ["Island hopping", "Ruta entre islas"], ["Endemic wildlife", "Fauna endémica"], ["Flexible duration", "Duración flexible"]
];

spanishTranslations.push(
  ["Experiences", "Experiencias"], ["Lodges · cruises · stays", "Lodges · cruceros · alojamientos"], ["Galápagos · Andes · Amazon · Nono", "Galápagos · Andes · Amazonía · Nono"],
  ["The house and its spaces.", "La casa y sus espacios."], ["Villa Doris · The property", "Villa Doris · La propiedad"], ["Villa Doris property", "La casa de Villa Doris"],
  ["Available durations:", "Duraciones disponibles:"], ["Explore programs", "Explorar programas"], ["Programs & itineraries", "Programas e itinerarios"], ["Ask about this program", "Consulta este programa"], ["Compare the three lodges by setting, activities and duration before opening each itinerary.", "Compara los tres lodges por su entorno, actividades y duración antes de abrir cada itinerario."], ["Explore lodges", "Explorar lodges"],
  ["Ways to explore", "Formas de explorar"], ["Choose how to experience the islands.", "Elige cómo vivir las islas."], ["Land-based journeys", "Rutas terrestres"], ["Explore from a Santa Cruz base with day excursions.", "Explora desde Santa Cruz con excursiones de día."], ["Shape a journey around your dates and interests.", "Diseña un viaje según tus fechas e intereses."], ["Cruise · Yacht Anahi", "Crucero · Yacht Anahi"], ["Explore the yacht and its experience on its dedicated page.", "Conoce el yate y su experiencia en su página dedicada."], ["Cruise · Galápagos", "Crucero · Galápagos"], ["Tailor-made", "A medida"],
  ["Stay in Nono", "Alójate en Nono"], ["Meet Villa Doris.", "Conoce Villa Doris."], ["Explore the house, rooms and gardens as you plan your stay.", "Descubre la casa, las habitaciones y los jardines al planificar tu estancia."], ["Discover Villa Doris", "Conoce Villa Doris"], ["Discover Nono", "Descubre Nono"],
  ["Continue by WhatsApp", "Continuar por WhatsApp"], ["Selected experience", "Experiencia seleccionada"], ["To be decided", "Por definir"], ["Destination", "Destino"], ["Experience", "Experiencia"], ["Notes", "Comentarios"],
  ["Opening hours", "Horario de atención"],
  ["Monday to Friday · 09:00–17:00", "Lunes a viernes · 09:00–17:00"],
  ["Instagram / Facebook", "Instagram / Facebook"],
  ["Explore your way.", "Explora a tu manera."],
  ["People, culture and place", "Personas, cultura y territorio"],
  ["People, culture and wildlife in Ecuador", "Personas, cultura y fauna de Ecuador"],
  ["People and nature in Nono", "Personas y naturaleza en Nono"],
  ["Woman in the countryside near Nono", "Mujer en el campo cerca de Nono"],
  ["Traveler watching nature in the countryside", "Persona observando la naturaleza en el campo"],
  ["Squirrel on a branch", "Ardilla en una rama"],
  ["Local life", "Vida local"],
  ["Birdwatching", "Observación de aves"],
  ["Local wildlife", "Fauna local"],
  ["Stay close to nature.", "Vive cerca de la naturaleza."],
  ["Gardens, local food and forest trails, about an hour from Quito.", "Jardines, comida local y senderos, a una hora de Quito."],
  ["A quiet country house in Nono, just beyond Quito.", "Una casa de campo tranquila en Nono, cerca de Quito."],
  ["A peaceful stay", "Una estancia tranquila"],
  ["A peaceful escape,<br>close to Quito.", "Un refugio tranquilo,<br>cerca de Quito."],
  ["Explore local trails, then unwind in the garden.", "Explora los senderos y descansa en el jardín."],
  ["Programs & activities", "Programas y actividades"],
  ["Find your itinerary", "Encuentra tu itinerario"],
  ["Destination programs and activities", "Programas y actividades por destino"],
  ["Every journey begins with connection.", "Cada viaje comienza con una conexión."],
  ["Culture · Andes", "Cultura · Andes"],
  ["Community · Amazonía", "Comunidad · Amazonía"],
  ["Wildlife · Galápagos", "Fauna · Galápagos"]
);

spanishTranslations.push(
  ["A home in the cloud forest.", "Una casa en el bosque nublado."],
  ["Nono · Chocó Andino cloud forest", "Nono · Bosque nublado del Chocó Andino"],
  ["Our own country house, shared with the warmth and care we would offer invited friends.", "Nuestra propia casa de campo, compartida con la calidez y el cuidado que ofreceríamos a nuestros amigos."],
  ["Villa Doris is Inca Holidays' own country house in Nono, surrounded by the nature of the Choco Andino cloud forest and connected to the biodiversity, food and people of the valley.", "Villa Doris es la casa de campo propia de Inca Holidays en Nono, rodeada por la naturaleza del bosque nublado del Chocó Andino y conectada con la biodiversidad, la gastronomía y la gente del valle."],
  ["Because Villa Doris is ours, every stay feels personal. It is a place we know by heart and love to share: warm Ecuadorian hospitality, generous gardens, local flavors and the cloud forest just beyond the door.", "Como Villa Doris es nuestra, cada estadía se siente personal. Es un lugar que conocemos de memoria y nos encanta compartir: hospitalidad ecuatoriana, jardines generosos, sabores locales y el bosque nublado al otro lado de la puerta."],
  ["Between valley and cloud forest", "Entre el valle y el bosque nublado"], ["The house", "La casa"], ["Gardens in bloom", "Jardines en flor"], ["Wake to the garden", "Despertar frente al jardín"], ["Gather around the table", "Reunirse alrededor de la mesa"], ["Country character", "Carácter de campo"], ["A warm corner", "Un rincón cálido"], ["Slow mornings", "Mañanas sin prisa"], ["A room with a view", "Una habitación con vista"], ["Room to breathe", "Espacio para respirar"], ["Tea beneath the trees", "Té bajo los árboles"], ["Wild neighbors", "Vecinos silvestres"], ["Cloud-forest wings", "Alas del bosque nublado"], ["The Nono valley", "El valle de Nono"], ["Rest in the quiet", "Descansar en la calma"], ["Space to share", "Espacio para compartir"],
  ["Open image:", "Abrir imagen:"], ["Previous image", "Imagen anterior"], ["Next image", "Imagen siguiente"],
  ["Close image", "Cerrar imagen"],
  ["Nature at the door", "Naturaleza en la puerta"], ["Gardens, mountain air and a landscape rich in birdlife surround the property.", "Jardines, aire de montaña y un paisaje rico en aves rodean la propiedad."], ["Close to Quito", "Cerca de Quito"], ["Nono is about an hour from Quito.", "Nono está a aproximadamente una hora de Quito."], ["Local hospitality", "Hospitalidad local"], ["The stay connects guests with Ecuadorian hospitality, food and nearby experiences.", "La estadía conecta a los huéspedes con la hospitalidad ecuatoriana, la gastronomía y las experiencias cercanas."], ["Responsible travel", "Viaje responsable"], ["The property is presented in the context of community development and responsible tourism.", "La propiedad forma parte de una visión de desarrollo comunitario y turismo responsable."],
  ["Flowering garden and stone path at Villa Doris", "Jardín florido y sendero de piedra en Villa Doris"], ["Villa Doris embraced by the green Nono valley", "Villa Doris abrazada por el verde valle de Nono"], ["The sunny terrace and main house at Villa Doris", "La terraza soleada y la casa principal de Villa Doris"], ["Flower garden and paths at Villa Doris", "Jardines de flores y senderos de Villa Doris"], ["Bright guest suite with garden views at Villa Doris", "Habitación luminosa con vista al jardín de Villa Doris"], ["Dining room framed by windows and greenery", "Comedor rodeado de ventanales y vegetación"], ["Stone cottage and red roof at Villa Doris", "Casa de piedra y techo rojo en Villa Doris"], ["Rustic living room with fireplace at Villa Doris", "Sala rústica con chimenea en Villa Doris"], ["Bathroom with a freestanding tub and valley light", "Baño con tina exenta y la luz del valle"], ["Guest room looking toward the Nono landscape", "Habitación con vista al paisaje de Nono"], ["Wide lawn and mature trees in the Villa Doris garden", "Amplio césped y árboles maduros en el jardín de Villa Doris"], ["Garden patio tucked among the trees", "Patio del jardín entre los árboles"], ["Blue bird among the branches near Villa Doris", "Ave azul entre las ramas cerca de Villa Doris"], ["Hummingbird feeding from a pink flower in Nono", "Colibrí alimentándose de una flor rosada en Nono"], ["Green valley and mountain landscape surrounding Villa Doris", "Valle verde y paisaje montañoso alrededor de Villa Doris"], ["Cozy bedroom with timber ceiling at Villa Doris", "Habitación acogedora con techo de madera en Villa Doris"], ["Spacious twin room with timber beams and garden windows", "Habitación doble amplia con vigas de madera y ventanas al jardín"],
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
  ["Choose a day tour, two days and one night, or four days and three nights. Explore Nono, Zuro Loma and the hummingbird route, with stays at Villa Doris on the overnight journeys.", "Elige una excursión de un día, dos días y una noche, o cuatro días y tres noches. Explora Nono, Zuro Loma y la Ruta del Colibrí, con alojamiento en Villa Doris en los viajes de varios días."],
  ["Choose a day among the clouds or stay longer to explore the hummingbird route.", "Elige un día entre las nubes o quédate más tiempo para explorar la Ruta del Colibrí."],
  ["Leave Quito for a compact journey that still makes space for the valley's slower rhythm.", "Deja Quito para vivir un viaje breve que aún deja espacio al ritmo pausado del valle."],
  ["Cycle, ride on horseback or walk part of the hummingbird route toward the Tandayapa Valley.", "Pedalea, monta a caballo o camina parte de la ruta de colibríes hacia el valle de Tandayapa."],
  ["Watch hummingbirds and visit a private bird sanctuary within the cloud-forest landscape.", "Observa colibríes y visita un santuario privado de aves en el paisaje del bosque nublado."],
  ["Meet residents, enjoy local gastronomy and stay overnight at Villa Doris Country House.", "Conoce a los habitantes, disfruta la gastronomía local y pasa la noche en Villa Doris Country House."],
  ["Villa Doris is surrounded by nature in the Choco Andino cloud forest, close to Quito and connected to the biodiversity, food and people of Nono.", "Villa Doris está rodeada de naturaleza en el bosque nublado del Chocó Andino, cerca de Quito y conectada con la biodiversidad, la gastronomía y la gente de Nono."],
  ["The brochure presents Villa Doris as a place to begin or end an Ecuador journey: an expression of Ecuadorian hospitality with access to local gastronomy, excursions and the cloud-forest setting.", "El folleto presenta Villa Doris como un lugar para comenzar o terminar un viaje por Ecuador: una expresión de la hospitalidad ecuatoriana con acceso a gastronomía local, excursiones y al entorno del bosque nublado."],
  ["Scroll to discover", "Desplázate para descubrir"], ["A balance between the highlights and the off-the-beaten-path gems of Ecuador.", "Un equilibrio entre los lugares destacados y las joyas poco conocidas de Ecuador."], ["in your trip", "en tu viaje"], ["Hero photograph:", "Fotografía principal:"]
);

spanishTranslations.push(
  ["Wildlife, island by island.", "Fauna, isla por isla."],
  ["Cruise volcanic shores and meet the archipelago's remarkable wildlife at your own pace.", "Recorre costas volcánicas y descubre la fauna de las islas a tu ritmo."],
  ["Beyond the peaks.", "Más allá de las cumbres."],
  ["Volcanoes, markets and living traditions across Ecuador's highlands.", "Volcanes, mercados y tradiciones vivas de los Andes ecuatorianos."],
  ["Where the forest leads.", "Donde te lleva la selva."],
  ["Travel by canoe and trail with local guides, wildlife and carefully chosen lodges.", "Recorre ríos y senderos con guías locales, fauna y lodges seleccionados."],
  ["A village in the clouds.", "Un pueblo entre las nubes."],
  ["Hummingbirds, village life and forest trails, about an hour from Quito.", "Colibríes, vida de pueblo y senderos a aproximadamente una hora de Quito."],
  ["Nature, culture and quieter places, connected at your pace.", "Naturaleza, cultura y rincones tranquilos, unidos a tu ritmo."],
  ["The itinerary begins with your interests, duration and preferred pace.", "El itinerario comienza con tus intereses, la duración y el ritmo que prefieres."],
  ["Signature places are balanced with quieter routes and local context.", "Combinamos lugares emblemáticos con rutas tranquilas y conocimiento local."],
  ["Conservation and community matter in the choices described by the brochure.", "La conservación y las comunidades forman parte de nuestras decisiones."],
  ["The trip form prepares an email draft in your own email application. This website does not store the form details in a database. Your information is sent only when you choose to send the email to Inca Holidays.", "El formulario prepara un borrador en tu propia aplicación de correo. Este sitio no guarda los datos en una base de datos; la información se envía solo cuando decides enviar el correo a Inca Holidays."],
  ["for questions about information you have shared with Inca Holidays.", "para consultas sobre la información que hayas compartido con Inca Holidays."],
  ["You can contact Inca Holidays directly without using the form. Do not include sensitive personal or payment information in an initial enquiry.", "Puedes contactar a Inca Holidays directamente sin usar el formulario. No incluyas información personal sensible ni datos de pago en una consulta inicial."],
  ["This notice describes the behavior of this website draft. It should be reviewed by the business before the final domain launch.", "Este aviso describe el funcionamiento del sitio y debe ser revisado por la empresa."],
  ["The website introduces the destinations and experiences documented in the Inca Holidays brochure. It does not display prices, live availability, confirmed bookings or automatic reservations.", "El sitio presenta los destinos y experiencias de Inca Holidays. No muestra precios, disponibilidad en tiempo real, reservas confirmadas ni reservas automáticas."],
  ["Submitting or emailing a trip request begins a conversation. A booking exists only after Inca Holidays provides and confirms the relevant commercial terms directly with you.", "Enviar una solicitud de viaje inicia una conversación. La reserva existe únicamente cuando Inca Holidays proporciona y confirma contigo las condiciones comerciales correspondientes."],
  ["Destination photography is illustrative of the documented regions. Villa Doris photography is drawn from verified property material supplied through the brochure and the existing Inca Holidays website.", "Las fotografías de destinos ilustran las regiones presentadas. Las imágenes de Villa Doris proceden de material verificado de la propiedad facilitado en el folleto y el sitio existente."],
  ["These draft terms should be reviewed by the business before the final domain launch.", "Estas condiciones deben ser revisadas por la empresa."],
  ["I agree to use these details to prepare and send an enquiry to Inca Holidays.", "Acepto usar estos datos para preparar y enviar una consulta a Inca Holidays."],
  ["Tell us about your interests, pace, mobility needs, celebrations or anything else that would help shape the route.", "Cuéntanos tus intereses, ritmo, necesidades de movilidad, celebraciones o cualquier otro detalle que ayude a diseñar tu viaje."],
  ["Last reviewed for this website draft: October 26, 2026.", "Última revisión de este borrador: 26 de octubre de 2026."],
  ["— Inca Holidays brochure", "— Folleto de Inca Holidays"],
  ["Primary navigation", "Navegación principal"], ["Mobile navigation", "Navegación móvil"], ["Continue to the story", "Continuar a la historia"], ["Destinations of interest", "Destinos de interés"], ["Direct inbox", "Correo alternativo"], ["Switch to English", "Cambiar a inglés"], ["Inca Holidays home", "Inicio de Inca Holidays"], ["Villa Doris photo gallery", "Galería de fotos de Villa Doris"],
  ["Use <a href=", "Usa <a href="], ["> or <a href=", "> o <a href="], ["Enquiries", "Consultas"], ["Imagery", "Imágenes"]
);

spanishTranslations.push(...[["A traveler and an Indigenous Ecuadorian woman sharing a warm moment", "Una viajera y una mujer indígena ecuatoriana comparten un momento"], ["Andean waterfall surrounded by cloud forest", "Cascada andina rodeada de bosque nublado"], ["Colorful woven textiles from Ecuador's highlands", "Tejidos coloridos de los Andes ecuatorianos"], ["Community member in the Ecuadorian Amazon", "Integrante de una comunidad de la Amazonía ecuatoriana"], ["Galápagos flamingo feeding in shallow water", "Flamenco de Galápagos alimentándose en aguas poco profundas"], ["Giant tortoises beneath island woodland", "Tortugas gigantes bajo los árboles de las islas"], ["Giant tortoise in the Galápagos highlands", "Tortuga gigante en la parte alta de Galápagos"], ["Historic church in Ecuador's Andean region", "Iglesia histórica en los Andes ecuatorianos"], ["Hummingbird in the Andean cloud forest", "Colibrí en el bosque nublado andino"], ["Marine iguana on the volcanic shore", "Iguana marina en la costa volcánica"], ["Painted village wall in Nono", "Mural en el pueblo de Nono"], ["Scarlet macaw in Ecuador's Amazon rainforest", "Guacamayo rojo en la Amazonía ecuatoriana"], ["Sea lion and pup on a Galápagos beach", "Lobo marino y su cría en una playa de Galápagos"], ["The green valley and village of Nono", "El valle verde y el pueblo de Nono"], ["Toucan perched in tropical forest", "Tucán posado en el bosque tropical"], ["Traditional architecture in Nono", "Arquitectura tradicional de Nono"], ["Traditional cooking in a rainforest community", "Cocina tradicional en una comunidad amazónica"], ["Traditional dance in an Andean community", "Danza tradicional en una comunidad andina"], ["Villa Doris country house in Nono, Ecuador", "Casa de campo Villa Doris en Nono, Ecuador"], ["Villa Doris within the green Andean landscape", "Villa Doris en el verde paisaje andino"]]);

function translateToSpanish(html) {
  let translated = html;
  for (const [from, to] of [...spanishTranslations].sort((a, b) => b[0].length - a[0].length)) translated = translated.split(from).join(to);
  translated = translated.replaceAll("Contactoo", "Contacto").replaceAll("Contactoa", "Contacta");
  translated = translated.replaceAll("Grand Océano Spray", "Grand Ocean Spray");
  translated = translated.replaceAll("Grand%20Océano%20Spray", "Grand%20Ocean%20Spray");
  translated = translated.replace('<html lang="en">', '<html lang="es">');
  return translated;
}

function lightbox() {
  return `<dialog class="lightbox" data-lightbox><button class="lightbox__close" type="button" aria-label="Close image" data-lightbox-close>${icon("close")}</button><button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image" data-lightbox-prev>${icon("arrow")}</button><figure><img alt="" data-lightbox-image><small class="lightbox__count" data-lightbox-count></small></figure><button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image" data-lightbox-next>${icon("arrow")}</button></dialog>`;
}

const spanishMeta = {
  home: { title: "Viajes a medida por Ecuador y Galápagos", description: "Viajes privados a medida por las islas Galápagos, los Andes ecuatorianos, la Amazonía y el bosque nublado de Nono." },
  destinations: { title: "Destinos en Ecuador y Galápagos", description: "Explora viajes a medida por Galápagos, los Andes, la Amazonía y el bosque nublado de Nono." },
  "destination-galapagos": { title: "Viajes a medida por Galápagos", description: "Islas volcánicas y fauna única, por mar o por tierra." },
  "destination-andes": { title: "Viajes a medida por los Andes", description: "Volcanes, mercados y tradiciones vivas en los Andes ecuatorianos." },
  "destination-amazon": { title: "Viajes a medida por la Amazonía", description: "Caminatas guiadas, paseos en canoa, observación de aves y experiencias culturales en la selva." },
  "destination-nono": { title: "Viajes a medida por Nono", description: "Excursiones de uno, dos y cuatro días al bosque nublado andino, con colibríes, vida local y naturaleza." },
  villa: { title: "Villa Doris en el bosque nublado de Nono", description: "Descubre Villa Doris, una casa de campo rodeada de naturaleza en el bosque nublado del Chocó Andino, cerca de Quito." },
  yacht: { title: "Yacht Anahi en Galápagos", description: "Explora Galápagos a bordo de Yacht Anahi, con días de fauna, desembarcos en las islas y noches tranquilas sobre el mar." },
  endemic: { title: "Endemic en Galápagos", description: "Vive Galápagos a bordo de Endemic, con suites elegantes, espacios abiertos y aventuras junto al mar." },
  naturalist: { title: "Expedición naturalista en Galápagos", description: "Explora Galápagos con desembarcos guiados, paisajes volcánicos y tiempo sobre el agua." },
  darwins: { title: "Darwin's Steps desde Santa Cruz", description: "Un tour terrestre por Galápagos con base en Santa Cruz, fauna, paisajes insulares y excursiones guiadas." },
  about: { title: "Sobre Inca Holidays", description: "Conoce Inca Holidays, una empresa de viajes de Quito que crea experiencias culturales, de aventura suave y viajes a medida." },
  plan: { title: "Planifica tu viaje a medida", description: "Cuéntale a Inca Holidays tus fechas, intereses y estilo de viaje para comenzar a diseñar tu itinerario." },
  privacy: { title: "Aviso de privacidad", description: "Cómo se gestiona la información de las consultas de viaje en el sitio web de Inca Holidays." },
  terms: { title: "Términos del sitio web", description: "Términos para utilizar el sitio web de Inca Holidays y enviar consultas de viaje." },
  404: { title: "Página no encontrada", description: "La página solicitada no se encuentra disponible." }
};

// The supplied English copy is preserved in full, including every day of each itinerary.
function completeCopy(pageKey, locale) {
  if (["destination-amazon", "destination-galapagos"].includes(pageKey)) return "";
  const sets = {
    home: [["Home y About us", "Our story", "Nuestra historia"]],
    about: [["Home y About us", "Our story and values", "Nuestra historia y valores"], ["Sustainability", "Sustainability", "Sostenibilidad"]],
    villa: [["Villa Doris Guest House", "Villa Doris: our story and the house", "Villa Doris: nuestra historia y la casa"]],
    "destination-nono": [["Villa Doris Experiences:", "Nono and the hummingbird route", "Nono y la ruta del colibrí"]],
    "destination-amazon": [["Amazon Rainforest", "Amazon lodges and complete itineraries", "Lodges de la Amazonía e itinerarios completos"]],
    "destination-galapagos": [["Galápagos Islands", "Galápagos islands and cruises", "Islas Galápagos y cruceros"]],
    "destination-andes": [["Ecuadorian Andes", "The Ecuadorian Andes", "Los Andes ecuatorianos"]],
    plan: [["Contact us / Plan Your Trip With Us", "Contact and opening hours", "Contacto y horarios"]]
  };
  const sections = sets[pageKey];
  if (!sections) return "";
  const es = locale === "es";
  const isDestination = pageKey.startsWith("destination-");
  let dayCardId = 0;
  const formatted = (text) => {
    const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
    const consumed = new Set();
    const dayHeading = /^(Day|Día)\s+[1-9]+\s*(?::|[-–])/i;
    const cruiseHeading = /^(?:Experience \(\d+ days \/ \d+ nights\)|Experiencia \(\d+ días \/ \d+ noches\))$/i;
    return lines.map((line, index) => {
    if (consumed.has(index)) return "";
    const safe = escapeHtml(line);
    if (dayHeading.test(line)) {
      const following = [];
      for (let cursor = index + 1; cursor < lines.length && !dayHeading.test(lines[cursor]) && !cruiseHeading.test(lines[cursor]) && !(lines[cursor].length < 100 && /^(Amazon|Aves|Aventura|Selva|Nono|Ecoruta|Un día|A day|Grand Ocean|Yacht|Huasquila|La Selva|Sani Lodge|[1-3]\. )/i.test(lines[cursor])); cursor++) { following.push(lines[cursor]); consumed.add(cursor); }
      const full = following.join(" ");
      const summary = full.match(/^.{1,180}?(?:[.!?](?:\s|$)|$)/)?.[0] || full.slice(0, 180);
      const detailId = `program-day-${pageKey}-${dayCardId++}`;
      return `<article class="program-day"><div class="program-day__summary"><div><strong>${safe}</strong><p>${escapeHtml(summary)}</p></div><details class="program-day__detail"><summary class="program-day__toggle" aria-label="${es ? "Abrir detalle del día" : "Open day details"}" aria-controls="${detailId}"><svg class="icon program-day__right" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg><svg class="icon program-day__down" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 10 4 4 4-4"/></svg><span class="sr-only">${es ? "Ver información completa" : "View full information"}</span></summary><div class="program-day__copy" id="${detailId}"><p>${escapeHtml(full)}</p></div></details></div></article>`;
    }
    if (cruiseHeading.test(line) || (line.length < 100 && /^(Nuestros valores|Nuestra historia|La casa principal|En los jardines|Información útil|Inversión local|Experiencias comunitarias|Bosque nativo|Menor consumo|Limpieza más amable|Recarga en lugar|Muebles con|Del productor|Cruceros por|Ejemplo de itinerario|Aventuras amazónicas|Huasquila Amazon|Programa amazónico|Aves y fotografía|Aventura amazónica|Selva profunda|Nono y la Ecoruta|Ecoruta del Colibrí|Un día entre|Our Values|Our story|The main house|In the gardens|Good to know|Opening Hours|Amazon Adventures & Lodges|Galápagos Cruises|Sample Itinerary|Grand Ocean Spray|Yacht Catamaran Anahi|Yate catamarán Anahi|1\. Huasquila Lodge|La Selva Eco-Lodge|Sani Lodge|Amazon program|Amazon Tour|Birding & Photography|Amazon Adventure Experience|Deep Jungle Experience|A day in the clouds|2\. Nono|3\. Eco-route|Investing where|Community experiences|Growing native forest|Respect|Low energy|Gentler cleaning|Refill|Furniture|From producers)/i.test(line))) return `<h3>${safe}</h3>`;
    return `<p>${safe}</p>`;
    }).join("");
  };
  const isVilla = pageKey === "villa";
  const sectionTitle = isVilla ? (es ? "La casa y sus espacios." : "The house and its spaces.") : isDestination ? (es ? "Programas y actividades" : "Programs & activities") : (es ? "Más para tu viaje." : "More for your journey.");
  const sectionEyebrow = isVilla ? (es ? "Villa Doris · La propiedad" : "Villa Doris · The property") : isDestination ? (es ? "Encuentra tu itinerario" : "Find your itinerary") : (es ? "Descubre todos los detalles" : "Discover all the details");
  const sectionLabel = isVilla ? (es ? "La casa de Villa Doris" : "Villa Doris property") : isDestination ? (es ? "Programas y actividades por destino" : "Destination programs and activities") : (es ? "Información completa" : "Full information");
  const sectionContent = sections.map(([key,en,sp])=>`<details class="full-copy__section"><summary>${es ? sp : en}<span aria-hidden="true">＋</span></summary><div class="full-copy__text" lang="${es ? "es" : "en"}">${formatted(es ? fullContentEs[key] : fullContent[key])}</div></details>`).join("");
  if (pageKey === "destination-andes") {
    return `<section class="full-copy section" aria-label="${es ? "Información de los Andes" : "Andean context"}"><div class="shell"><div class="full-copy__intro"><span class="eyebrow">${es ? "El contexto andino" : "Andean context"}</span><h2>${es ? "Conoce los Andes." : "Discover the Andes."}</h2></div>${sectionContent}</div></section>`;
  }
  const villaPhotos = pageKey === "villa" ? `<aside class="villa-program-photos" aria-label="${es ? "Personas y naturaleza en Nono" : "People and nature in Nono"}">
    <figure class="villa-program-photo villa-program-photo--host"><img src="/assets/images/villa-doris-local-woman.webp" alt="Woman in the countryside near Nono" loading="lazy" decoding="async"><figcaption>${es ? "Vida local" : "Local life"}</figcaption></figure>
    <figure class="villa-program-photo villa-program-photo--birding"><img src="/assets/images/villa-doris-birdwatcher.webp" alt="Traveler watching nature in the countryside" loading="lazy" decoding="async"><figcaption>${es ? "Observación de aves" : "Birdwatching"}</figcaption></figure>
    <figure class="villa-program-photo villa-program-photo--wildlife"><img src="/assets/images/villa-doris-squirrel.webp" alt="Squirrel on a branch" loading="lazy" decoding="async"><figcaption>${es ? "Fauna local" : "Local wildlife"}</figcaption></figure>
  </aside>` : "";
  const content = pageKey === "villa"
    ? `<div class="full-copy__villa-layout"><div class="full-copy__villa-content"><div class="full-copy__intro"><span class="eyebrow">${sectionEyebrow}</span><h2>${sectionTitle}</h2></div><div class="full-copy__villa-sections">${sectionContent}</div></div>${villaPhotos}</div>`
    : `<div class="full-copy__intro"><span class="eyebrow">${sectionEyebrow}</span><h2>${sectionTitle}</h2></div>${sectionContent}`;
  return `<section class="full-copy section" aria-label="${sectionLabel}"><div class="shell">${content}</div></section>`;
}

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
    telephone: site.whatsappDisplay,
    address: { "@type": "PostalAddress", addressLocality: "Quito", addressCountry: "EC" },
    areaServed: ["Ecuador", "Galapagos Islands"],
    description: locale === "es" ? spanishMeta.about.description : pages.about.description
  };
  const copy = completeCopy(pageKey, locale);
  main = main.includes("<!--full-copy-->")
    ? main.replace("<!--full-copy-->", copy)
    : main.includes('<section class="final-cta">')
      ? main.replace('<section class="final-cta">', `${copy}<section class="final-cta">`)
      : main.replace("</main>", `${copy}</main>`);
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
  <link rel="icon" href="/assets/images/favicon-64.png" type="image/png">
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
  const englishRendered = pageKey === "home" ? rendered.replaceAll("A medida · Ecuador y Galápagos", "Tailor-made · Ecuador and Galápagos").replaceAll("Costa y bosque nublado", "Coast and cloud forest").replaceAll("Costa · Chocó Andino", "Coast · Chocó Andino") : rendered;
  const localized = locale === "es" ? translateToSpanish(rendered).replace("__LANGUAGE_PATH__", localizedPath(path, "en")) : englishRendered;
  if (locale !== "en") return localized;
  return localized.replaceAll('href="/', 'href="/en/').replaceAll('content="/', 'content="/en/').replaceAll('href="/en/assets/', 'href="/assets/').replaceAll('href="/en/en/', 'href="/en/').replace('__LANGUAGE_PATH__', localizedPath(path, "es"));
}

const outputPages = [
  { key: "home", ...pages.home, main: homePage() },
  { key: "destinations", ...pages.destinations, main: destinationsPage("en"), mainEs: destinationsPage("es"), image: "/assets/images/hero-galapagos-1200.webp" },
  ...destinations.map(d => ({ key: `destination-${d.slug}`, path: `/destinations/${d.slug}/`, title: `${d.name} tailor-made journeys`, description: d.short, main: destinationPage(d), mainEs: destinationPage(d, "es"), image: `/assets/images/${d.hero.includes(".") ? d.hero : `${d.hero}-1200.webp`}` })),
  { key: "villa", ...pages.villa, main: villaPage(), mainEs: villaPage("es"), image: "/assets/images/hero-villa-1200.webp" },
  ...(pages.yacht ? [{ key: "yacht", ...pages.yacht, main: yachtAnahiPage(), mainEs: yachtAnahiPage("es"), image: "/assets/images/yacht-anahi-exterior.jpg" }] : []),
  ...(pages.endemic ? [{ key: "endemic", ...pages.endemic, main: endemicYachtPage(), mainEs: endemicYachtPage("es"), image: "/assets/images/endemic-exterior.jpg" }] : []),
  ...(pages.naturalist ? [{ key: "naturalist", ...pages.naturalist, main: naturalistExpeditionPage(), mainEs: naturalistExpeditionPage("es"), image: "/assets/images/naturalist-bahia-landscape.jpg" }] : []),
  ...(pages.darwins ? [{ key: "darwins", ...pages.darwins, main: darwinsStepsPage(), mainEs: darwinsStepsPage("es"), image: "/assets/images/darwins-steps-walk.jpg" }] : []),
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

const assetAnchors = ["yacht-anahi-exterior.jpg", "endemic-exterior.jpg", "naturalist-bahia-landscape.jpg", "darwins-steps-walk.jpg"].map(file => join(dist, "assets", "images", file));
let hasBuiltAssets = true;
for (const assetAnchor of assetAnchors) {
  try { await access(assetAnchor); } catch { hasBuiltAssets = false; }
}
if (!hasBuiltAssets) {
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, "assets"), { recursive: true });
  await copyTree(join(src, "assets"), join(dist, "assets"));
  await copyTree(join(root, "assets", "images"), join(dist, "assets", "images"));
}
await mkdir(join(dist, "assets"), { recursive: true });
await copyFile(join(src, "styles.css"), join(dist, "assets", "styles.css"));
await copyFile(join(src, "app.js"), join(dist, "assets", "app.js"));
await copyTree(join(root, ".openai"), join(dist, ".openai"));
await mkdir(join(dist, "en"), { recursive: true });

for (const page of outputPages) {
  await writeRoute(page.path, baseHtml({ pageKey: page.key, title: page.title, description: page.description, path: page.path, main: page.mainEs || page.main, image: page.image, locale: "es" }));
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
