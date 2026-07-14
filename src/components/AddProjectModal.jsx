import { useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/api/storage";
import { X, Plus, Github } from "lucide-react";

const PRESET_COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#3B82F6", "#F97316"
];

export const MAX_PROJECTS = 8;

export default function AddProjectModal({ onClose, onAdded, projectCount = 0 }) {
  const [form, setForm] = useState({ name: "", description: "", repo_url: "", color: "#8B5CF6" });
  const [loading, setLoading] = useState(false);
  const atCapacity = projectCount >= MAX_PROJECTS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || atCapacity) return;
    setLoading(true);
    const now = new Date().toISOString();
    await db.entities.Project.create({
      ...form,
      last_touched: now,
      is_focused: false,
      touch_count: 1,
      streak: 1
    });
    setLoading(false);
    onAdded();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-xl font-bold text-foreground tracking-tight">
              <span className="text-primary font-mono">&gt;</span> new project
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              {projectCount}/{MAX_PROJECTS} slots
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Project Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="my-awesome-project"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
              rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
            />
          </div>

          {/* Repo URL */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">GitHub URL</label>
            <div className="relative">
              <Github size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.repo_url}
                onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))}
                placeholder="https://github.com/you/repo"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? "white" : "transparent",
                    boxShadow: form.color === c ? `0 0 10px ${c}80` : "none"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          {atCapacity && (
            <p className="text-xs font-mono text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
              All {MAX_PROJECTS} slots are in use. Delete a project to free one.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !form.name.trim() || atCapacity}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold text-sm tracking-wide transition-all disabled:opacity-50"
            style={{ backgroundColor: form.color, color: "white", boxShadow: `0 0 20px ${form.color}50` }}
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add Project"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}