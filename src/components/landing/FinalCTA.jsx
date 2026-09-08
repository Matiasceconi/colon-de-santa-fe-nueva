import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, MessageCircle, ArrowRight } from 'lucide-react';
import LandingFooter from './LandingFooter';
import { trackDemoEvent } from '@/lib/demoAnalytics';

export default function FinalCTA() {
  return (
    <section id="contacto" className="pt-20 sm:pt-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 rounded-full blur-[140px]" />
      </div>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-8 sm:p-14 text-center overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
              La tecnología debe adaptarse al club.
              <br />
              <span className="text-blue-400">No el club a la tecnología.</span>
            </h2>
            <p className="mt-6 text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
              Conocé cómo PerformancePitch puede adaptarse a la estructura y las necesidades de tu institución.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/demo/registro"
                onClick={() => trackDemoEvent("demo_cta_click", { placement: "final_cta" })}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-xl shadow-blue-600/25"
              >
                <Play size={18} className="fill-white" />
                Probar demo
                <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="https://wa.me/5491122679347?text=Hola%2C%20quiero%20conocer%20PerformancePitch%20para%20mi%20club."
                onClick={() => trackDemoEvent("whatsapp_click", { placement: "final_cta" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors shadow-xl shadow-emerald-500/20"
              >
                <MessageCircle size={18} />
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </motion.div>
      </div>
      <LandingFooter />
    </section>
  );
}