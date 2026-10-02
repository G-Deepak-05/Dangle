import { useEffect, useMemo, useRef, useState } from "react";
import { backend, type InstalledApp, type Route } from "../../ipc/backend";
import { refreshCustomCharms, updateSettings } from "../../state/stores";
import { BackBar } from "../components/Controls";
import { SearchIcon } from "../components/Icons";
import { IS_MAC } from "../platform";

const iconCache = new Map<string, string | null>();

/** Where the OS icon isn't available, a tidy monogram tile stands in. */
function monogram(name: string): string {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  ctx.fillStyle = `hsl(${hue} 55% 52%)`;
  ctx.beginPath();
  ctx.roundRect(16, 16, 224, 224, 52);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "600 120px -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.trim().charAt(0).toUpperCase() || "?", 128, 138);
  return c.toDataURL("image/png");
}

function AppTile({ app, busy, onPick }: { app: InstalledApp; busy: boolean; onPick: (app: InstalledApp) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [icon, setIcon] = useState<string | null | undefined>(iconCache.get(app.path));

  useEffect(() => {
    if (icon !== undefined || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      backend
        .appIcon(app.path)
        .then((b64) => (b64 ? `data:image/png;base64,${b64}` : monogram(app.name)))
        .catch(() => monogram(app.name))
        .then((url) => {
          iconCache.set(app.path, url);
          setIcon(url);
        });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [app, icon]);

  return (
    <button
      ref={ref}
      type="button"
      className="app-tile"
      onClick={() => onPick(app)}
      disabled={busy}
      aria-label={`Hang ${app.name} as a charm`}
      title={app.name}
    >
      <span className="app-icon">{icon ? <img src={icon} alt="" draggable={false} /> : <span className="app-icon-placeholder" />}</span>
      <span className="app-name">{app.name}</span>
    </button>
  );
}

export function Apps({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void backend.listApps().then(setApps, () => setApps([]));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (apps ?? []).filter((a) => !q || a.name.toLowerCase().includes(q));
  }, [apps, query]);

  const pick = async (app: InstalledApp) => {
    setBusy(true);
    try {
      const fallback = IS_MAC ? undefined : monogram(app.name).split(",")[1];
      const charm = await backend.createAppCharm(app.path, app.name, fallback);
      await refreshCustomCharms();
      await updateSettings({ activeCharmId: charm.id });
      onToast(`${app.name} is hanging. Click it to open`);
      go("home");
    } catch (err) {
      onToast(typeof err === "string" ? err : "Couldn't make a charm for that app.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <BackBar title="Hang an app" onBack={() => go("create")} />
      <p className="help" style={{ marginTop: 0, fontSize: "0.95rem", color: "var(--ink-2)" }}>
        Pick an app to hang its icon as a charm. Click the charm to open the app; drag it to swing as usual.
      </p>

      <div className="search" style={{ marginTop: 14 }}>
        <SearchIcon />
        <input
          className="input"
          type="search"
          placeholder={apps ? `Search ${apps.length} apps` : "Finding your apps…"}
          aria-label="Search apps"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoFocus
        />
      </div>

      {apps === null ? (
        <div className="empty">
          <div className="spinner" style={{ margin: "0 auto" }} aria-label="Loading apps" />
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No apps found</p>
          <p>{query ? "Try another name." : "Dangle looks in your Applications folders."}</p>
        </div>
      ) : (
        <div className="app-grid" role="list">
          {visible.map((app) => (
            <div role="listitem" key={app.path}>
              <AppTile app={app} busy={busy} onPick={(a) => void pick(a)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
