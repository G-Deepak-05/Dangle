import { useEffect, useMemo, useRef, useState } from "react";
import { BUILTIN_COLLECTIONS } from "../../charms/builtin";
import { CATEGORIES, inCategory, type Charm, type CharmCategory } from "../../charms/types";
import { backend, type Route } from "../../ipc/backend";
import {
  chooseCharmForSlot,
  createCollection,
  deleteCollection,
  renameCollection,
  validTargetSlot,
} from "../../state/collections";
import { toggleFavorite } from "../../state/stores";
import { libraryFilterStore, targetSlotStore, type LibraryFilter } from "../../state/ui";
import { CollectionMenu } from "../components/CollectionMenu";
import { confirmDialog, promptDialog } from "../components/Dialog";
import { PageHeader } from "../components/Controls";
import { DesktopStrip } from "../components/DesktopStrip";
import {
  DownloadIcon,
  FolderPlusIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from "../components/Icons";
import { useCharms, useSettings, useStore } from "../hooks";

const sameFilter = (a: LibraryFilter, b: LibraryFilter) =>
  a.kind === b.kind && ("id" in a ? a.id : "") === ("id" in b ? b.id : "");

export function Library({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const settings = useSettings();
  const charms = useCharms();
  const filter = useStore(libraryFilterStore);
  const targetSlot = useStore(targetSlotStore);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CharmCategory | "all">("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);
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

  const userCollection = filter.kind === "user" ? settings.userCollections.find((c) => c.id === filter.id) : undefined;
  const builtinCollection =
    filter.kind === "collection" ? BUILTIN_COLLECTIONS.find((c) => c.id === filter.id) : undefined;

  useEffect(() => {
    if (filter.kind === "user" && !userCollection) libraryFilterStore.set({ kind: "all" });
  }, [filter, userCollection]);

  const currentForSlot =
    targetSlot === 0 ? settings.activeCharmId : settings.extraSlots[targetSlot - 1]?.charmId ?? settings.activeCharmId;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Charm[];
    switch (filter.kind) {
      case "favorites":
        list = charms.filter((c) => settings.favorites.includes(c.id));
        break;
      case "custom":
        list = charms.filter((c) => c.metadata.source === "custom");
        break;
      case "collection":
        list = charms.filter((c) => c.collection === filter.id);
        break;
      case "user":
        list = (userCollection?.charmIds ?? [])
          .map((id) => charms.find((c) => c.id === id))
          .filter((c) => c !== undefined);
        break;
      default:
        list = charms;
    }
    return list.filter(
      (c) =>
        inCategory(c, category) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.category.includes(q) ||
          c.tags.some((t) => t.includes(q)) ||
          (c.metadata.description ?? "").toLowerCase().includes(q)),
    );
  }, [charms, filter, category, query, settings.favorites, userCollection]);

  const choose = (c: Charm) => {
    const slot = validTargetSlot();
    void chooseCharmForSlot(slot, c.id);
    onToast(slot === 0 ? `${c.name} is hanging now` : `${c.name} is charm ${slot + 1} now`);
  };

  const remove = async (c: Charm) => {
    const ok = await confirmDialog({
      title: `Delete “${c.name}”?`,
      body: "This can’t be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await backend.deleteCustomCharm(c.id);
      onToast(`Deleted ${c.name}`);
    } catch (err) {
      onToast(String(err));
    }
  };

  const newCollection = async () => {
    const name = await promptDialog({ title: "Name your collection", initial: "My collection", confirmLabel: "Create" });
    if (name === null) return;
    const id = await createCollection(name);
    libraryFilterStore.set({ kind: "user", id });
    onToast("Collection created. Use + on any charm to add it");
  };

  const importPack = async () => {
    try {
      const result = await backend.importPack();
      if (!result) return;
      libraryFilterStore.set({ kind: "user", id: result.collection.id });
      onToast(
        `Imported ${result.imported} charm${result.imported === 1 ? "" : "s"}${
          result.skipped ? ` (${result.skipped} skipped)` : ""
        }`,
      );
    } catch (err) {
      onToast(typeof err === "string" ? err : "That pack couldn't be imported.");
    }
  };

  const exportPack = async () => {
    if (!userCollection) return;
    try {
      if (await backend.exportPack(userCollection.id)) onToast("Pack saved");
    } catch (err) {
      onToast(typeof err === "string" ? err : "Couldn't save the pack.");
    }
  };

  const rename = async () => {
    if (!userCollection) return;
    const name = await promptDialog({ title: "Rename collection", initial: userCollection.name });
    if (name) void renameCollection(userCollection.id, name);
  };

  const removeCollection = async () => {
    if (!userCollection) return;
    const ok = await confirmDialog({
      title: `Delete “${userCollection.name}”?`,
      body: "The charms themselves stay in your library.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    void deleteCollection(userCollection.id);
    libraryFilterStore.set({ kind: "all" });
  };

  const chips: { filter: LibraryFilter; label: string }[] = [
    { filter: { kind: "all" }, label: "All" },
    { filter: { kind: "favorites" }, label: "Favorites" },
    ...BUILTIN_COLLECTIONS.map((c) => ({ filter: { kind: "collection", id: c.id } as LibraryFilter, label: c.name })),
    { filter: { kind: "custom" }, label: "Made by you" },
    ...settings.userCollections.map((c) => ({ filter: { kind: "user", id: c.id } as LibraryFilter, label: c.name })),
  ];

  return (
    <div className="view">
      <PageHeader title="Charms" subtitle={`${charms.length} charms in ${BUILTIN_COLLECTIONS.length + settings.userCollections.length} collections`}>
        <button type="button" className="btn" onClick={() => go("create")}>
          <PlusIcon size={14} /> New charm
        </button>
      </PageHeader>

      <DesktopStrip go={go} />

      <div className="search">
        <SearchIcon />
        <input
          ref={searchRef}
          className="input"
          type="search"
          placeholder={`Search ${charms.length} charms`}
          aria-label="Search charms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="chips" role="radiogroup" aria-label="Collection">
        {chips.map((c) => (
          <button
            key={`${c.filter.kind}-${"id" in c.filter ? c.filter.id : ""}`}
            type="button"
            role="radio"
            className="chip chip-collection"
            aria-checked={sameFilter(filter, c.filter)}
            onClick={() => libraryFilterStore.set(c.filter)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="chips chips-small" role="radiogroup" aria-label="Category">
        {(["all", ...CATEGORIES.filter((c) => c !== "custom")] as (CharmCategory | "all")[]).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            className="chip"
            aria-checked={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="collection-bar">
        <div>
          {builtinCollection && <p className="collection-desc">{builtinCollection.description}</p>}
          {userCollection && (
            <p className="collection-desc">
              {userCollection.charmIds.length} charm{userCollection.charmIds.length === 1 ? "" : "s"} in{" "}
              {userCollection.name}
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 2 }}>
          {userCollection ? (
            <>
              <button type="button" className="icon-btn" onClick={() => void rename()} aria-label="Rename collection" title="Rename">
                <PencilIcon size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void exportPack()}
                aria-label="Export as pack"
                title="Export as pack"
              >
                <UploadIcon size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void removeCollection()}
                aria-label="Delete collection"
                title="Delete collection"
              >
                <TrashIcon size={15} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => void newCollection()}>
                <FolderPlusIcon size={15} /> New collection
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void importPack()}>
                <DownloadIcon size={15} /> Import pack
              </button>
            </>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} query={query} onCreate={() => go("create")} />
      ) : (
        <div className="grid" role="list">
          {visible.map((c) => {
            const active = c.id === currentForSlot;
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
                    <span className="card-cat">
                      {BUILTIN_COLLECTIONS.find((col) => col.id === c.collection)?.name ??
                        (c.metadata.source === "custom" ? "Made by you" : c.category)}
                    </span>
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
                    aria-label={`Add ${c.name} to a collection`}
                    aria-haspopup="menu"
                    aria-expanded={menuFor === c.id}
                    onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
                  >
                    <FolderPlusIcon size={14} />
                  </button>
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
                {menuFor === c.id && <CollectionMenu charm={c} onClose={() => setMenuFor(null)} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter, query, onCreate }: { filter: LibraryFilter; query: string; onCreate: () => void }) {
  const [title, body] = query.trim()
    ? ["Nothing by that name", "Try another word, or make a charm of your own."]
    : filter.kind === "favorites"
      ? ["No favorites yet", "Tap the heart on any charm to keep it here."]
      : filter.kind === "custom"
        ? ["Your charms will live here", "Turn a photo, sticker, or drawing into something that hangs."]
        : filter.kind === "user"
          ? ["This collection is empty", "Use the folder button on any charm to add it here."]
          : ["Nothing here yet", "Try another category."];
  return (
    <div className="empty">
      <HeartIcon size={22} />
      <p className="empty-title">{title}</p>
      <p>{body}</p>
      {(filter.kind === "custom" || query.trim()) && (
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <PlusIcon size={14} /> Create a charm
        </button>
      )}
    </div>
  );
}
