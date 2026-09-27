import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, inCategory, type Charm, type CharmCategory } from "../../charms/types";
import { backend, type Route } from "../../ipc/backend";
import { toggleFavorite, updateSettings } from "../../state/stores";
import { BackBar } from "../components/Controls";
import { HeartIcon, PlusIcon, SearchIcon, TrashIcon } from "../components/Icons";
import { useCharms, useSettings } from "../hooks";

type Filter = CharmCategory | "all" | "favorites";
const FILTERS: Filter[] = ["all", "favorites", ...CATEGORIES];

export function Library({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const settings = useSettings();
  const charms = useCharms();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return charms.filter((c) => {
      const passesFilter =
        filter === "favorites" ? settings.favorites.includes(c.id) : inCategory(c, filter);
      const passesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.category.includes(q) ||
        c.tags.some((t) => t.includes(q)) ||
        (c.metadata.description ?? "").toLowerCase().includes(q);
      return passesFilter && passesQuery;
    });
  }, [charms, filter, query, settings.favorites]);

  const choose = (c: Charm) => {
    void updateSettings({ activeCharmId: c.id });
    onToast(`${c.name} is hanging now`);
  };

  const remove = async (c: Charm) => {
    if (!window.confirm(`Delete “${c.name}”? This can’t be undone.`)) return;
    try {
      await backend.deleteCustomCharm(c.id);
      onToast(`Deleted ${c.name}`);
    } catch (err) {
      onToast(String(err));
    }
  };

  return (
    <div className="view">
      <BackBar title="Charms" onBack={() => go("home")}>
        <button type="button" className="btn" onClick={() => go("create")}>
          <PlusIcon size={14} /> New
        </button>
      </BackBar>

      <div className="search">
        <SearchIcon />
        <input
          ref={searchRef}
          className="input"
          type="search"
          placeholder="Search charms"
          aria-label="Search charms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="chips" role="radiogroup" aria-label="Category">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            className="chip"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} query={query} onCreate={() => go("create")} />
      ) : (
        <div className="grid" role="list">
          {visible.map((c) => {
            const active = c.id === settings.activeCharmId;
            const fav = settings.favorites.includes(c.id);
            return (
              <div className="card-wrap" role="listitem" key={c.id}>
                <button
                  type="button"
                  className="card"
                  aria-pressed={active}
                  aria-label={`${c.name}, ${c.category}${active ? ", hanging now" : ""}`}
                  onClick={() => choose(c)}
                >
                  <span className="card-art">
                    <img src={c.thumbnail} alt="" loading="lazy" draggable={false} />
                  </span>
                  <span className="card-body">
                    <span className="card-name">{c.name}</span>
                    <span className="card-cat">{c.category}</span>
                  </span>
                </button>
                {active && <span className="card-badge">Hanging</span>}
                <div className="card-actions">
                  {c.metadata.source === "custom" && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => void remove(c)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-pressed={fav}
                    aria-label={fav ? `Remove ${c.name} from favorites` : `Add ${c.name} to favorites`}
                    onClick={() => void toggleFavorite(c.id)}
                  >
                    <HeartIcon size={14} filled={fav} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter, query, onCreate }: { filter: Filter; query: string; onCreate: () => void }) {
  const [title, body] = query.trim()
    ? ["Nothing by that name", "Try another word, or make a charm of your own."]
    : filter === "favorites"
      ? ["No favorites yet", "Tap the heart on any charm to keep it here."]
      : filter === "custom"
        ? ["Your charms will live here", "Turn a photo, sticker, or drawing into something that hangs."]
        : ["Nothing here yet", "More charms are on the way."];
  return (
    <div className="empty">
      <HeartIcon size={22} />
      <p className="empty-title">{title}</p>
      <p>{body}</p>
      {(filter === "custom" || query.trim()) && (
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <PlusIcon size={14} /> Create a charm
        </button>
      )}
    </div>
  );
}
