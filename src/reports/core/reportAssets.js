const cache = new Map();

async function toDataUrl(url) {
  if (!url) return "";
  if (String(url).startsWith("data:")) return String(url);
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      try {
        const response = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!response.ok) return "";
        const blob = await response.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        });
      } catch {
        return "";
      }
    })());
  }
  return cache.get(url);
}

export async function hydrateReportAssets(snapshot = {}) {
  const players = Array.isArray(snapshot.players) ? snapshot.players : [];
  const [logo, sponsorLogo, watermark, playerEntries] = await Promise.all([
    toDataUrl(snapshot.brand?.logoUrl),
    toDataUrl(snapshot.brand?.sponsorLogoUrl),
    toDataUrl(snapshot.brand?.watermarkUrl),
    Promise.all(players.map(async (player) => [player.player_id, await toDataUrl(player.photo_url)])),
  ]);
  return {
    logo,
    sponsorLogo,
    watermark,
    playerPhotos: Object.fromEntries(playerEntries.filter(([id]) => id)),
  };
}
