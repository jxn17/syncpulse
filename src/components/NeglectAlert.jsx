import { useState, useEffect } from "react";
import { AlertTriangle, X, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { differenceInDays, isToday } from "date-fns";

export default function NeglectAlert({ projects, focusedProject, permission, onRequestPermission }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Re-show alert if focused project changes or projects update
  useEffect(() => {
    setDismissed(false);
  }, [focusedProject?.id]);

  const neglected = projects.filter(p => {
    if (focusedProject && p.id === focusedProject.id) return false;
    if (!p.last_touched) return true;
    return !isToday(new Date(p.last_touched));
  });

  const hasCold = neglected.length > 0;
  const showFocusAlert = focusedProject && hasCold && !dismissed;
  const showColdBar = !focusedProject && hasCold;

  if (!showFocusAlert && !showColdBar) return null;

  // ── Focus Lock Alert ──
  if (showFocusAlert) {
    return (
      <div className="fixed top-4 right-4 z-40 w-full max-w-sm">
        <div
          className="border rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden"
          style={{
            background: "rgba(28, 14, 4, 0.95)",
            borderColor: "rgba(249, 115, 22, 0.4)",
            boxShadow: "0 0 40px rgba(249, 115, 22, 0.15), 0 8px 32px rgba(0,0,0,0.4)"
          }}
        >
          {/* Top accent */}
          <div className="h-0.5 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-400" />

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                <AlertTriangle size={16} className="text-orange-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-heading font-bold text-orange-300">Focus Lock Detected</span>
                  <span className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-md text-[10px] font-mono text-orange-400">
                    {neglected.length} cold
                  </span>
                </div>
                <p className="text-xs text-orange-400/70 font-body mb-3">
                  You're in <span className="font-mono font-bold text-orange-300">{focusedProject.name}</span>. These need a touch:
                </p>

                {/* Neglected list */}
                <div className="space-y-1.5">
                  {(expanded ? neglected : neglected.slice(0, 3)).map(p => {
                    const days = p.last_touched ? differenceInDays(new Date(), new Date(p.last_touched)) : null;
                    const urgency = !p.last_touched || days >= 3 ? "text-red-400" : days >= 2 ? "text-orange-400" : "text-yellow-400";
                    return (
                      <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-500/5 border border-orange-500/15 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || "#8B5CF6" }} />
                        <span className="font-mono text-xs text-orange-200 flex-1 truncate">{p.name}</span>
                        <span className={`text-[10px] font-mono font-bold ${urgency}`}>
                          {days === null ? "never" : days === 0 ? "today" : `${days}d ago`}
                        </span>
                      </div>
                    );
                  })}
                  {neglected.length > 3 && (
                    <button
                      onClick={() => setExpanded(e => !e)}
                      className="flex items-center gap-1 text-[10px] font-mono text-orange-400/60 hover:text-orange-400 transition-colors"
                    >
                      {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {expanded ? "show less" : `+${neglected.length - 3} more`}
                    </button>
                  )}
                </div>

                {/* Permission nudge */}
                {permission !== "granted" && (
                  <button
                    onClick={onRequestPermission}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-orange-400/60 hover:text-orange-300 transition-colors"
                  >
                    <Bell size={10} />
                    Enable browser notifications too →
                  </button>
                )}
              </div>

              <button onClick={() => setDismissed(true)} className="text-orange-400/40 hover:text-orange-300 transition-colors flex-shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Cold Bar (no focus set) ──
  if (showColdBar) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-sm"
          style={{
            background: "rgba(15, 10, 30, 0.95)",
            borderColor: "rgba(139, 92, 246, 0.3)",
            boxShadow: "0 0 30px rgba(139, 92, 246, 0.1), 0 8px 32px rgba(0,0,0,0.4)"
          }}
        >
          <span className="text-base">🧊</span>
          <span className="text-xs font-body text-muted-foreground flex-1">
            <span className="font-mono font-bold text-purple-300">{neglected.length} project{neglected.length > 1 ? "s" : ""}</span>
            {" "}not touched today — go say hi
          </span>
          <div className="flex gap-1">
            {neglected.slice(0, 4).map(p => (
              <span
                key={p.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color || "#8B5CF6" }}
                title={p.name}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}