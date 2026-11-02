/** Carga contenido.json y helpers de rondas/finales */
const CivicaContent = (() => {
  let data = null;

  async function load(url = "contenido.json") {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar contenido.json");
    data = await res.json();
    if (!data.crisis?.length && data.rondas?.length) {
      data.crisis = data.rondas;
    }
    return data;
  }

  function get() {
    return data;
  }

  function getRound(index) {
    return data?.rondas?.[index] ?? data?.crisis?.[index] ?? null;
  }

  function roundCount() {
    return data?.rondas?.length ?? data?.crisis?.length ?? 0;
  }

  function findOption(round, optionId) {
    return round?.opciones?.find((o) => o.id === optionId) ?? null;
  }

  function optionBlocked(meters, option) {
    const min = option?.requiereComercioMin;
    return min != null && (meters?.comercio ?? 0) < min;
  }

  function applyDelta(meters, delta) {
    const keys = ["alimentos", "comercio", "estabilidad", "apoyo"];
    const out = { ...meters };
    for (const k of keys) {
      out[k] = Math.max(0, Math.min(100, Math.round((out[k] ?? 50) + (delta?.[k] ?? 0))));
    }
    return out;
  }

  function isCollapsed(meters) {
    return ["alimentos", "comercio", "estabilidad", "apoyo"].some((k) => (meters?.[k] ?? 1) <= 0);
  }

  function score(meters) {
    if (isCollapsed(meters)) return -1;
    const m = meters;
    return Math.round(((m.alimentos + m.comercio + m.estabilidad + m.apoyo) / 4));
  }

  const METER_LABELS = {
    alimentos: "Comida",
    comercio: "Comercio",
    estabilidad: "Orden",
    apoyo: "Apoyo del pueblo",
  };

  function meterLabel(key) {
    return METER_LABELS[key] ?? key;
  }

  function statusIcons(meters) {
    const icons = [];
    if ((meters.alimentos ?? 100) < 35) icons.push({ id: "hambre", label: "Poca comida" });
    if ((meters.comercio ?? 100) < 35) icons.push({ id: "aranceles", label: "Comercio difícil" });
    if ((meters.apoyo ?? 100) < 30) icons.push({ id: "protestas", label: "Protestas" });
    if ((meters.estabilidad ?? 100) < 30) icons.push({ id: "caos", label: "Mucho desorden" });
    return icons;
  }

  function computeEnding(room) {
    const finales = data?.finales ?? {};
    const vm = room.valmira_meters;
    const cm = room.cerro_meters;
    const pf = room.peace_flags ?? {};

    if (isCollapsed(vm)) return { ...(finales.colapso_valmira ?? {}), id: "colapso_valmira" };
    if (isCollapsed(cm)) return { ...(finales.colapso_cerro ?? {}), id: "colapso_cerro" };

    const peaceOk =
      pf.valmira &&
      pf.cerroAzul &&
      (vm.alimentos ?? 0) >= 40 &&
      (cm.alimentos ?? 0) >= 40 &&
      (vm.apoyo ?? 0) >= 45 &&
      (cm.apoyo ?? 0) >= 45;

    if (peaceOk) return { ...finales.paz, id: "paz" };

    const sv = score(vm);
    const sc = score(cm);
    if (sv > sc) return { ...finales.valmira, id: "valmira" };
    if (sc > sv) return { ...finales.cerroAzul, id: "cerroAzul" };
    return { ...finales.empate, id: "empate" };
  }

  /** Mayoría de opciones entre votos de jugadores valmira */
  function tallyValmiraOptions(votes, players) {
    const valmiraIds = new Set(players.filter((p) => p.country === "valmira").map((p) => p.id));
    const counts = {};
    for (const v of votes) {
      if (v.vote_kind !== "option" || !v.option_id) continue;
      if (!valmiraIds.has(v.player_id)) continue;
      counts[v.option_id] = (counts[v.option_id] || 0) + 1;
    }
    let best = null;
    let bestN = -1;
    for (const [id, n] of Object.entries(counts)) {
      if (n > bestN) {
        bestN = n;
        best = id;
      }
    }
    return { chosen: best, counts };
  }

  function tallyCerro(votes, players) {
    const pres = players.find((p) => p.country === "cerroAzul" && p.role === "presidente");
    const asmIds = new Set(
      players.filter((p) => p.country === "cerroAzul" && p.role === "asambleista").map((p) => p.id)
    );
    let chosen = null;
    if (pres) {
      const pv = votes.find((v) => v.player_id === pres.id && v.vote_kind === "option");
      chosen = pv?.option_id ?? null;
    }
    let yes = 0;
    let no = 0;
    for (const v of votes) {
      if (!asmIds.has(v.player_id)) continue;
      if (v.vote_kind === "yes") yes++;
      if (v.vote_kind === "no") no++;
    }
    const approved = yes > no;
    return { chosen, yes, no, approved };
  }

  return {
    load,
    get,
    getRound,
    roundCount,
    findOption,
    optionBlocked,
    applyDelta,
    isCollapsed,
    score,
    meterLabel,
    statusIcons,
    computeEnding,
    tallyValmiraOptions,
    tallyCerro,
  };
})();
