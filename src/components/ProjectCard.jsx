import { useState } from "react";
import { db } from "@/api/storage";
import { Github, Zap, Trash2, Clock, Flame, Target, Pencil } from "lucide-react";
import EditProjectModal from "@/components/EditProjectModal";
import { getHeatStatus } from "@/lib/heat";

export default function ProjectCard({ project, onDelete, onFocusToggle, onTouch, onEdit, isFocusedElsewhere }) {
  const [deleting, setDeleting] = useState(false);
  const [touching, setTouching] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const heat = getHeatStatus(project.last_touched);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    await db.entities.Project.delete(project.id);
    onDelete(project.id);
  };

  const handleTouch = async (e) => {
    e.stopPropagation();
    setTouching(true);
    const now = new Date().toISOString();
    const newStreak = heat.days <= 1 ? (project.streak || 0) + 1 : 1;
    await db.entities.Project.update(project.id, {
      last_touched: now,
      touch_count: (project.touch_count || 0) + 1,
      streak: newStreak
    });
    onTouch(project.id, now, newStreak);
    setTouching(false);
  };

  const handleFocus = (e) => {
    e.stopPropagation();
    onFocusToggle(project.id, !project.is_focused);
  };

  const accentColor = project.color || "#8B5CF6";
  const isTouchedToday = heat.days === 0;

  return (
    <div
      className={`project-card relative bg-card border rounded-2xl p-5 scanlines overflow-hidden transition-all duration-300 ${
        project.is_focused ? "border-opacity-100" : isFocusedElsewhere ? "opacity-50 border-border" : "border-border hover:border-opacity-50"
      }`}
      style={{
        borderColor: project.is_focused ? accentColor : undefined,
        boxShadow: project.is_focused ? `0 0 30px ${accentColor}30, 0 0 60px ${accentColor}10` : undefined
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: accentColor, opacity: 0.8 }} />

      {/* Focused badge */}
      {project.is_focused && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
          FOCUSED
        </div>
      )}

      {/* Heat warning badge */}
      {heat.days >= 2 && !project.is_focused && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
          ⚠ COLD
        </div>
      )}

      {/* Header */}
      <div className="mb-3 pr-16">
        <h3 className="font-heading font-bold text-base text-foreground tracking-tight truncate">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-body leading-relaxed">{project.description}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Heat indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${heat.glow}`}
          style={{ backgroundColor: `${heat.color}15`, color: heat.color, border: `1px solid ${heat.color}30` }}>
          <Clock size={10} />
          {heat.label}
        </div>

        {/* Streak */}
        {(project.streak || 0) > 1 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame size={10} />
            {project.streak}d streak
          </div>
        )}

        {/* Touch count */}
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground ml-auto">
          <Zap size={10} />
          {project.touch_count || 0}x
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Touch today button */}
        <button
          onClick={handleTouch}
          disabled={touching || isTouchedToday}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all disabled:opacity-60"
          style={isTouchedToday
            ? { backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }
            : { backgroundColor: accentColor, color: "white", boxShadow: `0 0 12px ${accentColor}40` }
          }
        >
          {isTouchedToday ? "✓ touched" : touching ? "..." : "touch"}
        </button>

        {/* Focus toggle */}
        <button
          onClick={handleFocus}
          className={`p-2 rounded-xl text-xs transition-all border ${
            project.is_focused
              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
          title={project.is_focused ? "Unfocus" : "Set as focused"}
        >
          <Target size={14} />
        </button>

        {/* GitHub link */}
        {project.repo_url && (
          <a
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-xl bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
          >
            <Github size={14} />
          </a>
        )}

        {/* Edit */}
        <button
          onClick={e => { e.stopPropagation(); setShowEdit(true); }}
          className="p-2 rounded-xl bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
        >
          <Pencil size={14} />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-xl bg-secondary text-muted-foreground border border-border hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { onEdit(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}