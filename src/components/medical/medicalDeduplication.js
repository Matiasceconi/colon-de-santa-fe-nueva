function recordTimestamp(record) {
  const value = record?.edited_at || record?.last_synced_at || record?.updated_at || record?.updated_date || record?.created_date || "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function episodeKey(episode) {
  if (episode?.medical_episode_key) return `key:${episode.medical_episode_key}`;
  return [
    episode?.player_id || episode?.player_name_original || "",
    episode?.fecha_inicio_tto || "",
    episode?.lesion_consulta || "",
    episode?.mmii_afectado || "",
    episode?.categoria_division || "",
  ].map((value) => String(value).trim().toLowerCase()).join("|");
}

export function dedupeMedicalEpisodes(records = []) {
  const groups = new Map();

  records.forEach((episode) => {
    const key = episodeKey(episode);
    const current = groups.get(key);
    if (!current || recordTimestamp(episode) > recordTimestamp(current.canonical)) {
      groups.set(key, {
        canonical: episode,
        ids: current ? [...current.ids, episode.id].filter(Boolean) : [episode.id].filter(Boolean),
      });
    } else if (episode.id) {
      current.ids.push(episode.id);
    }
  });

  const episodes = [];
  const byAnyId = {};
  groups.forEach(({ canonical, ids }) => {
    episodes.push(canonical);
    ids.forEach((id) => { byAnyId[id] = canonical; });
    if (canonical.id) byAnyId[canonical.id] = canonical;
  });

  episodes.sort((a, b) => String(b.fecha_inicio_tto || "").localeCompare(String(a.fecha_inicio_tto || "")));
  return { episodes, byAnyId };
}

export function dedupeMedicalStatuses(records = []) {
  const byPlayer = new Map();

  records.forEach((status) => {
    const key = status.player_id || status.id;
    const current = byPlayer.get(key);
    if (!current || recordTimestamp(status) > recordTimestamp(current)) byPlayer.set(key, status);
  });

  return Array.from(byPlayer.values());
}
