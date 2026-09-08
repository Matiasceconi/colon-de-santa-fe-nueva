import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getFootballSettings, callFootballApi } from "../../shared/footballApi.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'saveSettings') {
      const existing = await getFootballSettings(base44);
      const payload = {
        api_key: body.api_key,
        base_url: body.base_url || "https://v3.football.api-sports.io",
        active: true,
        updated_at: new Date().toISOString(),
      };
      let saved;
      if (existing) {
        saved = await base44.asServiceRole.entities.FootballApiSettings.update(existing.id, payload);
      } else {
        saved = await base44.asServiceRole.entities.FootballApiSettings.create(payload);
      }
      return Response.json({ success: true, settings_id: saved.id });
    }

    if (action === 'getSettings') {
      const settings = await getFootballSettings(base44);
      if (!settings) return Response.json({ settings: null });
      return Response.json({
        settings: {
          id: settings.id,
          base_url: settings.base_url,
          active: settings.active,
          last_test_at: settings.last_test_at,
          last_test_ok: settings.last_test_ok,
          rate_limit_remaining: settings.rate_limit_remaining,
          updated_at: settings.updated_at,
          has_key: !!settings.api_key,
        },
      });
    }

    const settings = await getFootballSettings(base44);
    if (!settings) return Response.json({ error: 'API de Fútbol no configurada' }, { status: 400 });

    if (action === 'testConnection') {
      try {
        const { rateLimitRemaining } = await callFootballApi(settings, '/status');
        await base44.asServiceRole.entities.FootballApiSettings.update(settings.id, {
          last_test_at: new Date().toISOString(),
          last_test_ok: true,
          rate_limit_remaining: rateLimitRemaining,
        });
        return Response.json({ success: true, ok: true, rateLimitRemaining });
      } catch (e) {
        await base44.asServiceRole.entities.FootballApiSettings.update(settings.id, {
          last_test_at: new Date().toISOString(),
          last_test_ok: false,
        });
        throw e;
      }
    }

    if (action === 'searchLeagues') {
      const { data } = await callFootballApi(settings, '/leagues', { search: body.search });
      const leagues = (data?.response || []).map((l) => ({
        id: l.league?.id,
        name: l.league?.name,
        logo: l.league?.logo,
        country: l.country?.name,
        country_code: l.country?.code,
        type: l.league?.type,
      }));
      return Response.json({ leagues });
    }

    if (action === 'getLeague') {
      const { data } = await callFootballApi(settings, '/leagues', { id: body.league_id, season: body.season });
      return Response.json({ league: data?.response?.[0] || null });
    }

    if (action === 'getStandings') {
      const { data, rateLimitRemaining } = await callFootballApi(settings, '/standings', { league: body.league_id, season: body.season });
      return Response.json({ standings: data?.response || [], rateLimitRemaining });
    }

    if (action === 'getFixtures') {
      const params = { league: body.league_id, season: body.season };
      if (body.round) params.round = body.round;
      const { data, rateLimitRemaining } = await callFootballApi(settings, '/fixtures', params);
      return Response.json({ fixtures: data?.response || [], rateLimitRemaining });
    }

    if (action === 'syncYouthStandings') {
      const leagueId = body.league_id;
      const season = body.season || String(new Date().getFullYear());
      if (!leagueId) return Response.json({ error: 'Falta league_id (vinculá la competencia juvenil a una liga de API-Football)' }, { status: 400 });

      const { data, rateLimitRemaining } = await callFootballApi(settings, '/standings', { league: leagueId, season });
      const leagueResp = data?.response?.[0];
      if (!leagueResp) return Response.json({ error: 'La API no devolvió standings para esa liga/temporada' }, { status: 404 });

      const leagueName = leagueResp.league?.name || 'Torneo de Juveniles';
      const groups = leagueResp.league?.standings || [];

      // Map group name → category enum
      const catMap = [
        { re: /cuart|4/, cat: '4ta' },
        { re: /quint|5/, cat: '5ta' },
        { re: /sext|6/, cat: '6ta' },
        { re: /s[eé]pt|7/, cat: '7ma' },
        { re: /octav|8/, cat: '8va' },
        { re: /nov[eé]n|9/, cat: '9na' },
      ];
      function resolveCategory(groupName) {
        const g = String(groupName || '').toLowerCase();
        for (const { re, cat } of catMap) { if (re.test(g)) return cat; }
        return null;
      }

      const batchId = `youth_sync_${Date.now()}`;
      const now = new Date().toISOString();
      let totalSaved = 0;
      const categoriesSynced = [];

      for (const groupRows of groups) {
        if (!Array.isArray(groupRows) || !groupRows.length) continue;
        const groupName = groupRows[0]?.group || '';
        const category = resolveCategory(groupName);
        if (!category) continue;

        // Delete old records for this category (non-manual-override)
        await base44.asServiceRole.entities.FootballYouthStanding.deleteMany({
          category,
          manual_override: { $ne: true },
        });

        const records = groupRows.map((row) => ({
          category,
          competitionName: leagueName,
          season,
          tournament: groupName,
          position: row.rank || 0,
          teamName: row.team?.name || '',
          points: row.points || 0,
          played: row.all?.played || 0,
          won: row.all?.win || 0,
          drawn: row.all?.draw || 0,
          lost: row.all?.lose || 0,
          goalsFor: row.all?.goals?.for || 0,
          goalsAgainst: row.all?.goals?.against || 0,
          goalDifference: (row.all?.goals?.for || 0) - (row.all?.goals?.against || 0),
          source: 'API-Football',
          provider: 'api_football',
          external_key: `${leagueId}_${season}_${category}_${row.team?.id || row.team?.name}`,
          sync_batch_id: batchId,
          last_synced_at: now,
          updatedAt: now,
          validation_status: 'validated',
        })).filter((r) => r.teamName && r.position);

        if (records.length) {
          await base44.asServiceRole.entities.FootballYouthStanding.bulkCreate(records);
          totalSaved += records.length;
          categoriesSynced.push(category);
        }
      }

      return Response.json({ success: true, saved: totalSaved, categories: categoriesSynced, rateLimitRemaining });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}