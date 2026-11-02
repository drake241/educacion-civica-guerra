/** Vista aérea / espacio — dos países estilo mapa simple (WorldBox-like) */
const CivicaWorldMap = (() => {
  function healthFill(meters) {
    const avg =
      ((meters?.alimentos ?? 50) +
        (meters?.comercio ?? 50) +
        (meters?.estabilidad ?? 50) +
        (meters?.apoyo ?? 50)) /
      4;
    return Math.max(0.35, Math.min(1, avg / 100));
  }

  function render(container, { paises, valmiraMeters, cerroMeters, statusIcons, scoreFn, meterLabel }) {
    if (!container) return;
    const vm = valmiraMeters;
    const cm = cerroMeters;
    const vScore = scoreFn(vm);
    const cScore = scoreFn(cm);
    const vIcons = statusIcons(vm);
    const cIcons = statusIcons(cm);
    const vHealth = healthFill(vm);
    const cHealth = healthFill(cm);

    const iconEmoji = { hambre: "🍞", aranceles: "📦", protestas: "📢", caos: "⚡" };

    container.innerHTML = `
<div class="world-scene" role="img" aria-label="Mapa de Valmira y Cerro Azul desde el cielo">
  <div class="world-stars"></div>
  <div class="world-cloud world-cloud-a"></div>
  <div class="world-cloud world-cloud-b"></div>
  <svg class="world-svg" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0c1445"/>
        <stop offset="35%" stop-color="#1e5f8a"/>
        <stop offset="100%" stop-color="#2a9d8f"/>
      </linearGradient>
      <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="960" height="420" fill="url(#oceanGrad)"/>
    <ellipse cx="480" cy="380" rx="520" ry="90" fill="#1a7a62" opacity="0.25"/>
    <!-- Valmira (oeste) -->
    <g filter="url(#landShadow)" opacity="${vHealth.toFixed(2)}">
      <path fill="#40916c" stroke="#1b4332" stroke-width="3"
        d="M40 280 C80 180, 160 140, 260 160 C340 175, 400 220, 420 290 C380 340, 280 360, 160 340 C80 320, 40 310, 40 280 Z"/>
      <path fill="#52b788" opacity="0.6"
        d="M100 250 C140 210, 220 200, 300 220 C280 260, 200 280, 130 270 Z"/>
      <path fill="#74c69d" opacity="0.5"
        d="M180 200 C220 185, 260 195, 280 230 C240 245, 200 240, 180 200 Z"/>
    </g>
    <!-- Cerro Azul (este) -->
    <g filter="url(#landShadow)" opacity="${cHealth.toFixed(2)}">
      <path fill="#457b9d" stroke="#1d3557" stroke-width="3"
        d="M540 270 C580 160, 680 130, 780 150 C860 170, 920 230, 900 310 C840 350, 720 360, 600 330 C540 310, 520 290, 540 270 Z"/>
      <path fill="#6d597a" opacity="0.35"
        d="M620 200 L700 170 L760 210 L720 250 L640 240 Z"/>
      <path fill="#a8dadc" opacity="0.45"
        d="M700 240 C760 220, 820 240, 840 280 C780 300, 720 290, 700 240 Z"/>
    </g>
    <!-- Frontera / tensión -->
    <line x1="480" y1="120" x2="480" y2="360" stroke="#e63946" stroke-width="2" stroke-dasharray="8 6" opacity="0.7"/>
    <text x="480" y="108" text-anchor="middle" fill="#ffd166" font-size="14" font-weight="700">FRONTERA</text>
    <!-- Etiquetas -->
    <text x="230" y="130" text-anchor="middle" fill="#fff" font-size="22" font-weight="800">${paises.valmira.nombreCorto}</text>
    <text x="730" y="130" text-anchor="middle" fill="#fff" font-size="22" font-weight="800">${paises.cerroAzul.nombreCorto}</text>
    <text x="230" y="155" text-anchor="middle" fill="#d8f3dc" font-size="12">Parlamento</text>
    <text x="730" y="155" text-anchor="middle" fill="#caf0f8" font-size="12">Presidencia</text>
    ${vIcons
      .map(
        (ic, i) =>
          `<text x="${120 + i * 36}" y="200" font-size="22">${iconEmoji[ic.id] || "⚠️"}</text>`
      )
      .join("")}
    ${cIcons
      .map(
        (ic, i) =>
          `<text x="${620 + i * 36}" y="200" font-size="22">${iconEmoji[ic.id] || "⚠️"}</text>`
      )
      .join("")}
  </svg>
  <div class="world-hud world-hud-valmira country-valmira">
    <strong>${paises.valmira.nombreCorto}</strong>
    <span class="world-score">${vScore < 0 ? "Colapso" : `Fuerza ${vScore}`}</span>
    ${["alimentos", "comercio", "estabilidad", "apoyo"]
      .map(
        (k) =>
          `<div class="world-mini-meter"><span>${meterLabel(k)}</span><span>${vm[k]}</span></div>`
      )
      .join("")}
  </div>
  <div class="world-hud world-hud-cerro country-cerro">
    <strong>${paises.cerroAzul.nombreCorto}</strong>
    <span class="world-score">${cScore < 0 ? "Colapso" : `Fuerza ${cScore}`}</span>
    ${["alimentos", "comercio", "estabilidad", "apoyo"]
      .map(
        (k) =>
          `<div class="world-mini-meter"><span>${meterLabel(k)}</span><span>${cm[k]}</span></div>`
      )
      .join("")}
  </div>
</div>`;
  }

  return { render };
})();
