import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { trackDemoEvent } from '@/lib/demoAnalytics';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [ingresarOpen, setIngresarOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    if (id === 'contacto') trackDemoEvent('meeting_click', { placement: 'navigation' });
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={18} className="text-white" />
          </span>
          <span className="text-white font-bold text-lg tracking-tight">
            Performance<span className="text-blue-400">Pitch</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-300">
          <a href="#propuesta" onClick={scrollTo('propuesta')} className="hover:text-white transition-colors">Plataforma</a>
          <a href="#integraciones" onClick={scrollTo('integraciones')} className="hover:text-white transition-colors">Integraciones</a>
          <a href="#areas" onClick={scrollTo('areas')} className="hover:text-white transition-colors">Áreas</a>
          <a href="#datos" onClick={scrollTo('datos')} className="hover:text-white transition-colors">Datos</a>
          <a href="#beneficios" onClick={scrollTo('beneficios')} className="hover:text-white transition-colors">Beneficios</a>
          <a href="#cotizacion" onClick={scrollTo('cotizacion')} className="hover:text-white transition-colors">Cotización</a>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/demo/registro"
            onClick={() => trackDemoEvent("demo_cta_click", { placement: "navigation" })}
            className="hidden sm:inline-flex items-center h-9 px-4 rounded-lg text-sm font-semibold text-white border border-white/10 hover:bg-white/5 transition-colors"
          >
            Probar demo
          </Link>
          <div className="relative">
            <button
              onClick={() => setIngresarOpen(v => !v)}
              onBlur={() => setTimeout(() => setIngresarOpen(false), 150)}
              className="inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Ya soy usuario
            </button>
            {ingresarOpen && (
              <div className="absolute right-0 top-11 w-56 rounded-xl border border-white/10 bg-zinc-900 shadow-xl shadow-black/40 p-1.5 z-50">
                <Link to="/login?access=staff" className="block px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <p className="text-sm font-semibold text-white">Staff / Club</p>
                  <p className="text-xs text-zinc-500">Ingresar al software</p>
                </Link>
                <Link to="/login?access=player" className="block px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <p className="text-sm font-semibold text-white">Jugador</p>
                  <p className="text-xs text-zinc-500">Ingresar al portal del jugador</p>
                </Link>
              </div>
            )}
          </div>
          <a
            href="#contacto"
            onClick={scrollTo('contacto')}
            className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/20"
          >
            Solicitar una reunión
          </a>
        </div>
      </nav>
    </header>
  );
}