import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/storage";
import { getHeatStatus } from "@/lib/heat";
import { useSize } from "@/hooks/use-size";
import { Github, Zap, Trash2, Clock, Flame, Target, Pencil, Plus } from "lucide-react";
import EditProjectModal from "@/components/EditProjectModal";
import { MAX_PROJECTS } from "@/components/AddProjectModal";

const TILE = 200;
const GAP = 48;
const STEP = TILE + GAP;
const DESIGN_W = 1100;
const DESIGN_H = 700;

// 8 slots, 4 x 2, centered on the plane origin.
const SLOTS = Array.from({ length: MAX_PROJECTS }, (_, i) => ({
  x: (i % 4 - 1.5) * STEP,
  y: (Math.floor(i / 4) - 0.5) * STEP,
}));

function OrbitTile({ project, slot, index, hovered, onHoverChange, onTouch, onFocusToggle, onDelete, onEditOpen }) {
  const heat = getHeatStatus(project.last_touched);
  const accentColor = project.color || "#8B5CF6";
  const isTouchedToday = heat.days === 0;
  const [touching, setTouching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleTouch = async (e) => {
    e.stopPropagation();
    setTouching(true);
    const now = new Date().toISOString();
    const newStreak = heat.days <= 1 ? (project.streak || 0) + 1 : 1;
    await db.entities.Project.update(project.id, {
      last_touched: now,
      touch_count: (project.touch_count || 0) + 1,
      streak: newStreak,
    });
    onTouch(project.id, now, newStreak);
    setTouching(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    await db.entities.Project.delete(project.id);
    onDelete(project.id);
  };

  const lift = (project.is_focused ? 64 : 0) + (hovered ? 48 : 0);
  const raised = hovered || project.is_focused;

  return (
    <div
      className="orbit-slot"
      style={{
        left: "50%",
        top: "50%",
        width: TILE,
        height: TILE,
        marginLeft: -TILE / 2,
        marginTop: -TILE / 2,
        transform: `translate3d(${slot.x}px, ${slot.y}px, 0)`,
      }}
    >
      <div className="orbit-counter">
        <div
          className="orbit-shadow"
          style={{
            opacity: raised ? 0.28 : 0.55,
            transform: `translateZ(1px) scale(${raised ? 0.9 : 1})`,
          }}
        />
        <div
          className="orbit-bob"
          style={{ "--bob-duration": `${5.5 + (index % 4) * 0.9}s`, "--bob-delay": `${-index * 0.85}s` }}
        >
          <div
            className="orbit-lift"
            style={{ "--lift": `${lift}px`, "--lift-scale": hovered ? 1.05 : 1 }}
            onMouseEnter={() => onHoverChange(project.id, true)}
            onMouseLeave={() => onHoverChange(project.id, false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: index * 0.06 }}
              className="group relative w-full h-full rounded-3xl border p-4 flex flex-col overflow-hidden"
              style={{
                background: "linear-gradient(160deg, hsl(250 22% 13%) 0%, hsl(250 25% 8%) 100%)",
                borderColor: project.is_focused ? accentColor : "hsl(250 16% 20%)",
                boxShadow: project.is_focused
                  ? `0 0 34px ${accentColor}45, 0 0 80px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.06)`
                  : hovered
                    ? `0 0 28px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : "inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Accent edge */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accentColor, opacity: 0.85 }} />

              {/* Status badge */}
              {project.is_focused ? (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                  style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                  FOCUSED
                </div>
              ) : heat.days >= 2 ? (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  ⚠ COLD
                </div>
              ) : null}

              {/* Name + description */}
              <div className="mt-2 pr-10">
                <h3 className="font-heading font-semibold text-[17px] leading-tight text-foreground tracking-tight line-clamp-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 font-body leading-snug group-hover:opacity-0 transition-opacity">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Chips */}
              <div className="flex items-center gap-1.5 mt-auto mb-9">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${heat.glow}`}
                  style={{ backgroundColor: `${heat.color}15`, color: heat.color, border: `1px solid ${heat.color}30` }}
                >
                  <Clock size={9} />
                  {heat.label}
                </div>
                {(project.streak || 0) > 1 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Flame size={9} />
                    {project.streak}d
                  </div>
                )}
                <div className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground ml-auto">
                  <Zap size={9} />
                  {project.touch_count || 0}x
                </div>
              </div>

              {/* Actions — revealed while the card is held */}
              <div className="absolute left-3 right-3 bottom-3 flex items-center gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                <button
                  onClick={handleTouch}
                  disabled={touching || isTouchedToday}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all disabled:opacity-60"
                  style={isTouchedToday
                    ? { backgroundColor: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }
                    : { backgroundColor: accentColor, color: "white", boxShadow: `0 0 12px ${accentColor}40` }
                  }
                >
                  {isTouchedToday ? "✓" : touching ? "…" : "touch"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onFocusToggle(project.id, !project.is_focused); }}
                  title={project.is_focused ? "Unfocus" : "Set as focused"}
                  className={`p-1.5 rounded-lg border transition-all ${
                    project.is_focused
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <Target size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditOpen(project); }}
                  title="Edit project"
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
                >
                  <Pencil size={13} />
                </button>
                {project.repo_url && (
                  <a
                    href={project.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
                  >
                    <Github size={13} />
                  </a>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete project"
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground border border-border hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GhostTile({ slot, index, canAdd, onAdd }) {
  return (
    <div
      className="orbit-slot"
      style={{
        left: "50%",
        top: "50%",
        width: TILE,
        height: TILE,
        marginLeft: -TILE / 2,
        marginTop: -TILE / 2,
        transform: `translate3d(${slot.x}px, ${slot.y}px, 0)`,
      }}
    >
      <div className="orbit-counter">
        <div className="orbit-shadow" style={{ opacity: 0.3 }} />
        <div
          className="orbit-bob"
          style={{ "--bob-duration": `${5.5 + (index % 4) * 0.9}s`, "--bob-delay": `${-index * 0.85}s` }}
        >
          <button
            onClick={canAdd ? onAdd : undefined}
            disabled={!canAdd}
            className={`w-full h-full rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-colors ${
              canAdd ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default"
            }`}
          >
            <span className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground">
              <Plus size={16} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">open slot</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrbitStage({ projects, onTouch, onFocusToggle, onDelete, onEdit, onAdd }) {
  const containerRef = useRef(null);
  const size = useSize(containerRef);
  const [hoveredId, setHoveredId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  // Stable slot order: creation order, so cards never swap tiles mid-orbit
  // when touching reshuffles the "-last_touched" sort used elsewhere.
  const ordered = useMemo(
    () => [...projects].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).slice(0, MAX_PROJECTS),
    [projects]
  );

  const scale = size ? Math.min(1, size.width / DESIGN_W) : 1;
  const paused = hoveredId !== null || editingProject !== null;

  const handleHoverChange = (id, isIn) => {
    setHoveredId((cur) => (isIn ? id : cur === id ? null : cur));
  };

  return (
    <div ref={containerRef} className="w-full" style={{ height: DESIGN_H * scale }}>
      <div
        className={`orbit-scene relative mx-auto ${paused ? "orbit-paused" : ""}`}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          marginLeft: size && size.width < DESIGN_W ? (size.width - DESIGN_W) / 2 : undefined,
        }}
      >
        <div className="orbit-plane" style={{ position: "absolute", left: "50%", top: "54%", width: 0, height: 0 }}>
          <AnimatePresence>
            {SLOTS.map((slot, i) => {
              const project = ordered[i];
              return project ? (
                <OrbitTile
                  key={project.id}
                  project={project}
                  slot={slot}
                  index={i}
                  hovered={hoveredId === project.id}
                  onHoverChange={handleHoverChange}
                  onTouch={onTouch}
                  onFocusToggle={onFocusToggle}
                  onDelete={onDelete}
                  onEditOpen={setEditingProject}
                />
              ) : (
                <GhostTile key={`ghost-${i}`} slot={slot} index={i} canAdd={!!onAdd} onAdd={onAdd} />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={(updated) => { onEdit(updated); setEditingProject(null); }}
        />
      )}
    </div>
  );
}
