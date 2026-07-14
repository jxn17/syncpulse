import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/storage";
import { getHeatStatus } from "@/lib/heat";
import { useSize } from "@/hooks/use-size";
import { Github, Zap, Trash2, Target, Pencil, Plus } from "lucide-react";
import EditProjectModal from "@/components/EditProjectModal";
import { MAX_PROJECTS } from "@/components/AddProjectModal";

const TILE = 200;
const GAP = Math.round(TILE * 0.18); // spacing 18%
const STEP = TILE + GAP;
const RADIUS = 28; // ≈3.5% of the stage width — the big soft corners in the reference
const STAGE_PAD = 0.06; // padding 6%
// The swing (±25°) never completes a revolution, so the sweep footprint is
// smaller than a full spin — these bounds hug the swept extremes at 63° tilt,
// plus headroom for the upright cards rising off the floor.
const DESIGN_W = 900;
const DESIGN_H = 650;

// Card faces are light against the dark stage (like the reference deck), so
// status colors are the dark-on-cream cuts.
const CREAM = "#EFEDE4";
const INK = "#17151F";

function statusOf(heat) {
  if (heat.days === 0) return { label: "today ✓", color: "#15803D" };
  if (heat.days === 1) return { label: "yesterday", color: "#A16207" };
  if (heat.days >= 2 && heat.days < 999) return { label: `cold · ${heat.days}d`, color: "#B91C1C" };
  return { label: "never touched", color: "#6B7280" };
}

// 8 slots arranged as the reference video's 3x3 grid minus its center — a
// ring around the plane origin, so spacing between neighbors matches the
// video exactly while keeping the 8-project cap.
const SLOTS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
].map(([cx, cy]) => ({ x: cx * STEP, y: cy * STEP }));

function OrbitTile({ project, slot, index, hovered, onHoverChange }) {
  const heat = getHeatStatus(project.last_touched);
  const status = statusOf(heat);
  const accentColor = project.color || "#8B5CF6";
  const cardRef = useRef(null);

  // A hovered card lifts well clear of the floor so it — and the action tray
  // pinned to it — always read as sitting above its neighbours.
  const lift = (project.is_focused ? 64 : 0) + (hovered ? 72 : 0);
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
        <div className="orbit-bob" style={{ "--bob-delay": `${-index * 0.625}s` }}>
          <div
            className="orbit-lift"
            style={{ "--lift": `${lift}px`, "--lift-scale": hovered ? 1.05 : 1 }}
            onMouseEnter={() => onHoverChange(project.id, true, cardRef.current)}
            onMouseLeave={() => onHoverChange(project.id, false)}
          >
            <div className="orbit-stand">
              <motion.div
                ref={cardRef}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, delay: index * 0.06 }}
                className="relative w-full h-full p-5 flex flex-col overflow-hidden"
                style={{
                  borderRadius: RADIUS,
                  backgroundColor: project.is_focused ? accentColor : CREAM,
                  color: project.is_focused ? "#FFFFFF" : INK,
                  boxShadow: project.is_focused
                    ? `0 0 40px ${accentColor}55, 0 0 90px ${accentColor}20`
                    : hovered
                      ? `0 0 34px ${accentColor}35`
                      : "0 2px 24px rgba(0,0,0,0.35)",
                }}
              >
                {/* Top row: accent mark + status */}
                <div className="flex items-center">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: project.is_focused ? "rgba(255,255,255,0.9)" : accentColor }}
                  />
                  <span
                    className="ml-auto font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: project.is_focused ? "rgba(255,255,255,0.85)" : status.color }}
                  >
                    {project.is_focused ? "● focused" : status.label}
                  </span>
                </div>

                {/* Name — the hero, big display type like the reference deck */}
                <h3
                  className="font-heading font-semibold mt-3 tracking-tight line-clamp-3"
                  style={{ fontSize: 23, lineHeight: 1.02 }}
                >
                  {project.name}
                </h3>

                {/* Bottom: streak dots + oversized touch-count numeral */}
                <div className="mt-auto flex items-end">
                  {(project.streak || 0) > 0 && (
                    <div className="flex items-center gap-1 pb-1">
                      {Array.from({ length: Math.min(project.streak || 0, 7) }, (_, d) => (
                        <span
                          key={d}
                          className="w-[7px] h-[7px] rounded-full"
                          style={{ backgroundColor: project.is_focused ? "rgba(255,255,255,0.9)" : accentColor }}
                        />
                      ))}
                      <span
                        className="font-mono text-[9px] font-bold ml-1"
                        style={{ color: project.is_focused ? "rgba(255,255,255,0.75)" : `${INK}99` }}
                      >
                        {project.streak}d
                      </span>
                    </div>
                  )}
                  <span
                    className="ml-auto font-heading font-bold select-none"
                    style={{
                      fontSize: 42,
                      lineHeight: 0.8,
                      letterSpacing: "-0.03em",
                      color: project.is_focused ? "rgba(255,255,255,0.35)" : accentColor,
                      opacity: project.is_focused ? 1 : 0.3,
                    }}
                  >
                    {project.touch_count || 0}×
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The action controls are rendered flat, in a portal to <body>, pinned to the
// hovered card's on-screen rectangle. Living outside the 3D plane means no
// other card can ever paint over them, they always face the viewer, and the
// hit targets stay generous and reliable.
function ActionTray({ project, rect, onTouch, onFocusToggle, onDelete, onEditOpen, onMouseEnter, onMouseLeave }) {
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

  if (!rect) return null;

  // Pin under the card, clamped so the pill never leaves the viewport.
  const HALF = 150;
  const left = Math.min(Math.max(rect.left + rect.width / 2, HALF + 8), window.innerWidth - HALF - 8);
  const top = Math.min(rect.bottom + 14, window.innerHeight - 72);

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left,
        top,
        transform: "translateX(-50%)",
        zIndex: 80,
        backgroundColor: "rgba(23,21,31,0.94)",
      }}
      className="flex items-center gap-1.5 p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md"
    >
      <button
        onClick={handleTouch}
        disabled={touching || isTouchedToday}
        className="px-4 py-2.5 rounded-xl text-[12px] font-mono font-semibold whitespace-nowrap transition-all disabled:opacity-60 flex items-center gap-1.5"
        style={isTouchedToday
          ? { backgroundColor: `${accentColor}22`, color: accentColor }
          : { backgroundColor: accentColor, color: "white", boxShadow: `0 0 14px ${accentColor}50` }
        }
      >
        <Zap size={13} />
        {isTouchedToday ? "done" : touching ? "…" : "touch"}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onFocusToggle(project.id, !project.is_focused); }}
        title={project.is_focused ? "Unfocus" : "Set as focused"}
        className={`p-2.5 rounded-xl transition-colors ${
          project.is_focused ? "text-yellow-300 bg-yellow-400/10" : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        <Target size={16} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEditOpen(project); }}
        title="Edit project"
        className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Pencil size={16} />
      </button>
      {project.repo_url && (
        <a
          href={project.repo_url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open repository"
          className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Github size={16} />
        </a>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete project"
        className="p-2.5 rounded-xl text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>,
    document.body
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
        <div className="orbit-bob" style={{ "--bob-delay": `${-index * 0.625}s` }}>
          <div className="orbit-stand">
          <button
            onClick={canAdd ? onAdd : undefined}
            disabled={!canAdd}
            style={{ borderRadius: RADIUS }}
            className={`w-full h-full border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-colors ${
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
    </div>
  );
}

