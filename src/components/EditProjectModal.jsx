import { useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/api/storage";
import { X, Save, Github } from "lucide-react";

const PRESET_COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#3B82F6", "#F97316"
];

export default function EditProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: project.name || "",
    description: project.description || "",
    repo_url: project.repo_url || "",
    color: project.color || "#8B5CF6"
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    await db.entities.Project.update(project.id, form);
    setLoading(false);
    onSaved({ ...project, ...form });
    onClose();
  };

  // Rendered through a portal: the card container has a hover transform,
  // which would otherwise trap and clip this fixed-position overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold text-foreground tracking-tight">
            <span className="text-primary font-mono">&gt;</span> edit project
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Project Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
            />
          </div>

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

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold text-sm tracking-wide transition-all disabled:opacity-50"
            style={{ backgroundColor: form.color, color: "white", boxShadow: `0 0 20px ${form.color}50` }}
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}