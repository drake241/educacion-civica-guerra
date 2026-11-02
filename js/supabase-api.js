/** Cliente Supabase — RPC y realtime */
const CivicaSupabase = (() => {
  let client = null;

  function init() {
    const cfg = window.CIVICA_CONFIG;
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
      throw new Error("Falta js/config.js — copiá config.example.js");
    }
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return client;
  }

  function getClient() {
    if (!client) init();
    return client;
  }

  async function createRoom() {
    const { data, error } = await getClient().rpc("create_room");
    if (error) throw error;
    return data;
  }

  async function joinRoom(code, nickname, country) {
    const { data, error } = await getClient().rpc("join_room", {
      p_code: code,
      p_nickname: nickname,
      p_country: country,
    });
    if (error) throw error;
    return data;
  }

  async function submitVote(playerId, voteKind, optionId = null) {
    const { error } = await getClient().rpc("submit_vote", {
      p_player_id: playerId,
      p_vote_kind: voteKind,
      p_option_id: optionId,
    });
    if (error) throw error;
  }

  async function fetchRoom(roomId) {
    const { data, error } = await getClient().from("rooms").select("*").eq("id", roomId).single();
    if (error) throw error;
    return data;
  }

  async function fetchPlayers(roomId) {
    const { data, error } = await getClient().from("players").select("*").eq("room_id", roomId);
    if (error) throw error;
    return data ?? [];
  }

  async function fetchVotes(roomId, roundIndex) {
    const { data, error } = await getClient()
      .from("votes")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_index", roundIndex);
    if (error) throw error;
    return data ?? [];
  }

  function subscribeRoom(roomId, onChange) {
    return getClient()
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => onChange()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => onChange()
      )
      .subscribe();
  }

  async function teacherStartWar(roomId, pin) {
    const { error } = await getClient().rpc("teacher_start_war", { p_room_id: roomId, p_pin: pin });
    if (error) throw error;
  }

  async function teacherSetSubphase(roomId, pin, subphase) {
    const { error } = await getClient().rpc("teacher_set_subphase", {
      p_room_id: roomId,
      p_pin: pin,
      p_subphase: subphase,
    });
    if (error) throw error;
  }

  async function teacherCloseVote(roomId, pin, valmiraOpt, cerroOpt, cerroYes, cerroNo) {
    const { data, error } = await getClient().rpc("teacher_close_vote", {
      p_room_id: roomId,
      p_pin: pin,
      p_valmira_option: valmiraOpt,
      p_cerro_option: cerroOpt,
      p_cerro_yes: cerroYes,
      p_cerro_no: cerroNo,
    });
    if (error) throw error;
    return data;
  }

  async function teacherApplyConsequence(roomId, pin, payload) {
    const { data, error } = await getClient().rpc("teacher_apply_consequence", {
      p_room_id: roomId,
      p_pin: pin,
      p_valmira_delta: payload.valmiraDelta,
      p_cerro_delta: payload.cerroDelta,
      p_valmira_headline: payload.valmiraHeadline,
      p_cerro_headline: payload.cerroHeadline,
      p_cross_event: payload.crossEvent ?? null,
      p_peace_valmira: payload.peaceValmira ?? false,
      p_peace_cerro: payload.peaceCerro ?? false,
    });
    if (error) throw error;
    return data;
  }

  async function teacherNextRound(roomId, pin) {
    const { error } = await getClient().rpc("teacher_next_round", { p_room_id: roomId, p_pin: pin });
    if (error) throw error;
  }

  async function teacherSetEnding(roomId, pin, endingId) {
    const { error } = await getClient().rpc("teacher_set_ending", {
      p_room_id: roomId,
      p_pin: pin,
      p_ending: endingId,
    });
    if (error) throw error;
  }

  return {
    init,
    createRoom,
    joinRoom,
    submitVote,
    fetchRoom,
    fetchPlayers,
    fetchVotes,
    subscribeRoom,
    teacherStartWar,
    teacherSetSubphase,
    teacherCloseVote,
    teacherApplyConsequence,
    teacherNextRound,
    teacherSetEnding,
  };
})();

const CivicaSession = {
  savePlayer(p) {
    localStorage.setItem("civica_player", JSON.stringify(p));
  },
  loadPlayer() {
    try {
      return JSON.parse(localStorage.getItem("civica_player"));
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem("civica_player");
  },
};

const TEACHER_PIN = "4125";

function roleLabel(role, country) {
  const map = {
    primer_ministro: "Primer ministro",
    diputado: "Diputado/a",
    presidente: "Presidente",
    asambleista: "Asambleísta",
  };
  return map[role] ?? role;
}
