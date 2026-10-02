import type { ReactNode } from "react";
import type { Route } from "../../ipc/backend";
import { previewHeight, stackFor, stageConfigFor, updateSettings } from "../../state/stores";
import { useActiveCharm, useCharms, useSettings } from "../hooks";
import { CharmPreview } from "./CharmPreview";
import { PauseIcon, PlayIcon } from "./Icons";
import { SidebarIcon } from "./SidebarIcons";

export type Section = "library" | "create" | "appearance" | "settings" | "about";

const NAV: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "library", label: "Charms", icon: <SidebarIcon name="grid" /> },
  { id: "create", label: "Create", icon: <SidebarIcon name="spark" /> },
  { id: "appearance", label: "Appearance", icon: <SidebarIcon name="brush" /> },
  { id: "settings", label: "Settings", icon: <SidebarIcon name="gear" /> },
  { id: "about", label: "About", icon: <SidebarIcon name="info" /> },
];

export function sectionFor(route: Route): Section {
  switch (route) {
    case "create":
    case "apps":
      return "create";
    case "customize":
      return "appearance";
    case "settings":
      return "settings";
    case "privacy":
    case "feedback":
      return "about";
    default:
      return "library";
  }
}

export function Sidebar({ active, go }: { active: Section; go: (r: Route) => void }) {
  const settings = useSettings();
  const charm = useActiveCharm();
  const charms = useCharms();
  const stacked = settings.hangMode === "stacked";
  const count = settings.extraSlots.length + 1;
  const status = settings.hidden ? "Hidden" : settings.paused ? "Paused" : "On your desktop";

  return (
    <aside className="sidebar" aria-label="Dangle">
      <div className="sidebar-brand" data-tauri-drag-region>
        <span className="wordmark-small" data-tauri-drag-region>
          Dangle
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Sections">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-item"
            aria-current={active === item.id ? "page" : undefined}
            onClick={() => go(item.id === "appearance" ? "customize" : item.id === "about" ? "privacy" : item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-preview">
        <CharmPreview
          config={{
            ...stageConfigFor(settings, charm),
            // The sidebar shows a smaller copy so a whole strand fits.
            scale: settings.charmScale * 0.62,
            threadLength: Math.min(settings.threadLength, 1.2),
            stack: stackFor(settings, charms),
          }}
          height={Math.min(
            420,
            Math.max(170, previewHeight({ ...settings, threadLength: Math.min(settings.threadLength, 1.2) }, charms, 0.62)),
          )}
          label={`${charm.name}, your main charm. Drag to swing.`}
        />
        <p className="sidebar-charm">{charm.name}</p>
        <p className="sidebar-sub">
          {count > 1 ? `${count} charms${stacked ? " on one string" : ""}` : charm.metadata.description ?? "Made by you"}
        </p>
      </div>

      <div className="sidebar-foot">
        <span className="status-pill" role="status">
          <span className="status-dot" data-state={settings.hidden ? "hidden" : settings.paused ? "paused" : "live"} />
          {status}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={settings.paused ? "Resume" : "Pause"}
          title={settings.paused ? "Resume" : "Pause"}
          onClick={() => void updateSettings({ paused: !settings.paused })}
        >
          {settings.paused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
        </button>
      </div>
    </aside>
  );
}
