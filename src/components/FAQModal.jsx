import { createPortal } from "react-dom";
import { X, HelpCircle } from "lucide-react";

const FAQ = [
  {
    q: "What is SyncPulse?",
    a: "A local-first tracker that nudges you to “touch” every project every day so nothing goes stale. It caps you at 8 projects on purpose — focus beats sprawl.",
  },
  {
    q: "How do I mark a project as touched?",
    a: "Hover a card and hit the ⚡ touch button in the tray that slides out beneath it. Touching daily builds the project’s streak; miss a day and it goes cold.",
  },
  {
    q: "How do I edit a project?",
    a: "Click a card to open its editor. You can also hover and use the ✎ pencil button in the action tray.",
  },
  {
    q: "How do I reorder the cards?",
    a: "Left-click and drag a card anywhere in the ring — the other cards slide to make room. The orbit freezes while you drag and resumes the moment you drop. Your arrangement is saved.",
  },
  {
    q: "What does “focus” do?",
    a: "The ◎ target button pins one project as your focus. It rides permanently elevated on the stage, and reminders will nag you about everything else you haven’t touched while you’re locked in.",
  },
  {
    q: "How do notifications work?",
    a: "Grant permission with the \u{1f514} bell in the header. While a browser tab is open you get reminders on your chosen interval (default 30 min). For nudges when the app is closed, install SyncPulse as an app (below) — background delivery is best-effort and scheduled by the browser. Use Settings → “Send test notification” to confirm your browser and OS will pop a toast.",
  },
  {
    q: "Where is my data stored?",
    a: "Entirely on this device — in your browser’s localStorage, mirrored to IndexedDB so the app works offline. Nothing is uploaded to a server. Clearing your browser data for this site will erase it.",
  },
  {
    q: "Can I install it as an app?",
    a: "Yes. In Chrome or Edge, use the install icon in the address bar (or menu → “Install app”). You get an offline-capable window and background reminders where the browser supports it.",
  },
];

export default function FAQModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl z-10">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <h2 className="font-heading text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <HelpCircle size={20} className="text-primary" />
            FAQ
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pt-4 space-y-5">
          {FAQ.map(({ q, a }, i) => (
            <div key={i}>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">
                <span className="text-primary font-mono mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                {q}
              </h3>
              <p className="text-[13px] text-muted-foreground font-body leading-relaxed">{a}</p>
            </div>
          ))}

          <p className="text-[11px] font-mono text-muted-foreground/70 pt-2 border-t border-border">
            touch every project, every day. no exceptions.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
