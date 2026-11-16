/** Mapa plano (casi 2D) — Cordillera del Sur, HUD de medidores e interacción por zona */
const CivicaWorldMap = (() => {
  const TW = 86;
  const TH = 43;
  const OX = 478;
  const OY = 72;

  const PAL = {
    valmira: { fill: "#9dccab", stroke: "#2d6a4f", flag: "#2d6a4f", token: "#5a9f6e" },
    cerroAzul: { fill: "#9ec5e8", stroke: "#1d3557", flag: "#1d3557", token: "#5a9fbf" },
    neutral: { fill: "#e2e8f0", stroke: "#94a3b8", flag: "#94a3b8", token: "#94a3b8" },
  };

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

  function fillTone(f, meters, scoreFn) {
    const m = f === "valmira" || f === "cerroAzul" ? meters : null;
    if (!m) return 1;
    const s = scoreFn(m);
    if (s < 0) return 0.55;
    return 0.88 + (s / 100) * 0.12;
  }

  function drawChunkFlat(cx, cy, f, opts = {}) {
    const p = PAL[f] || PAL.neutral;
    const w = TW / 2;
    const h = TH / 2;
    const top = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
    const zone = f === "neutral" ? "border" : f;
    const pulseCls = opts.pulse ? " world-chunk-pulse" : "";
    const hotCls = opts.hot ? " world-chunk-hot" : "";

    const capital =
      opts.capital && f !== "neutral"
        ? `<g pointer-events="none">
             <circle cx="${cx}" cy="${cy - 4}" r="5" fill="#fff" stroke="${p.stroke}" stroke-width="1.2"/>
             <rect x="${cx + 4}" y="${cy - 14}" width="10" height="7" rx="1" fill="${p.flag}"/>
           </g>
           <text x="${cx}" y="${cy + h + 12}" text-anchor="middle" fill="#64748b" font-size="9" font-weight="600">${
            f === "valmira" ? "San Verde" : "Puerto Azul"
          }</text>`
        : "";

    return `
    <g class="world-chunk world-chunk-${f} world-chunk-clickable${pulseCls}${hotCls}"
       data-map-zone="${zone}" opacity="${opts.opacity ?? 1}" role="button" tabindex="0"
       aria-label="${zone === "border" ? "Frontera" : zone}">
      <polygon points="${top}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.5" stroke-linejoin="round"/>
      ${capital}
    </g>`;
  }

  function squadLine(from, to, color, delay) {
    const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    const dots = [-5, 0, 5]
      .map(
        (dx, i) =>
          `<circle r="3.5" fill="${color}" stroke="#fff" stroke-width="1">
             <animateMotion dur="2.2s" begin="${delay + i * 0.15}s" repeatCount="indefinite" path="${path}"/>
           </circle>`
      )
      .join("");
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.25" opacity="0.35" stroke-dasharray="5 6"/>${dots}`;
  }

  function meterDelta(cur, prev, key) {
    if (!prev || prev[key] == null || prev[key] === cur[key]) return "";
    const d = cur[key] - prev[key];
    const cls = d > 0 ? "world-delta-up" : "world-delta-down";
    const sign = d > 0 ? "+" : "";
    return `<span class="world-delta ${cls}">${sign}${d}</span>`;
  }

  function hudPanel(side, pais, meters, prev, scoreFn, meterLabel, statusIcons, regimenLabel) {
    const score = scoreFn(meters);
    const icons = statusIcons(meters);
    const bars = (CivicaContent.METER_KEYS || ["alimentos", "comercio", "estabilidad", "apoyo"])
      .map((k) => {
        const v = meters[k] ?? 0;
        const barCls = v < 30 ? " bar-warn" : v < 15 ? " bar-danger" : "";
        return `<div class="world-hud-meter">
          <span class="world-hud-meter-label">${meterLabel(k)}</span>
          <span class="world-hud-meter-val">${v}${meterDelta(meters, prev, k)}</span>
          <div class="world-hud-bar${barCls}"><span style="width:${v}%"></span></div>
        </div>`;
      })
      .join("");
    const pills = icons.map((i) => `<span class="status-pill">${i.label}</span>`).join("");
    return `
      <div class="world-hud-panel world-hud-${side}" data-map-zone="${side === "valmira" ? "valmira" : "cerroAzul"}">
        <strong>${pais.nombreCorto}</strong>
        <span class="world-hud-regimen">${regimenLabel(pais.regimen)}</span>
        <span class="world-score">Índice: ${score < 0 ? "—" : score}</span>
        ${bars}
        ${pills ? `<div class="status-icons">${pills}</div>` : ""}
      </div>`;
  }

  function hasMeterChange(vm, cm, prevV, prevC) {
    if (!prevV && !prevC) return false;
    const keys = CivicaContent.METER_KEYS || ["alimentos", "comercio", "estabilidad", "apoyo"];
    for (const k of keys) {
      if (prevV && vm[k] !== prevV[k]) return true;
      if (prevC && cm[k] !== prevC[k]) return true;
    }
    return false;
  }

  function render(container, opts) {
    const {
      paises,
      valmiraMeters: vm,
      cerroMeters: cm,
      prevValmira: prevV,
      prevCerro: prevC,
      scoreFn,
      meterLabel,
      statusIcons,
      regimenLabel,
      subphase = "lobby",
      lastCross = null,
    } = opts;
    if (!container || !paises) return;

    const afterAction = subphase === "reveal" || subphase === "consequence";
    const metersChanged = subphase === "consequence" && hasMeterChange(vm, cm, prevV, prevC);

    const centers = {};
    const sorted = [...CHUNKS].sort((a, b) => a.c + a.r - (b.c + b.r));
    let chunkSvg = "";
    for (const ch of sorted) {
      const { x, y } = isoCenter(ch.c, ch.r);
      centers[ch.id] = { x, y };
      const hot =
        metersChanged &&
        ((ch.f === "valmira" && prevV) || (ch.f === "cerroAzul" && prevC));
      chunkSvg += drawChunkFlat(x, y, ch.f, {
        capital: ch.capital,
        border: ch.border,
        pulse: afterAction && ch.id === "n1",
        hot,
        opacity: fillTone(ch.f, ch.f === "valmira" ? vm : ch.f === "cerroAzul" ? cm : null, scoreFn),
      });
    }

    const animLayer = afterAction
      ? `
      ${squadLine(centers.v1, centers.n1, PAL.valmira.token, 0)}
      ${squadLine(centers.c2, centers.n1, PAL.cerroAzul.token, 0.35)}
    `
      : "";

    const sceneCls = `world-scene world-scene-flat${metersChanged ? " world-scene-delta" : ""}`;

    container.innerHTML = `
<div class="${sceneCls}" role="region" aria-label="Mapa de Valmira y Cerro Azul">
  <div class="world-hud-row">
    ${hudPanel("valmira", paises.valmira, vm, prevV, scoreFn, meterLabel, statusIcons, regimenLabel)}
    ${hudPanel("cerro", paises.cerroAzul, cm, prevC, scoreFn, meterLabel, statusIcons, regimenLabel)}
  </div>
  <svg class="world-svg world-svg-flat" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
    <rect width="960" height="420" fill="#eef6fa" rx="0"/>
  <text x="480" y="24" text-anchor="middle" fill="#7a8a99" font-size="11">Cordillera del Sur</text>
    ${chunkSvg}
    <g class="world-units">${animLayer}</g>
  </svg>
  <p class="world-map-tip" hidden id="worldMapTip" role="status"></p>
</div>`;

    wireInteraction(container, {
      paises,
      vm,
      cm,
      prevV,
      prevC,
      scoreFn,
      meterLabel,
      statusIcons,
      regimenLabel,
      lastCross,
    });
  }

  function zoneSummary(zone, ctx) {
    const { paises, vm, cm, scoreFn, meterLabel, statusIcons, regimenLabel, lastCross } = ctx;
    if (zone === "border") {
      return lastCross
        ? `Frontera: ${lastCross}`
        : "Frontera: sin eventos cruzados recientes. Tocá Valmira o Cerro Azul para ver medidores.";
    }
    const pais = zone === "valmira" ? paises.valmira : paises.cerroAzul;
    const meters = zone === "valmira" ? vm : cm;
    const icons = statusIcons(meters);
    const score = scoreFn(meters);
    const lines = (CivicaContent.METER_KEYS || ["alimentos", "comercio", "estabilidad", "apoyo"]).map(
      (k) => `${meterLabel(k)} ${meters[k]}`
    );
    let t = `${pais.nombreCorto} (${regimenLabel(pais.regimen)}). Índice ${score < 0 ? "colapso" : score}. ${lines.join(" · ")}`;
    if (icons.length) t += ` Alertas: ${icons.map((i) => i.label).join(", ")}.`;
    return t;
  }

  function wireInteraction(container, ctx) {
    const tip = container.querySelector("#worldMapTip");
    const show = (zone) => {
      if (!tip) return;
      tip.textContent = zoneSummary(zone, ctx);
      tip.hidden = false;
    };
    container.querySelectorAll("[data-map-zone]").forEach((el) => {
      const zone = el.dataset.mapZone;
      const on = () => show(zone);
      el.addEventListener("click", on);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          on();
        }
      });
    });
  }

  return { render };
})();