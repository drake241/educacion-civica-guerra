/** Mapa isométrico por chunks — un solo territorio unido, dos países + frontera */
const CivicaWorldMap = (() => {
  const TW = 86;
  const TH = 43;
  const DEPTH = 15;
  const OX = 478;
  const OY = 62;

  const PAL = {
    valmira: { top: "#8fcf9a", right: "#6fb883", left: "#5a9f6e", flag: "#2d6a4f" },
    cerroAzul: { top: "#8ecae6", right: "#6eb5d4", left: "#5a9fbf", flag: "#1d3557" },
    neutral: { top: "#d1d9e0", right: "#b8c2cc", left: "#9aa6b2", flag: "#94a3b8" },
  };

  /** Chunks conectados (misma masa de tierra) */
  const CHUNKS = [
    { id: "v2", c: 1, r: 0, f: "valmira" },
    { id: "v1", c: 0, r: 1, f: "valmira", capital: true },
    { id: "v3", c: 1, r: 1, f: "valmira" },
    { id: "v4", c: 0, r: 2, f: "valmira" },
    { id: "n2", c: 2, r: 0, f: "neutral", border: true },
    { id: "n1", c: 2, r: 1, f: "neutral", border: true },
    { id: "n3", c: 1, r: 2, f: "neutral", border: true },
    { id: "c5", c: 3, r: 0, f: "cerroAzul" },
    { id: "c1", c: 3, r: 1, f: "cerroAzul" },
    { id: "c2", c: 4, r: 1, f: "cerroAzul", capital: true },
    { id: "c3", c: 2, r: 2, f: "cerroAzul" },
    { id: "c4", c: 3, r: 2, f: "cerroAzul" },
  ];

  function isoCenter(c, r) {
    return {
      x: OX + (c - r) * (TW / 2),
      y: OY + (c + r) * (TH / 2),
    };
  }

  function factionOpacity(f, vm, cm, scoreFn) {
    const m = f === "valmira" ? vm : f === "cerroAzul" ? cm : null;
    if (!m) return 1;
    const s = scoreFn(m);
    if (s < 0) return 0.5;
    return 0.82 + (s / 100) * 0.18;
  }

  function drawChunk(cx, cy, f, opts = {}) {
    const p = PAL[f] || PAL.neutral;
    const w = TW / 2;
    const h = TH / 2;
    const d = DEPTH;
    const top = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
    const left = `${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx - w},${cy + d}`;
    const right = `${cx},${cy + h} ${cx + w},${cy} ${cx + w},${cy + d} ${cx},${cy + h + d}`;

    const tower = `
      <g transform="translate(${cx}, ${cy - 6})">
        <rect x="-5" y="-14" width="10" height="12" rx="1" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.8"/>
        <polygon points="-7,-14 0,-22 7,-14" fill="#e2e8f0"/>
        ${
          f !== "neutral"
            ? `<rect x="5" y="-20" width="9" height="6" rx="1" fill="${p.flag}">
                 <animate attributeName="width" values="9;7;9" dur="2.5s" repeatCount="indefinite"/>
               </rect>`
            : `<line x1="0" y1="-22" x2="0" y2="-8" stroke="#94a3b8" stroke-width="1"/>`
        }
      </g>`;

    const pulse =
      opts.border && opts.pulse
        ? `<animate attributeName="opacity" values="1;0.72;1" dur="1.8s" repeatCount="indefinite"/>`
        : "";

    return `
    <g class="world-chunk world-chunk-${f}" opacity="${opts.opacity ?? 1}">
      <polygon points="${left}" fill="${p.left}"/>
      <polygon points="${right}" fill="${p.right}"/>
      <polygon points="${top}" fill="${p.top}" stroke="#ffffff55" stroke-width="1">${pulse}</polygon>
      ${tower}
      ${
        opts.capital
          ? `<text x="${cx}" y="${cy + h + d + 14}" text-anchor="middle" fill="#64748b" font-size="9" font-weight="600">${f === "valmira" ? "San Verde" : "Puerto Azul"}</text>`
          : ""
      }
    </g>`;
  }

  function squadMotion(from, to, color, delay, active) {
    if (!active) return "";
    const path = `M ${from.x} ${from.y - 10} Q ${(from.x + to.x) / 2} ${from.y - 28} ${to.x} ${to.y - 10}`;
    const dots = [-6, 0, 6]
      .map(
        (dx) =>
          `<circle r="3.5" fill="${color}" stroke="#fff" stroke-width="1" opacity="0.9">
             <animateMotion dur="2.4s" begin="${delay}s" repeatCount="indefinite" path="${path}"/>
           </circle>`
      )
      .join("");
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1" opacity="0.25" stroke-dasharray="4 5"/>${dots}`;
  }

  function render(container, opts) {
    const { paises, valmiraMeters: vm, cerroMeters: cm, scoreFn, subphase = "lobby" } = opts;
    if (!container) return;

    const vScore = scoreFn(vm);
    const cScore = scoreFn(cm);
    const vSum = Math.max(1, vScore < 0 ? 1 : vScore);
    const cSum = Math.max(1, cScore < 0 ? 1 : cScore);
    const vPct = Math.round((vSum / (vSum + cSum)) * 100);
    const afterAction = subphase === "reveal" || subphase === "consequence";

    const centers = {};
    const sorted = [...CHUNKS].sort((a, b) => a.c + a.r - (b.c + b.r));
    let chunkSvg = "";
    for (const ch of sorted) {
      const { x, y } = isoCenter(ch.c, ch.r);
      centers[ch.id] = { x, y };
      chunkSvg += drawChunk(x, y, ch.f, {
        capital: ch.capital,
        border: ch.border,
        pulse: afterAction && ch.id === "n1",
        opacity: factionOpacity(ch.f, vm, cm, scoreFn),
      });
    }

    const animLayer = afterAction
      ? `
      ${squadMotion(centers.v1, centers.n1, PAL.valmira.left, 0, true)}
      ${squadMotion(centers.v3, centers.n1, PAL.valmira.left, 0.5, true)}
      ${squadMotion(centers.c2, centers.n1, PAL.cerroAzul.left, 0.2, true)}
      ${squadMotion(centers.c1, centers.n1, PAL.cerroAzul.left, 0.7, true)}
    `
      : "";

    container.innerHTML = `
<div class="world-scene world-scene-chunks" role="img" aria-label="Territorio unido de Valmira y Cerro Azul">
  <div class="world-balance world-balance-chunks" aria-hidden="true">
    <div class="world-balance-valmira" style="flex:${vPct}"><span>${paises.valmira.nombreCorto}</span></div>
    <div class="world-balance-neutral" style="flex:0 0 52px"><span>Frontera</span></div>
    <div class="world-balance-cerro" style="flex:${100 - vPct}"><span>${paises.cerroAzul.nombreCorto}</span></div>
  </div>
  <svg class="world-svg world-svg-chunks" viewBox="0 0 960 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chunkSea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8deef"/>
        <stop offset="100%" stop-color="#d8eef8"/>
      </linearGradient>
    </defs>
    <rect width="960" height="480" fill="url(#chunkSea)"/>
    <ellipse cx="480" cy="430" rx="340" ry="38" fill="#9ecae1" opacity="0.35"/>
    ${chunkSvg}
    <g class="world-units">${animLayer}</g>
    <text x="480" y="468" text-anchor="middle" fill="#7a8a99" font-size="11">Cordillera del Sur · tierra unida</text>
  </svg>
  <p class="world-action-hint${afterAction ? "" : " world-action-hint-idle"}">${
      afterAction
        ? "Escuadrones se mueven hacia la frontera tras la decisión."
        : "El mapa espera la próxima decisión de los países."
    }</p>
</div>`;
  }

  return { render };
})();
