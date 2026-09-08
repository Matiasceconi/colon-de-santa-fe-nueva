import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_LAYOUT, SIZE_CLASSES, DASHBOARD_LAYOUT_VERSION } from "@/lib/dashboardWidgets";
import WidgetRenderer from "@/components/dashboard/WidgetRenderer";
import WidgetWrapper from "@/components/dashboard/WidgetWrapper";
import WidgetPicker from "@/components/dashboard/WidgetPicker";
import MatchDayPriorityBanner from "@/components/dashboard/MatchDayPriorityBanner";
import { Pencil, Plus, Check, RotateCcw, Loader2, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function DashboardBoard({
  dashboardType = "club",
  title = "Tablero del Club",
  subtitle = "Información prioritaria organizada para tomar decisiones.",
  defaultLayout = DEFAULT_LAYOUT,
  categories,
  layoutVersion = DASHBOARD_LAYOUT_VERSION,
}) {
  const { user } = useAuth();
  const { clubBrand, activeSquad } = useWorkspace();
  const [layout, setLayout] = useState(null);
  const [layoutId, setLayoutId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadLayout() {
      try {
        const existing = await base44.entities.DashboardLayout.list("-updated_date", 50);
        const matching = existing.find((item) => item.dashboard_type === dashboardType);
        const legacyClubLayout = dashboardType === "club" ? existing.find((item) => !item.dashboard_type) : null;
        const savedLayout = matching || legacyClubLayout;
        if (savedLayout) {
          const storedVersion = Number(savedLayout.layout_version || 0);
          const needsMigration = storedVersion < layoutVersion;
          const personalWidgets = (savedLayout.widgets || []).filter((widget) => ["note", "counter"].includes(widget.type));
          const defaultIds = new Set(defaultLayout.map((widget) => widget.id));
          const migratedPersonal = personalWidgets.map((widget, index) => (
            defaultIds.has(widget.id) ? { ...widget, id: "personal_" + Date.now() + "_" + index } : widget
          ));
          const nextWidgets = needsMigration ? [...defaultLayout, ...migratedPersonal] : (savedLayout.widgets || defaultLayout);
          setLayout(nextWidgets);
          setLayoutId(savedLayout.id);
          if (needsMigration || legacyClubLayout) {
            await base44.entities.DashboardLayout.update(savedLayout.id, {
              dashboard_type: dashboardType,
              layout_version: layoutVersion,
              widgets: nextWidgets,
            });
          }
        } else {
          const created = await base44.entities.DashboardLayout.create({
            user_id: user?.id || "me",
            dashboard_type: dashboardType,
            layout_version: layoutVersion,
            widgets: defaultLayout,
          });
          setLayout(defaultLayout);
          setLayoutId(created.id);
        }
      } catch (e) {
        console.error("layout load error", e);
        setLayout(defaultLayout);
      }
    }
    if (user) loadLayout();
  }, [user, dashboardType, defaultLayout, layoutVersion]);

  const saveLayout = useCallback(
    async (newWidgets) => {
      if (!layoutId) return;
      setSaving(true);
      try {
        await base44.entities.DashboardLayout.update(layoutId, { widgets: newWidgets });
      } catch (e) {
        console.error("layout save error", e);
      } finally {
        setSaving(false);
      }
    },
    [layoutId]
  );

  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const newWidgets = [...layout];
    const [moved] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, moved);
    setLayout(newWidgets);
    saveLayout(newWidgets);
  };

  const handleAdd = (widget) => {
    const newWidgets = [...layout, widget];
    setLayout(newWidgets);
    setShowPicker(false);
    saveLayout(newWidgets);
  };

  const handleRemove = (id) => {
    const newWidgets = layout.filter((w) => w.id !== id);
    setLayout(newWidgets);
    saveLayout(newWidgets);
  };

  const handleResize = (id, size) => {
    const newWidgets = layout.map((w) => (w.id === id ? { ...w, size } : w));
    setLayout(newWidgets);
    saveLayout(newWidgets);
  };

  const handleConfigChange = (id, config) => {
    const newWidgets = layout.map((w) => (w.id === id ? { ...w, config } : w));
    setLayout(newWidgets);
    saveLayout(newWidgets);
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    saveLayout(defaultLayout);
  };

  if (!layout) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-16 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
          <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 12% 0%, var(--club-primary), transparent 42%)" }} />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-xl">
              {clubBrand?.logoUrl ? <img src={clubBrand.logoUrl} alt="" className="h-12 w-12 object-contain" /> : <ShieldCheck size={25} className="text-zinc-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{clubBrand?.name || "Club"} · {activeSquad?.name || "Todos los planteles"}</p>
              <h1 data-tour="dashboard-title" className="mt-1 flex items-center gap-2 truncate text-2xl font-black tracking-tight text-white">
                {title}
                {saving && <Loader2 size={14} className="animate-spin text-zinc-500" />}
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            {isEditing && (
              <button onClick={resetLayout} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white">
                <RotateCcw size={13} /> Restablecer
              </button>
            )}
            <button
              data-tour="dashboard-edit"
              onClick={() => setIsEditing(!isEditing)}
              className={"flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition " + (isEditing ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-white/10 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1]")}
            >
              {isEditing ? <><Check size={14} /> Listo</> : <><Pencil size={14} /> Personalizar</>}
            </button>
          </div>
        </div>
      </div>

      <MatchDayPriorityBanner dashboardType={dashboardType} />

      {isEditing && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-center gap-2">
          <Pencil size={13} className="shrink-0" />
          Modo edición: arrastrá los widgets para reordenarlos, cambiá su tamaño con el ícono de maximizar, o quitálos con la papelera.
        </div>
      )}

      {/* Widgets grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="vertical" isDropDisabled={!isEditing}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-tour="dashboard-widgets"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto"
            >
              {layout.map((widget, index) => {
                const sizeClass = SIZE_CLASSES[widget.size] || "lg:col-span-2";
                const content = (
                  <WidgetRenderer
                    widget={widget}
                    onConfigChange={(config) => handleConfigChange(widget.id, config)}
                  />
                );

                if (!isEditing) {
                  return (
                    <div key={widget.id} className={sizeClass}>
                      {content}
                    </div>
                  );
                }

                return (
                  <Draggable key={widget.id} draggableId={widget.id} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={sizeClass}
                      >
                        <WidgetWrapper
                          widget={widget}
                          isEditing={isEditing}
                          dragHandleProps={dragProvided.dragHandleProps}
                          onRemove={() => handleRemove(widget.id)}
                          onResize={(size) => handleResize(widget.id, size)}
                        >
                          {content}
                        </WidgetWrapper>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {isEditing && (
                <div className="lg:col-span-4 sm:col-span-2">
                  <button
                    onClick={() => setShowPicker(true)}
                    className="w-full border-2 border-dashed border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl py-6 flex items-center justify-center gap-2 text-zinc-400 hover:text-blue-400 transition-colors"
                  >
                    <Plus size={18} /> Agregar Widget
                  </button>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showPicker && <WidgetPicker onClose={() => setShowPicker(false)} onAdd={handleAdd} categories={categories} />}
    </div>
  );
}