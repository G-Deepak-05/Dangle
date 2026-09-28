import { THIS_DEVICE } from "../platform";
import type { Route } from "../../ipc/backend";
import { stageConfigFor, toggleFavorite, updateSettings } from "../../state/stores";
import { CharmPreview } from "../components/CharmPreview";
import { ChevronIcon, GearIcon, HeartIcon, PauseIcon, PlayIcon, PlusIcon } from "../components/Icons";
import { useActiveCharm, useCharms, useSettings } from "../hooks";
import { UpdateBanner } from "../components/UpdateBanner";

const COLLECTION_PREVIEW = 10;

export function Home({ go }: { go: (r: Route) => void }) {
  const settings = useSettings();
  const charm = useActiveCharm();
  const charms = useCharms();
  const favorite = settings.favorites.includes(charm.id);

  const ordered = [
    ...charms.filter((c) => settings.favorites.includes(c.id)),
    ...charms.filter((c) => !settings.favorites.includes(c.id)),
  ].slice(0, COLLECTION_PREVIEW);

  const status = settings.hidden ? "hidden" : settings.paused ? "paused" : "live";
  const statusText = { live: "Hanging on your desktop", paused: "Paused", hidden: "Hidden" }[status];

  return (
    <div className="view">
      <header className="header" data-tauri-drag-region>
        <div data-tauri-drag-region>
          <h1 className="wordmark" data-tauri-drag-region>
            Dangle
          </h1>
          <p className="tagline" data-tauri-drag-region>
            Make your desktop a little more yours.
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={() => go("settings")} aria-label="Settings">
          <GearIcon size={18} />
        </button>
      </header>

      <UpdateBanner />

      <section aria-labelledby="current-heading">
        <h2 className="eyebrow" id="current-heading" style={{ marginBottom: 10 }}>
          Current charm
        </h2>
        <CharmPreview
          config={stageConfigFor(settings, charm)}
          height={Math.round(Math.min(360, 190 + 70 * settings.threadLength))}
          label={`${charm.name}, hanging. Drag to swing it.`}
          onThreadLengthCommit={(threadLength) => void updateSettings({ threadLength })}
        />
        <div className="current-meta">
          <div>
            <p className="current-name">{charm.name}</p>
            <p className="current-sub">
              {charm.metadata.description ?? (charm.metadata.source === "custom" ? "Made by you." : "")}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn fav-btn"
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${charm.name} from favorites` : `Add ${charm.name} to favorites`}
            onClick={() => void toggleFavorite(charm.id)}
          >
            <HeartIcon size={18} filled={favorite} />
          </button>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary btn-wide" onClick={() => go("library")}>
            Change Charm
          </button>
          <button type="button" className="btn btn-wide" onClick={() => go("customize")}>
            Customize
          </button>
        </div>
      </section>

      <section className="section" aria-labelledby="collection-heading">
        <div className="section-head">
          <h2 className="eyebrow" id="collection-heading">
            Your collection
          </h2>
          <button type="button" className="link" onClick={() => go("library")}>
            See all {charms.length}
          </button>
        </div>
        <div className="mini-grid">
          {ordered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="mini-tile"
              aria-pressed={c.id === charm.id}
              aria-label={`Hang ${c.name}`}
              title={c.name}
              onClick={() => void updateSettings({ activeCharmId: c.id })}
            >
              <img src={c.thumbnail} alt="" draggable={false} />
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="custom-heading">
        <h2 className="eyebrow" id="custom-heading" style={{ marginBottom: 10 }}>
          Custom
        </h2>
        <button type="button" className="custom-row" onClick={() => go("create")}>
          <span className="custom-plus">
            <PlusIcon size={18} />
          </span>
          <span className="grow">
            <span className="custom-title">Create your own charm</span>
            <span className="custom-sub">Use any photo or drawing. It never leaves {THIS_DEVICE}.</span>
          </span>
          <ChevronIcon />
        </button>
      </section>

      <footer className="footer">
        <span className="status-pill" role="status">
          <span className="status-dot" data-state={status} />
          {statusText}
        </span>
        <div className="row">
          <button
            type="button"
            className="link"
            onClick={() => void updateSettings({ paused: !settings.paused })}
            aria-label={settings.paused ? "Resume charm" : "Pause charm"}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {settings.paused ? <PlayIcon size={12} /> : <PauseIcon size={12} />}
              {settings.paused ? "Resume" : "Pause"}
            </span>
          </button>
          <button type="button" className="link" onClick={() => go("settings")}>
            Settings
          </button>
          <button type="button" className="link" onClick={() => go("feedback")}>
            Feedback
          </button>
        </div>
      </footer>
    </div>
  );
}
