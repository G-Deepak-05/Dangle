import { useEffect, useRef, useState } from "react";
import type { Charm } from "../../charms/types";
import { createCollection, toggleInCollection } from "../../state/collections";
import { CheckIcon, PlusIcon } from "./Icons";
import { useSettings } from "../hooks";

/** Small popover listing your collections, with a tick next to the ones holding this charm. */
export function CollectionMenu({ charm, onClose }: { charm: Charm; onClose: () => void }) {
  const settings = useSettings();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const create = async () => {
    if (!name.trim()) return;
    await createCollection(name, [charm.id]);
    onClose();
  };

  return (
    <div className="menu" ref={ref} role="menu" aria-label={`Add ${charm.name} to a collection`}>
      <p className="menu-title">Add to collection</p>
      {settings.userCollections.map((c) => {
        const inIt = c.charmIds.includes(charm.id);
        return (
          <button
            key={c.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={inIt}
            className="menu-item"
            onClick={() => void toggleInCollection(c.id, charm.id)}
          >
            <span className="menu-check">{inIt && <CheckIcon size={13} />}</span>
            {c.name}
          </button>
        );
      })}
      {naming ? (
        <form
          className="menu-new"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input
            className="input"
            autoFocus
            maxLength={40}
            placeholder="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Add
          </button>
        </form>
      ) : (
        <button type="button" className="menu-item" onClick={() => setNaming(true)}>
          <span className="menu-check">
            <PlusIcon size={13} />
          </span>
          New collection…
        </button>
      )}
    </div>
  );
}
