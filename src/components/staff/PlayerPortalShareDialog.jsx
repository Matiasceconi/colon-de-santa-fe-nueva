import React, { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, MessageCircle, Send, X } from "lucide-react";
import { usePublicClubBrand } from "@/hooks/usePublicClubBrand";

export default function PlayerPortalShareDialog({ player, onClose }) {
  const { brand } = usePublicClubBrand();
  const [copied, setCopied] = useState("");
  const portalUrl = `${window.location.origin}/ingreso-jugador`;
  const playerName = player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Jugador";

  const message = useMemo(() => (
    `Hola ${player?.first_name || playerName}. Este es tu acceso al Portal del Jugador de ${brand.club_name}.\n\n` +
    `Ingresá con tu DNI, sin puntos ni espacios: ${portalUrl}\n\n` +
    "Desde allí vas a poder ver el cronograma del día, completar el Wellness y responder el RPE cuando esté disponible."
  ), [brand.club_name, player?.first_name, playerName, portalUrl]);

  async function copy(value, type) {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1800);
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy(message, "message");
      return;
    }
    await navigator.share({ title: `Portal de ${playerName}`, text: message });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800 p-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400"><Check size={14} /> Acceso preparado</p>
            <h2 className="mt-1 text-xl font-black text-white">{playerName}</h2>
            <p className="mt-1 text-sm text-zinc-500">Compartí el portal. El jugador ingresará allí con su propio DNI.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Cerrar"><X size={17} /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Enlace del portal</p>
            <p className="mt-2 break-all font-mono text-xs text-zinc-300">{portalUrl}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => copy(portalUrl, "link")} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-700">
              {copied === "link" ? <Check size={16} className="text-emerald-400" /> : <Link2 size={16} />} {copied === "link" ? "Enlace copiado" : "Copiar enlace"}
            </button>
            <button onClick={() => copy(message, "message")} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-700">
              {copied === "message" ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />} {copied === "message" ? "Mensaje copiado" : "Copiar mensaje"}
            </button>
            <button onClick={openWhatsApp} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500">
              <MessageCircle size={17} /> Enviar por WhatsApp
            </button>
            <button onClick={nativeShare} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500">
              <Send size={16} /> Compartir
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100/70">
            El DNI no se incluye en el enlace ni en el mensaje. El jugador lo escribe dentro del portal para evitar exponerlo en WhatsApp o en la URL.
          </div>

          <a href={portalUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-white">
            Probar el portal en otra pestaña <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
