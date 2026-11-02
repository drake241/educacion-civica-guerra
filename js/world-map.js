/** Mapa suave: dos países reconocibles, sin números; movimiento solo tras decisiones */
const CivicaWorldMap = (() => {
  function countryOpacity(meters, scoreFn) {
    const s = scoreFn(meters);
    if (s < 0) return 0.45;
    return 0.72 + (s / 100) * 0.28;
  }

  function troopDots(pathD, color, active) {
    if (!active) return "";
    return [0, 0.8, 1.6]
      .map(
        (begin) => `
      <circle r="4" fill="${color}" opacity="0.85">
        <animateMotion dur="2.8s" begin="${begin}s" repeatCount="indefinite" path="${pathD}"/>
      </circle>`
      )
      .join("");
  }

  function crisisMarks(icons, x, y) {
    const em = { hambre: "🍞", aranceles: "📦", protestas: "📢", caos: "⚡" };
    return icons
      .slice(0, 3)
      .map(
        (ic, i) =>
          `<text x="${x + i * 22}" y="${y}" font-size="16" opacity="0.9">${em[ic.id] || "•"}</text>`
      )
      .join("");
  }

  function render(container, opts) {
    const {
      paises,
      valmiraMeters: vm,
      cerroMeters: cm,
      scoreFn,
      statusIcons,
      subphase = "lobby",
    } = opts;
    if (!container) return;

    const vScore = scoreFn(vm);
    const cScore = scoreFn(cm);
    const vSum = Math.max(1, vScore < 0 ? 1 : vScore);
    const cSum = Math.max(1, cScore < 0 ? 1 : cScore);
    const vPct = Math.round((vSum / (vSum + cSum)) * 100);
    const vIcons = statusIcons?.(vm) ?? [];
    const cIcons = statusIcons?.(cm) ?? [];

    const afterAction = subphase === "reveal" || subphase === "consequence";
    const pathV = "M 255 248 Q 340 232 418 258";
    const pathC = "M 705 258 Q 620 238 542 258";

    container.innerHTML = `
<div class="world-scene world-scene-soft" role="img" aria-label="Mapa de ${paises.valmira.nombreCorto} y ${paises.cerroAzul.nombreCorto}">
  <div class="world-balance" aria-hidden="true">
    <div class="world-balance-valmira" style="flex: ${vPct}"><span>${paises.valmira.nombreCorto}</span></div>
    <div class="world-balance-cerro" style="flex: ${100 - vPct}"><span>${paises.cerroAzul.nombreCorto}</span></div>
  </div>
  <svg class="world-svg world-svg-soft" viewBox="0 0 960 460" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="seaSoft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8d4e8"/>
        <stop offset="100%" stop-color="#d4e8f2"/>
      </linearGradient>
      <linearGradient id="valmiraFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9dccab"/>
        <stop offset="100%" stop-color="#7fb893"/>
      </linearGradient>
      <linearGradient id="cerroFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9ec5e8"/>
        <stop offset="100%" stop-color="#7ba3c0"/>
      </linearGradient>
    </defs>
    <rect width="960" height="460" fill="url(#seaSoft)"/>

    <!-- Valmira: península oeste -->
    <g opacity="${countryOpacity(vm, scoreFn).toFixed(2)}">
      <path fill="url(#valmiraFill)" stroke="#6b9080" stroke-width="1.5" stroke-linejoin="round"
        d="M 28 320
           C 20 260, 35 190, 75 140
           C 120 95, 200 85, 280 100
           C 350 115, 400 155, 418 210
           C 430 250, 425 290, 400 340
           C 360 395, 280 420, 190 410
           C 100 400, 45 370, 28 320 Z"/>
      <path fill="#b7ddb9" opacity="0.45" stroke="none"
        d="M 90 200 C 150 175, 240 180, 300 210 C 260 260, 170 280, 110 250 Z"/>
      <path fill="none" stroke="#8ab89a" stroke-width="1" opacity="0.6"
        d="M 130 195 Q 175 240, 210 290"/>
      <ellipse cx="175" cy="268" rx="18" ry="11" fill="#a8dadc" opacity="0.55"/>
    </g>

    <!-- Cerro Azul: costa este -->
    <g opacity="${countryOpacity(cm, scoreFn).toFixed(2)}">
      <path fill="url(#cerroFill)" stroke="#6b8a9e" stroke-width="1.5" stroke-linejoin="round"
        d="M 542 258
           C 560 200, 610 150, 680 125
           C 760 100, 850 115, 910 165
           C 945 210, 950 280, 930 340
           C 900 400, 820 430, 720 425
           C 620 420, 540 390, 500 340
           C 475 300, 480 270, 542 258 Z"/>
      <path fill="#c5d8e8" opacity="0.4" stroke="none"
        d="M 650 200 L 720 175 L 780 210 L 740 260 L 670 275 Z"/>
      <path fill="#94a3b8" opacity="0.35"
        d="M 620 210 L 660 175 L 700 195 L 680 235 Z"/>
    </g>

    <!-- Frontera (solo línea suave) -->
    <path fill="none" stroke="#c4a882" stroke-width="2" stroke-dasharray="6 8" opacity="0.85"
      d="M 418 210 C 440 240, 455 280, 470 320 C 490 280, 520 250, 542 258"/>
    <text x="478" y="198" text-anchor="middle" fill="#8b7355" font-size="11" font-weight="600" opacity="0.9">Frontera</text>

    <!-- Capitales (sin números) -->
    <g font-family="system-ui,sans-serif">
      <circle cx="220" cy="255" r="5" fill="#fff" stroke="#6b9080" stroke-width="1.5"/>
      <text x="220" y="238" text-anchor="middle" fill="#4a6741" font-size="11" font-weight="600">San Verde</text>
      <circle cx="740" cy="285" r="5" fill="#fff" stroke="#6b8a9e" stroke-width="1.5"/>
      <text x="740" y="268" text-anchor="middle" fill="#3d5a6c" font-size="11" font-weight="600">Puerto Azul</text>
    </g>

    ${crisisMarks(vIcons, 120, 130)}
    ${crisisMarks(cIcons, 800, 130)}

    <!-- Rutas: solo visibles tras una acción -->
    ${
      afterAction
        ? `
    <path d="${pathV}" fill="none" stroke="#7a9a7a" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.5"/>
    <path d="${pathC}" fill="none" stroke="#7a9ab0" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.5"/>
    ${troopDots(pathV, "#5a7a5a", true)}
    ${troopDots(pathC, "#5a7a9a", true)}
    `
        : ""
    }

    <text x="200" y="445" text-anchor="middle" fill="#5c6b5c" font-size="13" font-weight="600">${paises.valmira.nombreCorto}</text>
    <text x="760" y="445" text-anchor="middle" fill="#5c6b78" font-size="13" font-weight="600">${paises.cerroAzul.nombreCorto}</text>
    <text x="480" y="448" text-anchor="middle" fill="#94a3b8" font-size="10">Cordillera del Sur</text>
  </svg>
  ${
    afterAction
      ? `<p class="world-action-hint">Movimiento en la frontera tras la última decisión.</p>`
      : `<p class="world-action-hint world-action-hint-idle">Esperando la próxima acción de los países…</p>`
  }
</div>`;
  }

  return { render };
})();
