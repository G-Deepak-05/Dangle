import { useCallback, useEffect, useRef, useState } from "react";
import { events, type Route } from "../ipc/backend";
import { useSettings, useSettingsReady } from "./hooks";
import { DialogHost } from "./components/Dialog";
import { CreateCharm } from "./views/CreateCharm";
import { Apps } from "./views/Apps";
import { Appearance } from "./views/Appearance";
import { About } from "./views/About";
import { Sidebar, sectionFor } from "./components/Sidebar";
import { Feedback } from "./views/Feedback";
import { Library } from "./views/Library";
import { Onboarding } from "./views/Onboarding";
import { UpdateBanner } from "./components/UpdateBanner";
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
  const [route, setRoute] = useState<Route>("library");
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
    const unlisten = events.navigate((r) => setRoute(r === "onboarding" || r === "home" ? "library" : r));
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
      if (e.key === "Escape") {
        if (route === "feedback") setRoute("privacy");
        else if (route === "apps") setRoute("create");
      }
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

  if (!settings.onboardingComplete) {
    return (
      <div className="app">
        <div className="titlebar" data-tauri-drag-region />
        <Onboarding />
        <DialogHost />
      </div>
    );
  }

  const view =
    route === "customize" ? (
      <Appearance go={go} />
    ) : route === "create" ? (
      <CreateCharm go={go} onToast={showToast} />
    ) : route === "settings" ? (
      <Settings go={go} onToast={showToast} />
    ) : route === "apps" ? (
      <Apps go={go} onToast={showToast} />
    ) : route === "feedback" ? (
      <Feedback go={go} onToast={showToast} />
    ) : route === "privacy" ? (
      <About go={go} />
    ) : (
      <Library go={go} onToast={showToast} />
    );

  return (
    <div className="shell">
      <Sidebar active={sectionFor(route)} go={go} />
      <main className="main" key={route}>
        <div className="main-titlebar" data-tauri-drag-region />
        <UpdateBanner />
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
