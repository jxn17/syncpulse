// Local-disk storage layer. All app data lives in localStorage on the device.
// Every write also mirrors a snapshot into IndexedDB, because the service
// worker (background notifications) can read IndexedDB but not localStorage.

const KEYS = {
  Project: "syncpulse:projects",
  AppSettings: "syncpulse:settings",
};

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function write(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
  mirrorSnapshot();
}

function openKv() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("syncpulse", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function mirrorSnapshot() {
  try {
    const snapshot = {
      projects: read(KEYS.Project),
      settings: read(KEYS.AppSettings)[0] || null,
      updated_at: Date.now(),
    };
    const idb = await openKv();
    const tx = idb.transaction("kv", "readwrite");
    tx.objectStore("kv").put(snapshot, "snapshot");
    tx.oncomplete = () => idb.close();
    tx.onabort = () => idb.close();
  } catch {
    // Snapshot mirror is best-effort; the app itself only needs localStorage.
  }
}

function makeEntity(name) {
  const key = KEYS[name];
  if (!key) throw new Error(`Unknown entity: ${name}`);
  return {
    async list(sort) {
      const rows = read(key);
      if (sort) {
        const desc = sort.startsWith("-");
        const field = desc ? sort.slice(1) : sort;
        rows.sort((a, b) => {
          const av = a[field] ?? "";
          const bv = b[field] ?? "";
          return (av < bv ? -1 : av > bv ? 1 : 0) * (desc ? -1 : 1);
        });
      }
      return rows;
    },
    async filter(query = {}, sort) {
      const rows = await this.list(sort);
      return rows.filter((r) => Object.entries(query).every(([k, v]) => r[k] === v));
    },
    async get(id) {
      return read(key).find((r) => r.id === id) ?? null;
    },
    async create(data) {
      const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...data };
      const rows = read(key);
      rows.push(row);
      write(key, rows);
      return row;
    },
    async update(id, data) {
      const rows = read(key);
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return null;
      rows[i] = { ...rows[i], ...data, updated_at: new Date().toISOString() };
      write(key, rows);
      return rows[i];
    },
    async delete(id) {
      write(key, read(key).filter((r) => r.id !== id));
      return { id };
    },
  };
}

export const db = {
  entities: {
    Project: makeEntity("Project"),
    AppSettings: makeEntity("AppSettings"),
  },
};

// Keep the service worker snapshot warm on startup.
if (typeof window !== "undefined" && "indexedDB" in window) {
  mirrorSnapshot();
}

export default db;
