import { useState, useEffect } from "react";
import { db } from "@/api/storage";
import { Plus, Github, CheckCircle2, Bell, Settings } from "lucide-react";

import { isToday, differenceInDays } from "date-fns";
import ProjectCard from "@/components/ProjectCard";
import AddProjectModal, { MAX_PROJECTS } from "@/components/AddProjectModal";
import OrbitStage from "@/components/OrbitStage";
import SettingsModal from "@/components/SettingsModal";
import NeglectAlert from "@/components/NeglectAlert";
import { useNotifications } from "@/hooks/useNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState(null);
  const { permission, requestPermission } = useNotifications(projects, appSettings);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadProjects();
    loadSettings();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const data = await db.entities.Project.list("-last_touched");
    setProjects(data);
    setLoading(false);
  };

  const loadSettings = async () => {
    const data = await db.entities.AppSettings.list();
    if (data.length > 0) setAppSettings(data[0]);
    else setAppSettings({ notify_interval_minutes: 30, notifications_enabled: true });
  };

  const handleDelete = (id) => setProjects(p => p.filter(x => x.id !== id));
  const handleEdit = (updated) => setProjects(p => p.map(x => x.id === updated.id ? updated : x));

  const handleTouch = (id, now, streak) => {
    setProjects(p => p.map(x => x.id === id
      ? { ...x, last_touched: now, touch_count: (x.touch_count || 0) + 1, streak }
      : x
    ));
  };

  const handleFocusToggle = async (id, val) => {
    // Only one project focused at a time
    const updates = projects.map(p =>
      p.id === id ? { ...p, is_focused: val } : { ...p, is_focused: false }
    );
    setProjects(updates);
    await db.entities.Project.update(id, { is_focused: val });
    // Unfocus others
    const others = projects.filter(p => p.id !== id && p.is_focused);
    for (const o of others) {
      await db.entities.Project.update(o.id, { is_focused: false });
    }
  };

  const focusedProject = projects.find(p => p.is_focused);
  const touchedToday = projects.filter(p => p.last_touched && isToday(new Date(p.last_touched))).length;
  const totalProjects = projects.length;
  const atCapacity = totalProjects >= MAX_PROJECTS;
  const coldProjects = projects.filter(p => {
    if (!p.last_touched) return true;
    return differenceInDays(new Date(), new Date(p.last_touched)) >= 2;
  }).length;

  return (
    <div className="relative min-h-screen bg-background pixel-bg overflow-x-hidden">
      <div className="aurora pointer-events-none absolute inset-0" />
      <NeglectAlert
        projects={projects}
        focusedProject={focusedProject}
        permission={permission}
        onRequestPermission={requestPermission}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-primary text-sm font-bold">~/projects</span>
                <span className="w-1.5 h-4 bg-primary rounded-sm animate-pulse" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
                Project Tracker
              </h1>
              <p className="text-muted-foreground text-sm mt-1 font-body">
                touch every project, every day. no exceptions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {permission !== "granted" && (
                <button
                  onClick={requestPermission}
                  title="Enable browser notifications"
                  className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground text-sm transition-all"
                >
                  <Bell size={15} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                title="Settings"
                className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground text-sm transition-all"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={() => setShowAdd(true)}
                disabled={atCapacity}
                title={atCapacity ? `All ${MAX_PROJECTS} slots are in use` : "Add a project"}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-heading font-semibold text-sm transition-all hover:opacity-90 glow-purple disabled:opacity-40 disabled:shadow-none"
              >
                <Plus size={16} />
                New Project
                <span className="font-mono text-[10px] opacity-80">{totalProjects}/{MAX_PROJECTS}</span>
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {totalProjects > 0 && (
            <div className="flex items-center gap-4 mt-5 flex-wrap">
              {/* Progress */}
              <div className="flex items-center gap-3 flex-1 min-w-48">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((touchedToday / totalProjects) * 100)}%`,
                      backgroundColor: touchedToday === totalProjects ? "#4ADE80" : touchedToday > 0 ? "#FACC15" : "#8B5CF6"
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {touchedToday}/{totalProjects} today
                </span>
              </div>

              {/* Cold */}
              {coldProjects > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-mono text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {coldProjects} cold
                </div>
              )}

              {/* All done */}
              {touchedToday === totalProjects && totalProjects > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs font-mono text-green-400">
                  <CheckCircle2 size={12} />
                  all touched today!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="font-mono text-xs text-muted-foreground">loading projects...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-4 border border-border">
              <Github size={36} className="text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">Add your GitHub projects and start tracking them daily.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-heading font-semibold text-sm glow-purple"
            >
              <Plus size={16} />
              Add First Project
            </button>
          </div>
        )}

        {/* Projects — flat grid on touch/mobile */}
        {!loading && projects.length > 0 && isMobile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                onFocusToggle={handleFocusToggle}
                onTouch={handleTouch}
                onEdit={handleEdit}
                isFocusedElsewhere={!!focusedProject && !project.is_focused}
              />
            ))}
          </div>
        )}
      </div>

      {/* Orbit stage — full-bleed on desktop so the zoom can fill the screen */}
      {!loading && projects.length > 0 && !isMobile && (
        <div className="relative w-full">
          <OrbitStage
            projects={projects}
            onDelete={handleDelete}
            onFocusToggle={handleFocusToggle}
            onTouch={handleTouch}
            onEdit={handleEdit}
            onAdd={atCapacity ? null : () => setShowAdd(true)}
          />
        </div>
      )}

      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onAdded={loadProjects}
          projectCount={totalProjects}
        />
      )}

      {showSettings && appSettings && (
        <SettingsModal
          settings={appSettings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => setAppSettings(s)}
        />
      )}
    </div>
  );
}