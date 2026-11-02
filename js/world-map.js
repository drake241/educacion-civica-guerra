/** Mapa tipo juego de conquista: territorios planos, bases con números, tropas en movimiento */
const CivicaWorldMap = (() => {
  const STROKE = "#1a1d21";
  const STROKE_W = 5;

  function baseNode(cx, cy, value, fillDark, size = 26) {
    const n = value < 0 ? "!" : String(value);
    return `
    <g class="world-base" transform="translate(${cx}, ${cy})">
      <circle r="${size + 4}" fill="rgba(0,0,0,0.12)"/>
      <circle r="${size}" fill="${fillDark}" stroke="${STROKE}" stroke-width="4"/>
      <text y="8" text-anchor="middle" fill="#fff" font-size="${size * 0.85}" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
    </g>`;
  }

  function troopDots(pathD, color, count, active) {
    if (!active) return "";
    return Array.from({ length: count }, (_, i) => {
      const dur = 2.2 + i * 0.4;
      const begin = i * 0.35;
      return `
      <circle r="7" fill="${color}" stroke="${STROKE}" stroke-width="2">
        <animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${pathD}"/>
      </circle>`;
    }).join("");
  }

  function render(container, opts) {
    const {
      paises,
      valmiraMeters: vm,
      cerroMeters: cm,
      scoreFn,
      phase = "lobby",
    } = opts;
    if (!container) return;

    const vScore = scoreFn(vm);
    const cScore = scoreFn(cm);
    const vSum = Math.max(1, vScore < 0 ? 0 : vScore);
    const cSum = Math.max(1, cScore < 0 ? 0 : cScore);
    const total = vSum + cSum;
    const vPct = Math.round((vSum / total) * 100);
    const cPct = 100 - vPct;
    const warActive = phase === "playing";

    const pathVtoBorder = "M 320 240 Q 400 220 455 260";
    const pathCtoBorder = "M 640 260 Q 560 240 505 260";

    container.innerHTML = `
<div class="world-scene world-scene-game" role="img" aria-label="Mapa de ${paises.valmira.nombreCorto} y ${paises.cerroAzul.nombreCorto}">
  <div class="world-power-bar" aria-hidden="true">
    <div class="world-power-seg world-power-valmira" style="width:${vPct}%"><span>${paises.valmira.nombreCorto} · ${vScore < 0 ? 0 : vScore}</span></div>
    <div class="world-power-seg world-power-cerro" style="width:${cPct}%"><span>${paises.cerroAzul.nombreCorto} · ${cScore < 0 ? 0 : cScore}</span></div>
  </div>
  <svg class="world-svg world-svg-game" viewBox="0 0 960 440" xmlns="http://www.w3.org/2000/svg">
    <rect width="960" height="440" fill="#c9b896"/>

    <!-- Valmira: 2 zonas verdes -->
    <path fill="#40916c" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"
      d="M 40 50 L 280 35 L 320 175 L 140 210 L 50 160 Z"/>
    <path fill="#2d6a4f" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"
      d="M 50 160 L 140 210 L 320 175 L 350 380 L 80 400 L 40 280 Z"/>

    <!-- Frontera neutral -->
    <path fill="#868e96" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"
      d="M 320 175 L 420 155 L 450 285 L 350 380 L 320 175 Z"/>

    <!-- Cerro Azul: 2 zonas azules -->
    <path fill="#4895ef" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"
      d="M 420 155 L 680 120 L 720 260 L 450 285 Z"/>
    <path fill="#1d3557" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linejoin="round"
      d="M 450 285 L 720 260 L 760 400 L 480 410 L 350 380 Z"/>

    <!-- Costa / mar decorativo -->
    <path fill="none" stroke="#8b7355" stroke-width="3" opacity="0.5"
      d="M 40 50 L 280 35 L 680 120"/>

    <!-- Rutas de tropas (curvas) -->
    <path id="routeV" d="${pathVtoBorder}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="3" stroke-dasharray="8 6"/>
    <path id="routeC" d="${pathCtoBorder}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="3" stroke-dasharray="8 6"/>
    ${troopDots(pathVtoBorder, "#1b4332", 3, warActive)}
    ${troopDots(pathCtoBorder, "#1d3557", 3, warActive)}

    <!-- Bases Valmira -->
    ${baseNode(165, 115, vm.alimentos, "#1b4332", 22)}
    ${baseNode(200, 290, vm.apoyo, "#1b4332", 22)}
    ${baseNode(320, 240, vScore, "#0f5132", 30)}

    <!-- Base frontera -->
    ${baseNode(480, 265, Math.round((vm.estabilidad + cm.estabilidad) / 2), "#495057", 24)}

    <!-- Bases Cerro Azul -->
    ${baseNode(580, 195, cm.comercio, "#023e8a", 22)}
    ${baseNode(620, 340, cm.estabilidad, "#023e8a", 22)}
    ${baseNode(640, 260, cScore, "#03045e", 30)}

    <!-- Etiquetas país -->
    <text x="175" y="420" text-anchor="middle" fill="${STROKE}" font-size="14" font-weight="800">${paises.valmira.nombreCorto}</text>
    <text x="785" y="420" text-anchor="middle" fill="${STROKE}" font-size="14" font-weight="800">${paises.cerroAzul.nombreCorto}</text>
    <text x="480" y="155" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" stroke="${STROKE}" stroke-width="3" paint-order="stroke">FRONTERA</text>
  </svg>
</div>`;
  }

  return { render };
})();
