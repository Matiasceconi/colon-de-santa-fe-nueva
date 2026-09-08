import { createClientFromRequest } from 'npm:@base44/sdk';

const SYNC_KEY = 'afa_competitions';
const DEFAULT_STALE_MINUTES = 45;
const MATCHDAY_STALE_MINUTES = 5;
const SYNC_LOCK_MINUTES = 4;

function minutesSince(value) {
  if (!value) return Infinity;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return Infinity;
  return (Date.now() - time) / 60000;
}

async function upsertSyncState(service, current, patch) {
  const payload = { key: SYNC_KEY, provider: 'AFA / Promiedos', updated_at: new Date().toISOString(), ...patch };
  if (current?.id) return service.CompetitionSyncState.update(current.id, payload);
  return service.CompetitionSyncState.create(payload);
}

export default async function(req) {
  let base44;
  let service;
  let syncState = null;
  try {
    base44 = createClientFromRequest(req);
    service = base44.asServiceRole.entities;
    const args = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const forceRequested = Boolean(args?.force);
    const force = forceRequested && user?.role === 'admin';
    const matchDay = Boolean(args?.match_day);

    const profiles = await service.InstitutionProfile.filter({ active: true }, '-updated_at', 1).catch(() => []);
    const profile = profiles?.[0] || null;
    const SEASON = String(args?.season || profile?.default_season || new Date().getFullYear());
    const integrationRows = await service.CompetitionIntegrationSettings.filter({ provider: 'promiedos' }, '-updated_date', 1).catch(() => []);
    const integrationSettings = integrationRows?.[0] || null;
    const providerTimeAdjustmentMinutes = Number(integrationSettings?.provider_time_adjustment_minutes || 0);

    const states = await service.CompetitionSyncState.filter({ key: SYNC_KEY }, '-updated_date', 1).catch(() => []);
    syncState = states?.[0] || null;
    const staleMinutes = matchDay ? MATCHDAY_STALE_MINUTES : DEFAULT_STALE_MINUTES;
    if (!force && syncState?.status === 'syncing' && minutesSince(syncState.last_started_at) < SYNC_LOCK_MINUTES) {
      return Response.json({
        success: true,
        unchanged: true,
        syncing: true,
        season: SEASON,
        message: 'Ya hay una sincronización de competencias en curso.',
        last_started_at: syncState.last_started_at,
      });
    }
    if (!force && syncState?.status === 'success' && minutesSince(syncState.last_success_at) < staleMinutes) {
      return Response.json({
        success: true,
        unchanged: true,
        season: SEASON,
        message: 'La fuente todavía está vigente; no fue necesario volver a sincronizar.',
        last_success_at: syncState.last_success_at,
      });
    }

    const startedAt = new Date().toISOString();
    await upsertSyncState(service, syncState, {
      season: SEASON,
      status: 'syncing',
      last_started_at: startedAt,
      last_error: '',
    });

    // Helper: fetch HTML
    const PROVIDER_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-VER': '1.11.7.3',
    };

    async function fetchPage(url) {
      const response = await fetch(url, { headers: PROVIDER_HEADERS });
      if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);
      return await response.text();
    }

    async function fetchJson(url) {
      const response = await fetch(url, { headers: PROVIDER_HEADERS });
      if (!response.ok) throw new Error(`Fuente respondió ${response.status}`);
      return await response.json();
    }

    function providerLogo(team) {
      return team?.id ? `https://api.promiedos.com.ar/images/team/${team.id}/1` : '';
    }

    function adjustProviderDateTime(rawDatePart, rawTimePart, adjustmentMinutes = 0) {
      const dateBits = String(rawDatePart || '').split('-').map(Number);
      const timeBits = String(rawTimePart || '00:00').split(':').map(Number);
      if (dateBits.length !== 3 || dateBits.some((value) => !Number.isFinite(value))) return { matchDate: null, matchTime: rawTimePart || '' };
      const [day, month, year] = dateBits;
      const hour = Number.isFinite(timeBits[0]) ? timeBits[0] : 0;
      const minute = Number.isFinite(timeBits[1]) ? timeBits[1] : 0;
      const stamp = new Date(Date.UTC(year, month - 1, day, hour, minute));
      stamp.setUTCMinutes(stamp.getUTCMinutes() + Number(adjustmentMinutes || 0));
      return {
        matchDate: `${stamp.getUTCFullYear()}-${String(stamp.getUTCMonth() + 1).padStart(2, '0')}-${String(stamp.getUTCDate()).padStart(2, '0')}`,
        matchTime: `${String(stamp.getUTCHours()).padStart(2, '0')}:${String(stamp.getUTCMinutes()).padStart(2, '0')}`,
      };
    }

    function normalizeKey(value) {
      return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function normalizeFixtureTeam(value) {
      return normalizeKey(value)
        .replace(/\breserva\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function standingKey(row) {
      return [row.season, normalizeKey(row.competition), normalizeKey(row.group), normalizeKey(row.team)].join('::');
    }

    function fixtureKey(row) {
      return [row.season, normalizeKey(row.competition), row.matchDate, normalizeFixtureTeam(row.homeTeam), normalizeFixtureTeam(row.awayTeam)].join('::');
    }

    function uniqueByKey(rows, keyFn) {
      const map = new Map();
      for (const row of rows) {
        const key = keyFn(row);
        const current = map.get(key);
        if (!current) {
          map.set(key, row);
          continue;
        }
        const currentOfficial = current.source === 'lpf_programacion_oficial' || current.source === 'manual';
        const rowOfficial = row.source === 'lpf_programacion_oficial' || row.source === 'manual';
        if (rowOfficial && !currentOfficial) map.set(key, { ...current, ...row });
        else if (!currentOfficial) map.set(key, { ...current, ...row });
      }
      return [...map.values()];
    }

    function pickCanonicalFixture(rows) {
      return [...rows].sort((a, b) => {
        const sourceScore = (row) => row.source === 'manual' ? 3 : row.source === 'lpf_programacion_oficial' ? 2 : 1;
        const completeness = (row) => [row.matchTime, row.venue, row.round, row.homeLogo, row.awayLogo, row.homeScore != null && row.awayScore != null].filter(Boolean).length;
        return sourceScore(b) - sourceScore(a) || completeness(b) - completeness(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || ''));
      })[0];
    }

    async function removeDuplicateRows(entity, rows, keyFn, picker = (group) => group[0]) {
      const groups = new Map();
      for (const row of rows) {
        const key = keyFn(row);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      let deleted = 0;
      for (const group of groups.values()) {
        if (group.length < 2) continue;
        const keep = picker(group);
        for (const duplicate of group) {
          if (duplicate.id === keep.id) continue;
          await entity.delete(duplicate.id).catch(() => null);
          deleted += 1;
        }
      }
      return deleted;
    }

    function changed(current, next, fields) {
      return fields.some((field) => String(current?.[field] ?? '') !== String(next?.[field] ?? ''));
    }

    async function bulkCreate(entity, rows, size = 100) {
      for (let index = 0; index < rows.length; index += size) {
        await entity.bulkCreate(rows.slice(index, index + size));
      }
    }

    // Helper: parse standings from ligaprofesional.ar HTML (TablePress tables)
    function parseLPFStandings(html) {
      const tableRegex = /<table[^>]*tablepress[^>]*>([\s\S]*?)<\/table>/g;
      let match;
      while ((match = tableRegex.exec(html)) !== null) {
        const table = match[1];
        if (!table.includes('Pos') || !table.includes('Equipo') || !table.includes('Pts')) continue;
        if (table.includes('tablepress-fixture')) continue;

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        let rowMatch;
        const standings = [];
        while ((rowMatch = rowRegex.exec(table)) !== null) {
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[hd]>/g;
          const cells = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
            cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
          }
          if (cells.length < 10 || cells[0] === 'Pos' || cells[0] === 'Fecha') continue;
          const pos = parseInt(cells[0].replace('°', '').trim());
          if (isNaN(pos)) continue;
          standings.push({
            position: pos,
            team: cells[1],
            points: parseInt(cells[2]) || 0,
            played: parseInt(cells[3]) || 0,
            won: parseInt(cells[4]) || 0,
            drawn: parseInt(cells[5]) || 0,
            lost: parseInt(cells[6]) || 0,
            goalsFor: parseInt(cells[7]) || 0,
            goalsAgainst: parseInt(cells[8]) || 0,
            goalDiff: parseInt(cells[9]) || 0,
          });
        }
        if (standings.length > 0) return standings;
      }
      return [];
    }

    // Helper: parse fixtures from ligaprofesional.ar
    function parseLPFFixtures(html) {
      const tableRegex = /<table[^>]*tablepress-fixture[^>]*>([\s\S]*?)<\/table>/g;
      let match;
      const fixtures = [];
      let roundNum = 0;
      while ((match = tableRegex.exec(html)) !== null) {
        roundNum++;
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(match[1])) !== null) {
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[hd]>/g;
          const cells = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
            cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
          }
          if (cells.length < 8 || cells[0] === 'Fecha') continue;
          const homeScore = cells[3] ? parseInt(cells[3]) : null;
          const awayScore = cells[5] ? parseInt(cells[5]) : null;
          const status = (homeScore === null || awayScore === null || isNaN(homeScore) || isNaN(awayScore)) ? 'scheduled' : 'played';
          fixtures.push({
            date: cells[0],
            homeTeam: cells[1],
            awayTeam: cells[7],
            homeScore: status === 'played' ? homeScore : null,
            awayScore: status === 'played' ? awayScore : null,
            status,
            round: `Fecha ${roundNum}`,
          });
        }
      }
      return fixtures;
    }

    // Helper: parse date (14 mar 2026 -> 2026-03-14)
    function parseDate(dateStr) {
      const months = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
      const parts = String(dateStr || '').trim().replace(/  /g, ' ').split(' ');
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1].toLowerCase().substring(0, 3)] || '01';
        const year = parseInt(parts[2]);
        if (isNaN(day) || isNaN(year)) return null;
        return `${year}-${month}-${day.toString().padStart(2, '0')}`;
      }
      return null;
    }

    function decodeHtmlText(value = '') {
      const named = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#039;': "'", '&apos;': "'", '&ndash;': '–', '&mdash;': '—' };
      let text = String(value || '').replace(/&(nbsp|amp|quot|apos|ndash|mdash);|&#039;/g, (match) => named[match] || match);
      text = text.replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
      return text;
    }

    function officialPostLines(html = '') {
      return decodeHtmlText(String(html || '')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' '))
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    }

    function parseOfficialProgramming(html, competition) {
      const monthMap = {
        enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
        julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
      };
      const rows = [];
      let currentDate = '';
      let currentRound = '';
      for (const line of officialPostLines(html)) {
        const roundMatch = line.match(/^fecha\s+(\d+)/i);
        if (roundMatch) {
          currentRound = `Fecha ${roundMatch[1]}`;
          continue;
        }
        const dateMatch = normalizeKey(line).match(/^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/i);
        if (dateMatch) {
          const month = monthMap[dateMatch[3]];
          const year = dateMatch[4] || SEASON;
          if (month) currentDate = `${year}-${month}-${String(dateMatch[2]).padStart(2, '0')}`;
          const rest = line.replace(/^.*?(?=<br>|$)/i, '');
          if (!rest) continue;
        }
        if (!currentDate) continue;
        const pieces = line.split(/\s+[–—]\s+/).map((piece) => piece.trim()).filter(Boolean);
        if (pieces.length < 2) continue;
        const first = pieces[0].match(/^(\d{1,2})[.:](\d{2})\s+(.+)$/);
        if (!first) continue;
        const homeTeam = first[3].trim();
        const awayTeam = String(pieces[1] || '').replace(/\s*\((?:zona\s+[^)]+|interzonal)\)\s*$/i, '').trim();
        if (!homeTeam || !awayTeam) continue;
        rows.push({
          competition,
          category: competition,
          season: SEASON,
          homeTeam,
          awayTeam,
          status: 'scheduled',
          round: currentRound,
          matchDate: currentDate,
          matchTime: `${String(first[1]).padStart(2, '0')}:${first[2]}`,
          venue: pieces.slice(2).join(' – '),
          external_key: `lpf:${normalizeKey(competition)}:${currentDate}:${normalizeFixtureTeam(homeTeam)}:${normalizeFixtureTeam(awayTeam)}`,
          source: 'lpf_programacion_oficial',
        });
      }
      return rows;
    }

    async function fetchOfficialProyeccionProgramming() {
      try {
        const results = await fetchJson(`https://www.ligaprofesional.ar/wp-json/wp/v2/search?search=${encodeURIComponent(`agenda proyeccion ${SEASON}`)}&per_page=10`);
        const relevant = (Array.isArray(results) ? results : [])
          .filter((item) => String(item.url || '').includes(`/notas/proyeccion/${SEASON}/`))
          .slice(0, 4);
        const collected = [];
        for (const item of relevant) {
          try {
            const post = await fetchJson(`https://www.ligaprofesional.ar/wp-json/wp/v2/posts/${item.id}?_fields=content,link,date,title`);
            collected.push(...parseOfficialProgramming(post?.content?.rendered || '', 'Proyección'));
          } catch (postError) {
            errors.push(`Proyección oficial · ${item.title || item.id}: ${postError.message}`);
          }
        }
        return uniqueByKey(collected, fixtureKey);
      } catch (officialError) {
        errors.push(`Programación oficial Proyección: ${officialError.message}`);
        return [];
      }
    }

    // LPF categories
    const lpfCategories = {
      cuarta: { url: `/cuarta-${SEASON}`, name: 'Cuarta' },
      quinta: { url: `/quinta-${SEASON}`, name: 'Quinta' },
      sexta: { url: `/sexta-${SEASON}`, name: 'Sexta' },
      septima: { url: `/septima-${SEASON}`, name: 'Séptima' },
      octava: { url: `/octava-${SEASON}`, name: 'Octava' },
      novena: { url: `/novena-${SEASON}`, name: 'Novena' },
    };

    // Promiedos leagues
    const promiedosLeagues = {
      primera: { url: 'liga-profesional/hc', name: 'Primera' },
      proyeccion: { url: 'liga-profesional---reserva/hhbc', name: 'Proyección' },
      bnacional: { url: 'primera-nacional/ebj', name: 'B Nacional' },
      copa_argentina: { url: 'copa-argentina/gea', name: 'Copa Argentina' },
    };

    const standingsRecords = [];
    const fixtureRecords = [];
    const fixtureExternalKeys = new Set();
    const errors = [];

    // === SCRAPE JUVENILES FROM ligaprofesional.ar ===
    for (const [key, cat] of Object.entries(lpfCategories)) {
      try {
        const html = await fetchPage(`https://www.ligaprofesional.ar${cat.url}`);
        const standings = parseLPFStandings(html);
        const fixtures = parseLPFFixtures(html);

        for (const s of standings) {
          standingsRecords.push({
            competition: cat.name,
            season: SEASON,
            team: s.team,
            position: s.position,
            points: s.points,
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            goalDiff: s.goalDiff,
            group: '',
            lastUpdated: new Date().toISOString().split('T')[0],
          });
        }

        for (const f of fixtures) {
          const matchDate = parseDate(f.date);
          if (f.status === 'scheduled' && matchDate) {
            fixtureRecords.push({
              competition: cat.name,
              category: cat.name,
              season: SEASON,
              homeTeam: f.homeTeam,
              awayTeam: f.awayTeam,
              status: f.status,
              round: f.round,
              matchDate,
              source: 'ligaprofesional.ar',
            });
          }
        }
      } catch (e) {
        errors.push(`${cat.name}: ${e.message}`);
      }
    }

    // === SCRAPE PROFESIONALES FROM promiedos.com.ar ===
    for (const [key, cat] of Object.entries(promiedosLeagues)) {
      try {
        const html = await fetchPage(`https://www.promiedos.com.ar/league/${cat.url}`);
        const nextDataMatch = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
        if (!nextDataMatch) {
          errors.push(`${cat.name}: No __NEXT_DATA__ found`);
          continue;
        }

        const data = JSON.parse(nextDataMatch[1]);
        const pageData = data.props?.pageProps?.data || {};
        const tablesGroups = pageData.tables_groups || [];

        for (const tg of tablesGroups) {
          const phase = tg.name || '';
          for (const table of (tg.tables || [])) {
            const groupName = table.name || '';
            const tableData = table.table || {};
            const rows = tableData.rows || [];

            for (const row of rows) {
              const pos = row.num || 0;
              const entity = row.entity?.object || {};
              const teamName = entity.short_name || entity.name || '';
              const vals = {};
              for (const v of (row.values || [])) vals[v.key] = v.value;

              const goalsStr = String(vals.Goals || '0:0');
              const goalsParts = goalsStr.split(':');
              const gf = goalsParts[0] && !isNaN(parseInt(goalsParts[0])) ? parseInt(goalsParts[0]) : 0;
              const ga = goalsParts[1] && !isNaN(parseInt(goalsParts[1])) ? parseInt(goalsParts[1]) : 0;

              const safeInt = (v) => {
                try { return parseInt(String(v || '0').split(':')[0]) || 0; } catch { return 0; }
              };

              if (!teamName || !pos) continue;

              standingsRecords.push({
                competition: cat.name,
                season: SEASON,
                team: teamName,
                logo_url: providerLogo(entity),
                position: pos,
                points: safeInt(vals.Points),
                played: safeInt(vals.GamePlayed),
                won: safeInt(vals.GamesWon),
                drawn: safeInt(vals.GamesEven),
                lost: safeInt(vals.GamesLost),
                goalsFor: gf,
                goalsAgainst: ga,
                goalDiff: safeInt(vals.Ratio) || (gf - ga),
                group: phase ? `${phase} - ${groupName}` : groupName,
                lastUpdated: new Date().toISOString().split('T')[0],
              });
            }
          }
        }

        // La página embebe una sola fecha. Las fechas vecinas se consultan
        // mediante el endpoint que usa la propia interfaz de Promiedos.
        const filters = Array.isArray(pageData.games?.filters) ? pageData.games.filters : [];
        const embedded = filters.find((filter) => Array.isArray(filter.games) && filter.games.length);
        const currentRoundName = embedded?.games?.[0]?.stage_round_name || embedded?.name || '';
        const matchingRoundIndexes = filters
          .map((filter, index) => ({ filter, index }))
          .filter(({ filter }) => filter.name === currentRoundName)
          .map(({ index }) => index);
        const selectedIndex = matchingRoundIndexes.at(-1) ?? filters.findIndex((filter) => filter.selected);
        const selectedKey = filters[selectedIndex]?.key || '';
        const phasePrefix = selectedKey.split('_').slice(0, 3).join('_');
        const nearbyFilters = filters.filter((filter, index) => {
          if (!filter.key || filter.key === 'latest') return false;
          if (selectedIndex < 0) return Boolean(filter.selected);
          if (phasePrefix && !filter.key.startsWith(`${phasePrefix}_`)) return false;
          return index >= selectedIndex - 4 && index <= selectedIndex + 8;
        });

        const gameGroups = [];
        if (embedded?.games?.length) gameGroups.push(embedded.games);
        for (const filter of nearbyFilters) {
          if (filter.games?.length) {
            gameGroups.push(filter.games);
            continue;
          }
          try {
            const payload = await fetchJson(`https://api.promiedos.com.ar/league/games/${pageData.league?.id || cat.url.split('/').at(-1)}/${filter.key}`);
            if (Array.isArray(payload.games)) gameGroups.push(payload.games);
          } catch (filterError) {
            errors.push(`${cat.name} · ${filter.name}: ${filterError.message}`);
          }
        }

        for (const game of gameGroups.flat()) {
          const teams = game.teams || [];
          if (teams.length < 2 || !game.start_time) continue;
          const externalKey = `promiedos:${cat.name}:${game.id || game.start_time}`;
          if (fixtureExternalKeys.has(externalKey)) continue;
          fixtureExternalKeys.add(externalKey);
          const statusInfo = game.status || {};
          const isPlayed = statusInfo.enum === 3;
          const scores = game.scores || [null, null];
          const [datePart, timePart] = String(game.start_time).split(' ');
          const adjustedSchedule = adjustProviderDateTime(datePart, timePart, providerTimeAdjustmentMinutes);
          const matchDate = adjustedSchedule.matchDate;
          if (!matchDate) continue;
          fixtureRecords.push({
            competition: cat.name,
            category: cat.name,
            season: SEASON,
            homeTeam: teams[0].short_name || teams[0].name || '',
            awayTeam: teams[1].short_name || teams[1].name || '',
            homeLogo: providerLogo(teams[0]),
            awayLogo: providerLogo(teams[1]),
            homeScore: isPlayed ? scores[0] : null,
            awayScore: isPlayed ? scores[1] : null,
            status: isPlayed ? 'played' : 'scheduled',
            round: game.stage_round_name || '',
            matchDate,
            matchTime: adjustedSchedule.matchTime || '',
            external_key: externalKey,
            source: 'promiedos.com.ar',
          });
        }
      } catch (e) {
        errors.push(`${cat.name}: ${e.message}`);
      }
    }

    // === PROGRAMACIÓN OFICIAL LPF ===
    // La programación oficial tiene prioridad para fecha, horario, sede y número de fecha.
    // Promiedos se conserva como apoyo para escudos, resultado y estado del partido.
    const officialProyeccion = await fetchOfficialProyeccionProgramming();
    for (const official of officialProyeccion) {
      const index = fixtureRecords.findIndex((row) => fixtureKey(row) === fixtureKey(official));
      if (index >= 0) {
        fixtureRecords[index] = {
          ...fixtureRecords[index],
          matchDate: official.matchDate,
          matchTime: official.matchTime,
          venue: official.venue || fixtureRecords[index].venue || '',
          round: official.round || fixtureRecords[index].round || '',
          source: 'lpf_programacion_oficial',
        };
      } else {
        fixtureRecords.push(official);
      }
    }

    const uniqueStandings = uniqueByKey(standingsRecords, standingKey);
    const uniqueFixtures = uniqueByKey(fixtureRecords, fixtureKey);

    // === SAFE UPSERT + REPARACIÓN DE DUPLICADOS ===
    const [existingStandings, existingFixtures] = await Promise.all([
      service.Standings.filter({ season: SEASON }, '-updated_date', 2000),
      service.UpcomingMatch.filter({ season: SEASON }, 'matchDate', 5000),
    ]);

    let deletedDuplicates = 0;
    deletedDuplicates += await removeDuplicateRows(service.Standings, existingStandings, standingKey);
    deletedDuplicates += await removeDuplicateRows(service.UpcomingMatch, existingFixtures, fixtureKey, pickCanonicalFixture);

    const cleanExistingStandings = uniqueByKey(existingStandings, standingKey);
    const cleanExistingFixtures = uniqueByKey(existingFixtures, fixtureKey);
    const standingByKey = new Map(cleanExistingStandings.map((row) => [standingKey(row), row]));
    const standingCreates = [];
    const standingUpdates = [];
    const standingFields = ['position', 'points', 'played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'goalDiff', 'logo_url'];
    for (const record of uniqueStandings) {
      const current = standingByKey.get(standingKey(record));
      if (!current) {
        standingCreates.push(record);
        standingByKey.set(standingKey(record), record);
      } else if (changed(current, record, standingFields)) {
        standingUpdates.push({ id: current.id, payload: record });
      }
    }

    const fixtureByExternal = new Map(cleanExistingFixtures.filter((row) => row.external_key).map((row) => [row.external_key, row]));
    const fixtureByNatural = new Map(cleanExistingFixtures.map((row) => [fixtureKey(row), row]));
    const fixtureCreates = [];
    const fixtureUpdates = [];
    const fixtureFields = ['matchTime', 'venue', 'round', 'status', 'homeScore', 'awayScore', 'homeLogo', 'awayLogo'];
    for (const record of uniqueFixtures) {
      const current = fixtureByExternal.get(record.external_key) || fixtureByNatural.get(fixtureKey(record));
      if (!current) {
        fixtureCreates.push(record);
        fixtureByNatural.set(fixtureKey(record), record);
        if (record.external_key) fixtureByExternal.set(record.external_key, record);
      } else {
        const preserveOfficialSchedule = current.source === 'lpf_programacion_oficial' || current.source === 'manual';
        const merged = {
          ...record,
          source: preserveOfficialSchedule ? current.source : record.source,
          venue: preserveOfficialSchedule ? (current.venue || record.venue) : (record.venue || current.venue),
          matchTime: preserveOfficialSchedule ? (current.matchTime || record.matchTime) : (record.matchTime || current.matchTime),
          external_key: current.external_key || record.external_key,
        };
        if (changed(current, merged, fixtureFields)) fixtureUpdates.push({ id: current.id, payload: merged });
      }
    }

    await bulkCreate(service.Standings, standingCreates);
    await bulkCreate(service.UpcomingMatch, fixtureCreates);
    for (const item of standingUpdates) await service.Standings.update(item.id, item.payload);
    for (const item of fixtureUpdates) await service.UpcomingMatch.update(item.id, item.payload);

    // Segunda pasada: protege contra dos sincronizaciones que hayan arrancado casi al mismo tiempo.
    const [standingsAfterWrite, fixturesAfterWrite] = await Promise.all([
      service.Standings.filter({ season: SEASON }, '-updated_date', 3000).catch(() => []),
      service.UpcomingMatch.filter({ season: SEASON }, '-updated_date', 6000).catch(() => []),
    ]);
    deletedDuplicates += await removeDuplicateRows(service.Standings, standingsAfterWrite, standingKey);
    deletedDuplicates += await removeDuplicateRows(service.UpcomingMatch, fixturesAfterWrite, fixtureKey, pickCanonicalFixture);

    const finishedAt = new Date().toISOString();
    const summary = {
      standings: {
        received: standingsRecords.length,
        unique: uniqueStandings.length,
        created: standingCreates.length,
        updated: standingUpdates.length,
      },
      fixtures: {
        received: fixtureRecords.length,
        unique: uniqueFixtures.length,
        official_schedule_rows: officialProyeccion.length,
        created: fixtureCreates.length,
        updated: fixtureUpdates.length,
      },
      deleted_duplicates: deletedDuplicates,
      errors: errors.length > 0 ? errors : undefined,
    };
    const stateRows = await service.CompetitionSyncState.filter({ key: SYNC_KEY }, '-updated_date', 1).catch(() => []);
    await upsertSyncState(service, stateRows?.[0] || syncState, {
      season: SEASON,
      status: errors.length ? 'success' : 'success',
      last_success_at: finishedAt,
      last_error: '',
      last_summary: JSON.stringify(summary).slice(0, 5000),
    });

    return Response.json({
      success: true,
      season: SEASON,
      started_at: startedAt,
      finished_at: finishedAt,
      summary,
    });
  } catch (error) {
    try {
      if (service) {
        const stateRows = await service.CompetitionSyncState.filter({ key: SYNC_KEY }, '-updated_date', 1).catch(() => []);
        await upsertSyncState(service, stateRows?.[0] || syncState, {
          status: 'error',
          last_error_at: new Date().toISOString(),
          last_error: error?.message || 'Error de sincronización',
        });
      }
    } catch (_stateError) {
      // No ocultar el error original si además falla el registro de estado.
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}