/** Vista aérea — dos países con forma de nación (costas, frontera, ciudades) */
const CivicaWorldMap = (() => {
  function healthFill(meters) {
    const avg =
      ((meters?.alimentos ?? 50) +
        (meters?.comercio ?? 50) +
        (meters?.estabilidad ?? 50) +
        (meters?.apoyo ?? 50)) /
      4;
    return Math.max(0.4, Math.min(1, avg / 100));
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

    const crisisMarks = (icons, cx, cy) =>
      icons
        .map(
          (ic, i) =>
            `<g transform="translate(${cx + i * 28}, ${cy})"><circle r="14" fill="rgba(0,0,0,0.45)"/><text x="0" y="5" text-anchor="middle" font-size="16">${iconEmoji[ic.id] || "⚠️"}</text></g>`
        )
        .join("");

    container.innerHTML = `
<div class="world-scene" role="img" aria-label="Mapa de Valmira y Cerro Azul">
  <div class="world-stars"></div>
  <div class="world-cloud world-cloud-a"></div>
  <div class="world-cloud world-cloud-b"></div>
  <svg class="world-svg" viewBox="0 0 960 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skySea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1026"/>
        <stop offset="28%" stop-color="#134e6f"/>
        <stop offset="100%" stop-color="#1a759f"/>
      </linearGradient>
      <linearGradient id="shallow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#48cae4" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#0096c7" stop-opacity="0.15"/>
      </linearGradient>
      <pattern id="fields" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#52b788"/>
        <rect width="6" height="6" fill="#40916c"/>
        <rect x="6" y="6" width="6" height="6" fill="#40916c"/>
      </pattern>
      <pattern id="pines" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#2d6a4f"/>
        <circle cx="3" cy="4" r="2" fill="#1b4332"/>
        <circle cx="8" cy="7" r="2" fill="#1b4332"/>
      </pattern>
      <pattern id="rock" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#6c757d"/>
        <rect x="0" y="0" width="4" height="4" fill="#495057"/>
        <rect x="4" y="4" width="4" height="4" fill="#adb5bd"/>
      </pattern>
      <filter id="coastShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#023047" flood-opacity="0.5"/>
      </filter>
    </defs>

    <rect width="960" height="480" fill="url(#skySea)"/>

    <!-- Archipiélago / mar abierto -->
    <ellipse cx="480" cy="430" rx="440" ry="55" fill="url(#shallow)"/>
    <ellipse cx="120" cy="400" rx="90" ry="25" fill="#0077b6" opacity="0.25"/>
    <ellipse cx="860" cy="410" rx="70" ry="22" fill="#0077b6" opacity="0.25"/>

    <!-- ═══ VALMIRA (nación oeste: costa, llanuras, capital) ═══ -->
    <g filter="url(#coastShadow)" opacity="${vHealth.toFixed(2)}">
      <path id="valmira-land" fill="#40916c" stroke="#1b4332" stroke-width="2.5"
        d="M 24 380
           C 18 320, 22 250, 55 205
           C 95 155, 165 135, 240 145
           C 310 155, 385 175, 430 210
           C 448 235, 452 265, 448 295
           C 445 325, 430 355, 395 375
           C 340 395, 260 400, 180 395
           C 95 388, 35 385, 24 380 Z"/>
      <!-- Bahía oeste -->
      <path fill="#1a759f" opacity="0.85"
        d="M 24 380 C 30 340, 45 310, 70 295 C 85 320, 75 360, 55 385 Z"/>
      <!-- Llanuras agrícolas -->
      <path fill="url(#fields)" opacity="0.85"
        d="M 100 220 C 160 200, 250 210, 320 240 C 300 290, 200 300, 130 280 Z"/>
      <!-- Bosque norte -->
      <path fill="url(#pines)" opacity="0.9"
        d="M 70 200 C 110 170, 180 165, 220 190 C 190 230, 120 240, 70 220 Z"/>
      <!-- Río + lago -->
      <path fill="none" stroke="#4cc9f0" stroke-width="4" stroke-linecap="round"
        d="M 130 195 Q 155 240, 175 275 Q 195 310, 230 330"/>
      <ellipse cx="175" cy="278" rx="22" ry="14" fill="#48cae4" opacity="0.9"/>
      <!-- Carretera a la frontera -->
      <path fill="none" stroke="#d4a373" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.8"
        d="M 200 250 L 380 265 L 430 285"/>
      <!-- Costa resaltada -->
      <path fill="none" stroke="#95d5b2" stroke-width="3" opacity="0.6"
        d="M 24 380 C 18 320, 22 250, 55 205 C 95 155, 165 135, 240 145"/>
    </g>

    <!-- ═══ CERRO AZUL (nación este: cordillera, puerto) ═══ -->
    <g filter="url(#coastShadow)" opacity="${cHealth.toFixed(2)}">
      <path id="cerro-land" fill="#457b9d" stroke="#1d3557" stroke-width="2.5"
        d="M 448 295
           C 452 265, 458 230, 485 195
           C 520 155, 590 130, 680 135
           C 770 140, 850 165, 910 210
           C 945 250, 950 310, 930 360
           C 900 400, 820 415, 720 410
           C 620 405, 540 385, 495 355
           C 465 335, 448 315, 448 295 Z"/>
      <!-- Bahía portuaria este -->
      <path fill="#1a759f" opacity="0.85"
        d="M 930 360 C 920 320, 900 295, 875 290 C 890 330, 910 370, 935 385 Z"/>
      <!-- Cordillera del Sur (Cerro Azul) -->
      <path fill="url(#rock)" opacity="0.95"
        d="M 560 250 L 610 175 L 660 155 L 710 175 L 760 210 L 720 260 L 650 275 L 590 265 Z"/>
      <path fill="#343a40" opacity="0.7"
        d="M 600 220 L 640 190 L 680 200 L 660 235 Z"/>
      <path fill="none" stroke="#dee2e6" stroke-width="2"
        d="M 610 175 L 660 155 L 710 175"/>
      <!-- Costa sur rocosa -->
      <path fill="url(#pines)" opacity="0.5"
        d="M 520 340 C 580 360, 680 370, 780 365 C 740 390, 640 400, 540 385 Z"/>
      <path fill="none" stroke="#a8dadc" stroke-width="3" opacity="0.55"
        d="M 485 195 C 520 155, 590 130, 680 135 C 770 140, 850 165, 910 210"/>
    </g>

    <!-- Frontera terrestre (no línea recta en el mar) -->
    <path fill="none" stroke="#e63946" stroke-width="2.5" stroke-dasharray="7 5"
      d="M 448 210 C 446 240, 450 270, 448 295 C 445 325, 448 345"/>
    <circle cx="448" cy="278" r="6" fill="#e63946" stroke="#fff" stroke-width="1.5"/>
    <text x="448" y="198" text-anchor="middle" fill="#ffd166" font-size="11" font-weight="700">FRONTERA</text>

    <!-- Ciudades -->
    <g class="world-city">
      <circle cx="215" cy="248" r="7" fill="#fff" stroke="#1b4332" stroke-width="2"/>
      <text x="215" y="232" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">San Verde</text>
      <text x="215" y="268" text-anchor="middle" fill="#d8f3dc" font-size="9">capital</text>
    </g>
    <g class="world-city">
      <circle cx="780" cy="318" r="7" fill="#fff" stroke="#1d3557" stroke-width="2"/>
      <text x="780" y="302" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">Puerto Azul</text>
      <text x="780" y="338" text-anchor="middle" fill="#caf0f8" font-size="9">capital</text>
    </g>

    <!-- Banderas / nombres de país sobre el territorio -->
    <rect x="118" y="118" width="132" height="44" rx="6" fill="rgba(27,67,50,0.82)"/>
    <text x="184" y="138" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${paises.valmira.nombreCorto}</text>
    <text x="184" y="154" text-anchor="middle" fill="#b7e4c7" font-size="10">Parlamento · llanuras</text>

    <rect x="668" y="108" width="148" height="44" rx="6" fill="rgba(29,53,87,0.85)"/>
    <text x="742" y="128" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${paises.cerroAzul.nombreCorto}</text>
    <text x="742" y="144" text-anchor="middle" fill="#caf0f8" font-size="10">Presidencia · cordillera</text>

    ${crisisMarks(vIcons, 188, 248)}
    ${crisisMarks(cIcons, 752, 318)}

    <!-- Leyenda -->
    <text x="480" y="468" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="10">Cordillera del Sur · vista aérea</text>
  </svg>

  <div class="world-hud world-hud-valmira country-valmira">
    <strong>${paises.valmira.nombreCorto}</strong>
    <span class="world-score">${vScore < 0 ? "Colapso" : `Fuerza ${vScore}`}</span>
    ${["alimentos", "comercio", "estabilidad", "apoyo"]
      .map((k) => `<div class="world-mini-meter"><span>${meterLabel(k)}</span><span>${vm[k]}</span></div>`)
      .join("")}
  </div>
  <div class="world-hud world-hud-cerro country-cerro">
    <strong>${paises.cerroAzul.nombreCorto}</strong>
    <span class="world-score">${cScore < 0 ? "Colapso" : `Fuerza ${cScore}`}</span>
    ${["alimentos", "comercio", "estabilidad", "apoyo"]
      .map((k) => `<div class="world-mini-meter"><span>${meterLabel(k)}</span><span>${cm[k]}</span></div>`)
      .join("")}
  </div>
</div>`;
  }

  return { render };
})();
