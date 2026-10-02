import { useCallback, useEffect, useRef, useState } from "react";
import { events, type Route } from "../ipc/backend";
import { useSettings, useSettingsReady } from "./hooks";
import { DialogHost } from "./components/Dialog";
import { CreateCharm } from "./views/CreateCharm";
import { Apps } from "./views/Apps";
import { Customize } from "./views/Customize";
import { Feedback } from "./views/Feedback";
import { Home } from "./views/Home";
import { Library } from "./views/Library";
import { Onboarding } from "./views/Onboarding";
import { Privacy } from "./views/Privacy";
import { Settings } from "./views/Settings";

const UI_SCALES = [12, 13, 14, 15, 16];
const SCALE_KEY = "dangle.uiScale";

function readScale(): number {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return UI_SCALES.includes(v) ? v : 13;
  } catch {
    return 13;
  }
}

export function App() {
  const ready = useSettingsReady();
  const settings = useSettings();
  const [route, setRoute] = useState<Route>("home");
  const [toast, setToast] = useState<string | null>(null);
  const [uiScale, setUiScale] = useState(readScale);
  const toastTimer = useRef(0);

  const go = useCallback((r: Route) => setRoute(r), []);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    const unlisten = events.navigate((r) => setRoute(r === "onboarding" ? "home" : r));
    return () => void unlisten.then((u) => u());
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", `${uiScale}px`);
    try {
      localStorage.setItem(SCALE_KEY, String(uiScale));
    } catch {
      /* a convenience only */
    }
  }, [uiScale]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape" && route !== "home") setRoute(route === "privacy" || route === "feedback" ? "settings" : "home");
      if (!mod) return;
      if (e.key === ",") {
        e.preventDefault();
        setRoute("settings");
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setUiScale((s) => UI_SCALES[Math.min(UI_SCALES.length - 1, UI_SCALES.indexOf(s) + 1)]);
      } else if (e.key === "-") {
        e.preventDefault();
        setUiScale((s) => UI_SCALES[Math.max(0, UI_SCALES.indexOf(s) - 1)]);
      } else if (e.key === "0") {
        e.preventDefault();
        setUiScale(13);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route]);

  if (!ready) {
    return (
      <div className="app" aria-busy="true">
        <div className="titlebar" data-tauri-drag-region />
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div className="spinner" aria-label="Loading" />
        </div>
      </div>
    );
  }

  const view = !settings.onboardingComplete ? (
    <Onboarding />
  ) : route === "library" ? (
    <Library go={go} onToast={showToast} />
  ) : route === "customize" ? (
    <Customize go={go} />
  ) : route === "create" ? (
    <CreateCharm go={go} onToast={showToast} />
  ) : route === "settings" ? (
    <Settings go={go} onToast={showToast} />
  ) : route === "apps" ? (
    <Apps go={go} onToast={showToast} />
  ) : route === "feedback" ? (
    <Feedback go={go} onToast={showToast} />
  ) : route === "privacy" ? (
    <Privacy go={go} />
  ) : (
    <Home go={go} />
  );

  return (
    <div className="app">
      <div className="titlebar" data-tauri-drag-region />
      <main key={settings.onboardingComplete ? route : "onboarding"} style={{ display: "contents" }}>
        {view}
      </main>
      <DialogHost />
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
