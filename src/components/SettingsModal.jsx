import { useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/api/storage";
import { X, Save, Bell, Clock } from "lucide-react";

const INTERVAL_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
];

export default function SettingsModal({ settings, onClose, onSaved }) {
  const [interval, setInterval] = useState(settings?.notify_interval_minutes || 30);
  const [enabled, setEnabled] = useState(settings?.notifications_enabled !== false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    let saved;
    if (settings?.id) {
      saved = await db.entities.AppSettings.update(settings.id, {
        notify_interval_minutes: interval,
        notifications_enabled: enabled
      });
    } else {
      saved = await db.entities.AppSettings.create({
        notify_interval_minutes: interval,
        notifications_enabled: enabled
      });
    }
    setLoading(false);
    onSaved({ ...settings, notify_interval_minutes: interval, notifications_enabled: enabled, id: saved?.id || settings?.id });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold text-foreground tracking-tight">
            <span className="text-primary font-mono">&gt;</span> settings
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-primary" />
              <span className="text-sm font-body text-foreground">Notifications</span>
            </div>
            <button
              onClick={() => setEnabled(e => !e)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Interval picker */}
          <div className={!enabled ? "opacity-40 pointer-events-none" : ""}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Remind every</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setInterval(opt.value)}
                  className="py-2 rounded-xl text-xs font-mono font-semibold transition-all border"
                  style={interval === opt.value
                    ? { backgroundColor: "hsl(var(--primary))", color: "white", borderColor: "hsl(var(--primary))", boxShadow: "0 0 12px hsl(var(--primary) / 0.4)" }
                    : { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-2 opacity-70">
              Browser tab must be open for reminders to fire.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold text-sm bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 glow-purple"
          >
            <Save size={15} />
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}