export default function OrbitStage({ projects, onTouch, onFocusToggle, onDelete, onEdit, onAdd }) {
  const containerRef = useRef(null);
  const size = useSize(containerRef);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const hoveredElRef = useRef(null);
  const clearTimer = useRef(null);

  // Stable slot order: creation order, so cards never swap tiles mid-orbit
  // when touching reshuffles the "-last_touched" sort used elsewhere.
  const ordered = useMemo(
    () => [...projects].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).slice(0, MAX_PROJECTS),
    [projects]
  );

  // Zoom to fill: as large as the container width and the remaining viewport
  // height allow (6% stage padding on both axes), so the swing never leaves
  // the screen.
  const scale = useMemo(() => {
    if (!size) return 1;
    const el = containerRef.current;
    const availH = el
      ? Math.max(320, window.innerHeight - el.getBoundingClientRect().top + window.scrollY - 24)
      : DESIGN_H;
    return Math.min(
      (size.width * (1 - STAGE_PAD)) / DESIGN_W,
      (availH * (1 - STAGE_PAD)) / DESIGN_H
    );
  }, [size]);

  const paused = hoveredId !== null || editingProject !== null;

  // Keep the flat action tray glued to the hovered card: re-measure every
  // frame while a card is hovered, so the tray tracks the lift transition and
  // any scroll without ever detaching from the card.
  useEffect(() => {
    if (hoveredId == null) return undefined;
    let raf;
    const tick = () => {
      const el = hoveredElRef.current;
      if (el) setHoveredRect(el.getBoundingClientRect());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoveredId]);

  // If the hovered project vanishes (e.g. deleted from the tray), drop hover.
  useEffect(() => {
    if (hoveredId != null && !ordered.some((p) => p.id === hoveredId)) {
      setHoveredId(null);
      setHoveredRect(null);
    }
  }, [ordered, hoveredId]);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  // Hover bridge: the card face and the portalled tray are separate DOM
  // subtrees, so the cursor briefly crosses empty space between them. A short
  // grace period on leave (cancelled the instant either element is entered)
  // means that gap no longer restarts the orbit motion.
  const keepHover = (id, el) => {
    clearTimeout(clearTimer.current);
    if (el) hoveredElRef.current = el;
    setHoveredId(id);
  };
  const releaseHover = (id) => {
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setHoveredId((cur) => (cur === id ? null : cur));
    }, 160);
  };
  const handleHoverChange = (id, isIn, el) => {
    if (isIn) keepHover(id, el);
    else releaseHover(id);
  };

  const hoveredProject = hoveredId != null ? ordered.find((p) => p.id === hoveredId) : null;

  return (
    <div ref={containerRef} className="w-full" style={{ height: DESIGN_H * scale }}>
      <div
        className={`orbit-scene relative ${paused ? "orbit-paused" : ""}`}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          marginLeft: size ? (size.width - DESIGN_W) / 2 : undefined,
        }}
      >
        <div className="orbit-plane" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
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
                />
              ) : (
                <GhostTile key={`ghost-${i}`} slot={slot} index={i} canAdd={!!onAdd} onAdd={onAdd} />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Flat, always-on-top action controls for the hovered card. Hidden
          while an edit modal is open so it can't sit over the dialog. */}
      {hoveredProject && !editingProject && (
        <ActionTray
          project={hoveredProject}
          rect={hoveredRect}
          onTouch={onTouch}
          onFocusToggle={onFocusToggle}
          onDelete={onDelete}
          onEditOpen={setEditingProject}
          onMouseEnter={() => keepHover(hoveredProject.id)}
          onMouseLeave={() => releaseHover(hoveredProject.id)}
        />
      )}

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
