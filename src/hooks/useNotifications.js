import { useEffect, useRef, useState, useCallback } from "react";
import { isToday } from "date-fns";

const supported = typeof window !== "undefined" && "Notification" in window;

// Notifications go through the service worker when possible: inside an
// installed PWA (especially Android) `new Notification()` throws, and only
// `registration.showNotification()` works.
async function showNotification(title, body, tag) {
  if (!supported || Notification.permission !== "granted") return;
  const options = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: "/" },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    // fall through to the plain Notification API
  }
  try {
    new Notification(title, options);
  } catch {
    // Notification constructor unavailable (installed PWA without SW) — nothing to do
  }
}

// Chrome/Edge on Android can wake the service worker periodically even when
// the app is closed. Best-effort: silently unavailable elsewhere.
async function registerPeriodicSync(minutes) {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = /** @type {any} */ (await navigator.serviceWorker.ready);
    if (!("periodicSync" in reg)) return;
    const status = await navigator.permissions.query(
      /** @type {any} */ ({ name: "periodic-background-sync" })
    );
    if (status.state !== "granted") return;
    await reg.periodicSync.register("syncpulse-check", {
      minInterval: Math.max(minutes || 30, 60) * 60 * 1000,
    });
  } catch {
    // periodic background sync not available — in-page timer still covers open tabs
  }
}

export function useNotifications(projects, settings) {
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported");
  const timerRef = useRef(null);
  const projectsRef = useRef(projects);
  const settingsRef = useRef(settings);

  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const requestPermission = async () => {
    if (!supported) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      registerPeriodicSync(settingsRef.current?.notify_interval_minutes);
    }
    return result;
  };

  const runCheck = useCallback(() => {
    const currentProjects = projectsRef.current;
    const currentSettings = settingsRef.current;
    if (!currentSettings?.notifications_enabled) return;
    if (!currentProjects || currentProjects.length === 0) return;

    const untouched = currentProjects.filter(p => !p.last_touched || !isToday(new Date(p.last_touched)));
    const focused = currentProjects.find(p => p.is_focused);

    if (focused) {
      const cold = untouched.filter(p => p.id !== focused.id);
      if (cold.length > 0) {
        const names = cold.slice(0, 3).map(p => p.name).join(", ");
        showNotification(
          `🔒 Focus lock — ${cold.length} project${cold.length > 1 ? "s" : ""} need a touch`,
          `Still in ${focused.name}. Don't forget: ${names}${cold.length > 3 ? ` +${cold.length - 3} more` : ""}`,
          "focus-lock"
        );
      } else {
        showNotification(
          `✅ All projects touched today!`,
          `Keep it up. You're in ${focused.name} — great focus.`,
          "all-good"
        );
      }
    } else if (untouched.length > 0) {
      const names = untouched.slice(0, 3).map(p => p.name).join(", ");
      showNotification(
        `🧊 ${untouched.length} project${untouched.length > 1 ? "s" : ""} not touched today`,
        names + (untouched.length > 3 ? ` +${untouched.length - 3} more` : ""),
        "cold-projects"
      );
    } else {
      showNotification(
        `✅ All ${currentProjects.length} projects touched today!`,
        "You're on a roll. Keep the streak alive.",
        "all-done"
      );
    }
  }, []);

  // In-page reminder timer while the app is open; the service worker's
  // periodic background sync covers the app-closed case where supported.
  useEffect(() => {
    if (!settings) return;
    const intervalMs = (settings.notify_interval_minutes || 30) * 60 * 1000;

    if (timerRef.current) clearInterval(timerRef.current);

    if (settings.notifications_enabled) {
      timerRef.current = setInterval(runCheck, intervalMs);
      if (permission === "granted") {
        registerPeriodicSync(settings.notify_interval_minutes);
      }
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings?.notify_interval_minutes, settings?.notifications_enabled, permission, runCheck]);

  return { permission, requestPermission };
}
