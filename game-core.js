/* Educación Cívica — Valmira vs Cerro Azul. Estado compartido vía localStorage. */
(function (global) {
  const STORAGE_KEY = "civica-guerra-v1";
  const ADMIN_SESSION = "civica-admin-unlocked";
  const ADMIN_PASS = "4125";

  const METERS = ["alimentos", "comercio", "estabilidad", "apoyo"];
  const METER_LABELS = {
    alimentos: "Alimentos",
    comercio: "Comercio",
    estabilidad: "Estabilidad",
    apoyo: "Apoyo",
  };

  let CONTENT = null;

  function defaultMeters() {
    const base = CONTENT?.medidoresIniciales || {
      alimentos: 55,
      comercio: 55,
      estabilidad: 50,
      apoyo: 50,
    };
    return { ...base };
  }

  function defaultCountryState() {
    return { meters: defaultMeters(), penalizacionesRegimen: 0, collapsed: false };
  }

  function defaultState() {
    return {
      version: 1,
      phase: "lobby",
      crisisIndex: 0,
      winnerRevealed: false,
      winner: null,
      valmira: defaultCountryState(),
      cerroAzul: defaultCountryState(),
      history: [],
      lastHeadlines: { valmira: "", cerroAzul: "" },
      ideasColegio: ["", "", ""],
      encuesta: { q1: 0, q2: 0, q3: 0, q4: 0, hands: 0 },
    };
  }

  function clampMeter(v) {
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  function loadContent(data) {
    CONTENT = data;
  }

  function getContent() {
    return CONTENT;
  }

  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      base.valmira = { ...defaultCountryState(), ...parsed.valmira };
      base.cerroAzul = { ...defaultCountryState(), ...parsed.cerroAzul };
      return { ...base, ...parsed, valmira: base.valmira, cerroAzul: base.cerroAzul };
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("civica-state"));
  }

  function resetGame() {
    saveState(defaultState());
  }

  function startGame() {
    const s = defaultState();
    s.phase = "playing";
    saveState(s);
  }

  function scoreCountry(c) {
    if (c.collapsed) return -1;
    const m = c.meters;
    return Math.round((m.alimentos + m.comercio + m.estabilidad + m.apoyo) / 4);
  }

  function checkCollapse(c) {
    for (const k of METERS) {
      if (c.meters[k] <= 0) {
        c.collapsed = true;
        return true;
      }
    }
    return false;
  }

  function applyEffects(countryState, effects) {
    for (const k of METERS) {
      countryState.meters[k] = clampMeter(countryState.meters[k] + (effects[k] || 0));
    }
    checkCollapse(countryState);
  }

  function optionBlocked(meters, option) {
    return option.requiereComercioMin != null && meters.comercio < option.requiereComercioMin;
  }

  function getCrisis(index) {
    return CONTENT?.crisis?.[index] ?? null;
  }

  function findOption(crisis, optionId) {
    return crisis.opciones.find((o) => o.id === optionId);
  }

  function computeWinner(state) {
    const v = state.valmira;
    const c = state.cerroAzul;
    if (v.collapsed && c.collapsed) return { result: "tie", reason: "Ambos países colapsaron." };
    if (v.collapsed) return { result: "cerroAzul", reason: "Valmira colapsó." };
    if (c.collapsed) return { result: "valmira", reason: "Cerro Azul colapsó." };
    const sv = scoreCountry(v);
    const sc = scoreCountry(c);
    if (sv > sc) return { result: "valmira", reason: `Puntaje ${sv} vs ${sc}.` };
    if (sc > sv) return { result: "cerroAzul", reason: `Puntaje ${sc} vs ${sv}.` };
    if (v.penalizacionesRegimen < c.penalizacionesRegimen) {
      return { result: "valmira", reason: "Empate; menos penalizaciones." };
    }
    if (c.penalizacionesRegimen < v.penalizacionesRegimen) {
      return { result: "cerroAzul", reason: "Empate; menos penalizaciones." };
    }
    return { result: "tie", reason: "Empate total." };
  }

  function winnerLabel(result) {
    if (result === "valmira") return "República de Valmira";
    if (result === "cerroAzul") return "República de Cerro Azul";
    return "Empate";
  }

  function confirmCrisis(resolutions) {
    const state = getState();
    if (state.phase !== "playing") return { ok: false, error: "La partida no está activa." };
    const crisis = getCrisis(state.crisisIndex);
    if (!crisis) return { ok: false, error: "Crisis inválida." };

    const logEntries = [];
    for (const res of resolutions) {
      const paisKey = res.paisId === "valmira" ? "valmira" : "cerroAzul";
      const country = state[paisKey];
      if (country.collapsed) {
        logEntries.push({ paisKey, skipped: true });
        state.lastHeadlines[paisKey] = "El país ya no puede gobernar.";
        continue;
      }
      if (!res.approved) {
        country.penalizacionesRegimen += 1;
        if (paisKey === "valmira") applyEffects(country, { estabilidad: -5 });
        else applyEffects(country, { apoyo: -3 });
        const headline = "Sin acuerdo: parálisis empeora la crisis.";
        state.lastHeadlines[paisKey] = headline;
        logEntries.push({ paisKey, approved: false, headline });
        continue;
      }
      const opt = findOption(crisis, res.optionId);
      if (!opt) return { ok: false, error: `Opción inválida (${paisKey}).` };
      if (optionBlocked(country.meters, opt)) {
        return { ok: false, error: `Comercio muy bajo para ${opt.etiqueta}.` };
      }
      applyEffects(country, opt.efectos);
      if (res.extraPenalty) {
        country.penalizacionesRegimen += res.extraPenalty;
        if (paisKey === "valmira") applyEffects(country, { estabilidad: -5 });
        else applyEffects(country, { apoyo: -3 });
      }
      state.lastHeadlines[paisKey] = opt.headline;
      logEntries.push({ paisKey, approved: true, optionId: opt.id, headline: opt.headline });
    }

    state.history.push({ crisisId: crisis.id, titulo: crisis.titulo, entries: logEntries, at: Date.now() });
    const lastCrisis = state.crisisIndex >= (CONTENT?.crisis?.length ?? 1) - 1;
    if (lastCrisis) {
      state.phase = "finished";
      state.winner = computeWinner(state);
    } else {
      state.crisisIndex += 1;
    }
    if (state.valmira.collapsed && state.cerroAzul.collapsed && state.phase === "playing") {
      state.phase = "finished";
      state.winner = computeWinner(state);
    }
    saveState(state);
    return { ok: true };
  }

  function revealWinner() {
    const state = getState();
    if (!state.winner) state.winner = computeWinner(state);
    state.winnerRevealed = true;
    state.phase = "winner";
    saveState(state);
  }

  function setIdeas(ideas) {
    const state = getState();
    state.ideasColegio = ideas.slice(0, 3);
    if (state.winnerRevealed) state.phase = "debrief";
    saveState(state);
  }

  function recordEncuesta(counts) {
    const state = getState();
    state.encuesta = { ...state.encuesta, ...counts };
    state.phase = "debrief";
    saveState(state);
  }

  function adminUnlock(pass) {
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem(ADMIN_SESSION, "1");
      return true;
    }
    return false;
  }

  function adminIsUnlocked() {
    return sessionStorage.getItem(ADMIN_SESSION) === "1";
  }

  function adminLock() {
    sessionStorage.removeItem(ADMIN_SESSION);
  }

  async function initContent(url) {
    try {
      const res = await fetch(url || "contenido.json");
      if (!res.ok) throw new Error("fetch");
      loadContent(await res.json());
      return true;
    } catch {
      return false;
    }
  }

  global.CivicaGame = {
    STORAGE_KEY,
    METERS,
    METER_LABELS,
    loadContent,
    initContent,
    getContent,
    getState,
    saveState,
    resetGame,
    startGame,
    scoreCountry,
    getCrisis,
    findOption,
    optionBlocked,
    confirmCrisis,
    computeWinner,
    winnerLabel,
    revealWinner,
    setIdeas,
    recordEncuesta,
    adminUnlock,
    adminIsUnlocked,
    adminLock,
  };
})(window);
