import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Map as MapIcon, RotateCcw, Move, Users, HeartPulse, Activity, UserX } from "lucide-react";
import { createBrandedPdf, buildExportFileName } from "@/lib/exports/pdfExportKit";
import { assertExportAllowed } from "@/lib/exports/exportSecurity";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { buildDayMap } from "./dayMapUtils";

// Convierte una URL de imagen a data URL para embeber en el SVG exportado.
async function urlToDataUrl(url) {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SessionDayMap({ players, playerPhotos = {}, session = {} }) {
  const { clubBrand, can } = useWorkspace();
  const { toast } = useToast();
  const map = useMemo(() => buildDayMap(players), [players]);
  const svgRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [dragId, setDragId] = useState(null);
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());

  // Si cambia la sesión (otro día, otro plantel), las posiciones movidas a mano
  // no deben quedar pegadas de una sesión a otra.
  useEffect(() => { setOverrides({}); }, [session?.id]);

  const date = session.date ? session.date.slice(0,10).split("-").reverse().join("/") : "Sin fecha";
  const label = [session.name || session.title || (session.session_number ? "Sesión " + session.session_number : "Sesión"), session.squad_name, date].filter(Boolean).join(" · ");
  const logoUrl = clubBrand?.logoUrl || "";

  // Precompute player positions with manual overrides applied
  const renderedPlayers = useMemo(() => {
    const arr = [];
    map.bands.forEach((band, bi) => band.zones.forEach(([name, col], zi) => {
      const list = map.groups[name];
      const x = 50 + col * 300;
      list.forEach((p, i) => {
        const key = p.player_id || p.id;
        const baseCx = x + 22, baseCy = band.y + 52 + i * 42;
        const ov = overrides[key];
        arr.push({
          p, key, name,
          cx: ov ? ov.x : baseCx,
          cy: ov ? ov.y : baseCy,
          bi, zi, i,
          clipId: `clip-${bi}-${zi}-${i}`,
        });
      });
    }));
    return arr;
  }, [map, overrides]);

  async function exportMap(format) {
    setBusy(true);
    let url;
    try {
      assertExportAllowed(can,"/sessions");
      const svg = svgRef.current.cloneNode(true);
      svg.setAttribute("width", "960");
      svg.setAttribute("height", String(map.height));

      if (logoUrl) {
        const shieldDataUrl = await urlToDataUrl(logoUrl);
        const shieldImg = svg.querySelector("#day-map-shield");
        if (shieldDataUrl && shieldImg) {
          shieldImg.setAttribute("href", shieldDataUrl);
        } else if (shieldImg) {
          shieldImg.remove();
        }
      }

      const playerImages = svg.querySelectorAll("image.player-photo");
      await Promise.all(Array.from(playerImages).map(async (img) => {
        const src = img.getAttribute("href") || img.getAttribute("xlink:href");
        if (src && !src.startsWith("data:")) {
          const dataUrl = await urlToDataUrl(src);
          if (dataUrl) {
            img.setAttribute("href", dataUrl);
          } else {
            img.removeAttribute("href");
          }
        }
      }));

      url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], {type:"image/svg+xml;charset=utf-8"}));
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("No se pudo generar la imagen")); img.src = url; });
      const canvas = document.createElement("canvas");
      canvas.width = 1920; canvas.height = map.height * 2;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const filename = ("mapa-del-dia-" + (session.date || "sesion") + "-" + (session.squad_name || session.id || "")).replace(/[^a-zA-Z0-9_-]/g,"-");
      if (format === "pdf") {
        const pdf=await createBrandedPdf({brand:clubBrand,title:"Mapa del día",subtitle:label});
        pdf.image(canvas.toDataURL("image/png"),{width:186,height:Math.min(205,186*map.height/960)});
        pdf.sectionTitle("Detalle completo de grupos");
        for(const [name,group] of [...Object.entries(map.groups),["Sin posición",map.unknown],["Diferenciado",map.diferenciados],["Kinesiología",map.kinesiologia]]){
          if(!group?.length)continue;
          pdf.sectionTitle(name);
          pdf.table({columns:[{key:"player_name",label:"Jugador",value:p=>p.player_name||p.full_name||"Jugador"},{key:"position",label:"Posición"}],rows:group});
        }
        pdf.finalize().save(buildExportFileName("Mapa_del_dia",[clubBrand?.name,session.squad_name,session.date]));
      } else {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("No se pudo exportar la imagen");
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = downloadUrl; a.download = filename + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
      }
    } catch (error) {
      toast({title:"No se pudo exportar el mapa",description:error.message,variant:"destructive"});
    } finally { if (url) URL.revokeObjectURL(url); setBusy(false); }
  }

  // --- Drag to reposition ---
  function svgPointFromEvent(clientX, clientY) {
    if (!svgRef.current) return null;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  function startDrag(e, key) {
    e.preventDefault();
    e.stopPropagation();
    setDragId(key);
  }

  function handleMouseMove(e) {
    if (!dragId) return;
    const svgP = svgPointFromEvent(e.clientX, e.clientY);
    if (!svgP) return;
    const x = Math.max(25, Math.min(935, svgP.x));
    const y = Math.max(125, Math.min(map.pitchBottom - 5, svgP.y));
    setOverrides(prev => ({ ...prev, [dragId]: { x, y } }));
  }

  function handleTouchMove(e) {
    if (!dragId || !e.touches[0]) return;
    e.preventDefault();
    const svgP = svgPointFromEvent(e.touches[0].clientX, e.touches[0].clientY);
    if (!svgP) return;
    const x = Math.max(25, Math.min(935, svgP.x));
    const y = Math.max(125, Math.min(map.pitchBottom - 5, svgP.y));
    setOverrides(prev => ({ ...prev, [dragId]: { x, y } }));
  }

  function endDrag() { setDragId(null); }

  function resetPositions() {
    setOverrides({});
    toast({ title: "Posiciones restablecidas" });
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  return <section className="rounded-2xl border border-emerald-700/50 bg-zinc-950 p-4 space-y-4 text-zinc-100">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-white"><MapIcon size={20} className="text-emerald-300"/>Mapa del día</h3>
        <p className="text-sm text-zinc-300">Quién trabaja con el equipo, quién hace diferenciado y quién está en kinesiología.</p>
      </div>
      <div className="flex gap-2">
        {hasOverrides && (
          <button onClick={resetPositions} className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700">
            <RotateCcw size={15}/> Restablecer
          </button>
        )}
        {["png","pdf"].map(format => <button key={format} onClick={() => exportMap(format)} disabled={busy || !map.count}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40"><Download size={15}/>{busy ? "Exportando…" : format.toUpperCase()}</button>)}
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <StatusSummary icon={Users} label="Con el equipo" value={map.count} tone="text-emerald-300" />
      <StatusSummary icon={Activity} label="Diferenciado" value={map.diferenciados.length} tone="text-amber-300" />
      <StatusSummary icon={HeartPulse} label="Kinesiología" value={map.kinesiologia.length} tone="text-sky-300" />
      <StatusSummary icon={UserX} label="No entrenan" value={map.excluded.length} tone="text-zinc-300" />
    </div>
    <p className="text-xs text-zinc-300">La cancha muestra solamente a quienes trabajan con el equipo, distribuidos por su posición registrada. No representa un once titular. Ataque hacia arriba.</p>
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/>Con el equipo</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-300"/>Estado previo a revisar</span>
      <span className="flex items-center gap-1.5 text-emerald-400/80"><Move size={12}/> Arrastrá para reposicionar</span>
    </div>
    {!map.count && <p role="status" className="rounded-lg bg-zinc-800 p-4 text-zinc-200">No hay jugadores asignados a trabajo con el equipo. Revisá Diferenciado, Kinesiología y la asistencia debajo.</p>}
    <div className="overflow-x-auto rounded-xl border border-emerald-800">
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 960 ${map.height}`} className="w-full min-w-[680px]" role="img" aria-label={`Mapa del día: ${map.count} jugadores disponibles. ${label}`}
        style={{fontFamily:"Arial, sans-serif", touchAction: "none"}}
        onMouseMove={handleMouseMove} onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchMove={handleTouchMove} onTouchEnd={endDrag}>
        <defs>
          {logoUrl && (
            <clipPath id="day-map-shield-clip"><circle cx="48" cy="32" r="18"/></clipPath>
          )}
          {renderedPlayers.map(rp => (
            <clipPath key={rp.clipId} id={rp.clipId}><circle cx={rp.cx} cy={rp.cy} r="18"/></clipPath>
          ))}
        </defs>
        <rect width="960" height={map.height} fill="#071b16"/>
        {logoUrl && (
          <image id="day-map-shield" href={logoUrl} x="30" y="14" width="36" height="36" clipPath="url(#day-map-shield-clip)" preserveAspectRatio="xMidYMid slice"/>
        )}
        <text x={logoUrl ? "76" : "30"} y="30" fill="#6ee7b7" fontSize="14">{clubBrand?.name || clubBrand?.shortName || "Plantel"}</text>
        <text x={logoUrl ? "76" : "30"} y="54" fill="#ffffff" fontSize="22" fontWeight="700">MAPA DEL DÍA</text>
        <text x="30" y="84" fill="#d1fae5" fontSize="14">{label.slice(0,110)}</text>
        <text x="930" y="30" fill="#ffffff" fontSize="16" textAnchor="end">{map.count} con el equipo</text>
        <rect x="20" y="115" width="920" height={map.pitchBottom-115} fill="#125b40" rx="4"/>
        {map.bands.filter((_,i)=>i%2===0).map(b=><rect key={b.y} x="21" y={b.y} width="918" height={b.height} fill="#17694b"/>)}
        <g fill="none" stroke="#a7f3d0" strokeWidth="2" opacity="0.7">
          <rect x="30" y="124" width="900" height={map.pitchBottom-134}/>
          <path d={`M30 ${(124+map.pitchBottom-10)/2}H930`}/>
          <circle cx="480" cy={(124+map.pitchBottom-10)/2} r="64"/>
          <rect x="300" y="124" width="360" height="75"/>
          <rect x="390" y="124" width="180" height="28"/>
          <rect x="300" y={map.pitchBottom-85} width="360" height="75"/>
          <rect x="390" y={map.pitchBottom-38} width="180" height="28"/>
        </g>
        {/* Band boxes */}
        {map.bands.flatMap((band, bi) => band.zones.map(([name, col], zi) => {
          const list = map.groups[name], x = 50 + col * 300;
          return <g key={`box-${name}`}>
            <rect x={x} y={band.y} width="260" height={Math.max(78,52+list.length*42)} rx="10" fill="#082e25" fillOpacity="0.94" stroke="#4d9d7e"/>
            <text x={x+130} y={band.y+24} textAnchor="middle" fill="#a7f3d0" fontSize="14" fontWeight="700">{name} · {list.length}</text>
            {!list.length && <text x={x+130} y={band.y+52} textAnchor="middle" fill="#d1d5db" fontSize="13">Sin jugadores</text>}
          </g>;
        }))}
        {/* Players (draggable) */}
        {renderedPlayers.map(rp => {
          const { p, key, cx, cy, clipId } = rp;
          const photoUrl = p.photo_url || playerPhotos[p.player_id] || p.player_photo_url;
          const isWarn = p._warning;
          const dotColor = isWarn ? "#fcd34d" : "#6ee7b7";
          const isDragging = dragId === key;
          return <g key={key}>
            {photoUrl && !failedPhotos.has(key) ? (
              <image className="player-photo" href={photoUrl} x={cx-18} y={cy-18} width="36" height="36" clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" pointerEvents="none" onError={() => setFailedPhotos(prev => new Set(prev).add(key))}/>
            ) : (
              <>
                <circle cx={cx} cy={cy} r="18" fill="#374151" pointerEvents="none"/>
                <text x={cx} y={cy+5} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" pointerEvents="none">{getInitials(p.player_name)}</text>
              </>
            )}
            <circle cx={cx+13} cy={cy-13} r="4" fill={dotColor} stroke="#071b16" strokeWidth="1" pointerEvents="none"/>
            <text x={cx+24} y={cy+5} fill="#ffffff" fontSize={(p.player_name || "").length > 22 ? "14" : "16"} fontWeight="600" pointerEvents="none"><title>{p.player_name} · {p.status_at_session || "Disponible"}</title>{p.player_name || "Sin nombre"}</text>
            <circle cx={cx} cy={cy} r="22" fill="transparent" style={{ cursor: isDragging ? "grabbing" : "grab" }} onMouseDown={(e) => startDrag(e, key)} onTouchStart={(e) => startDrag(e, key)}/>
          </g>;
        })}
        <text x="30" y={map.pitchBottom+25} fill="#d1fae5" fontSize="12">Verde: con el equipo · Amarillo: estado previo que merece revisión · Diferenciado y kinesiología se detallan debajo</text>
        <text x="30" y={map.pitchBottom+49} fill="#ffffff" fontSize="13">Con el equipo sin posición reconocida: {map.unknown.length}</text>
        {map.unknown.map((p,i)=><text key={p.player_id || p.id || i} x="30" y={map.pitchBottom+73+i*26} fill="#e5e7eb" fontSize="13">{p.player_name} · {p.position || "Sin posición"}</text>)}
        <text x="30" y={map.pitchBottom+map.diferenciadosHeaderY} fill="#fbbf24" fontSize="13" fontWeight="700">Diferenciado ({map.diferenciados.length}):</text>
        {map.diferenciadosLines.map((line, i) => (
          <text key={`dif-line-${i}`} x="30" y={map.pitchBottom+map.diferenciadosHeaderY+24+i*22} fill="#fde68a" fontSize="12">{line}</text>
        ))}
        <text x="30" y={map.pitchBottom+map.kinesiologiaHeaderY} fill="#7dd3fc" fontSize="13" fontWeight="700">Kinesiología ({map.kinesiologia.length}):</text>
        {map.kinesiologiaLines.map((line, i) => (
          <text key={`kin-line-${i}`} x="30" y={map.pitchBottom+map.kinesiologiaHeaderY+24+i*22} fill="#bae6fd" fontSize="12">{line}</text>
        ))}
      </svg>
    </div>
    <div className="grid lg:grid-cols-2 gap-3">
      <PlayerWorkGroup title="Trabajo diferenciado" tone="amber" players={map.diferenciados} playerPhotos={playerPhotos} empty="Sin jugadores en trabajo diferenciado." />
      <PlayerWorkGroup title="Kinesiología" tone="sky" players={map.kinesiologia} playerPhotos={playerPhotos} empty="Sin jugadores trabajando en kinesiología." />
    </div>
    {map.excluded.length > 0 && (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">No entrenan / ausentes ({map.excluded.length})</p>
        <p className="text-xs text-zinc-400">{map.excluded.map(p => p.player_name).filter(Boolean).join(" · ")}</p>
      </div>
    )}
    <p className="text-xs text-zinc-400">El trabajo del día se determina por la asistencia de la sesión. El estado previo queda como contexto y no cambia automáticamente la asignación que definió el staff.</p>
  </section>;
}

function StatusSummary({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500"><Icon size={11} />{label}</div>
      <p className={`mt-0.5 text-xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

function PlayerWorkGroup({ title, tone, players, playerPhotos, empty }) {
  const styles = tone === "sky"
    ? { box: "border-sky-600/35 bg-sky-500/5", title: "text-sky-300", chip: "border-sky-700/30" }
    : { box: "border-amber-600/35 bg-amber-500/5", title: "text-amber-300", chip: "border-amber-700/30" };
  return (
    <div className={`rounded-xl border p-3 ${styles.box}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${styles.title}`}>{title} ({players.length})</p>
      {players.length === 0 ? (
        <p className="text-xs text-zinc-600">{empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {players.map((p) => (
            <div key={p.player_id || p.id} className={`flex items-center gap-2 rounded-lg bg-zinc-900/70 border px-2.5 py-2 ${styles.chip}`}>
              <PlayerAvatar player={{ id: p.player_id, full_name: p.player_name, photo_url: p.photo_url || playerPhotos[p.player_id] }} size="sm" className="min-w-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-100">{p.player_name}</p>
                <p className="truncate text-[9px] text-zinc-500">{p.position || "Sin posición"}{p.status_at_session ? ` · ${p.status_at_session}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}