import type { Route } from "../../ipc/backend";
import { addSlot, moveSlot, removeSlot, setSlotAnchor } from "../../state/collections";
import { MAX_EXTRA_SLOTS, type HangMode } from "../../state/settings";
import { findCharm, updateSettings } from "../../state/stores";
import { targetSlotStore } from "../../state/ui";
import { useCharms, useSettings, useStore } from "../hooks";
import { Segmented } from "./Controls";
import { ChevronIcon, CloseIcon, PlusIcon } from "./Icons";

/** The charms currently hanging: pick which one the library fills, reorder, position, remove. */
export function DesktopStrip({ go }: { go: (r: Route) => void }) {
  const settings = useSettings();
  const charms = useCharms();
  const target = useStore(targetSlotStore);
  const stacked = settings.hangMode === "stacked";
  const slots = [{ charmId: settings.activeCharmId, anchorX: settings.anchorX }, ...settings.extraSlots];

  return (
    <section className="strip" aria-labelledby="strip-title">
      <div className="strip-head">
        <div>
          <p className="eyebrow" id="strip-title">
            On your desktop
          </p>
          <p className="strip-title">
            {slots.length === 1 ? "1 charm" : `${slots.length} charms`}
            {stacked && slots.length > 1 ? " on one string" : ""}
          </p>
        </div>
        <Segmented<HangMode>
          label="How they hang"
          value={settings.hangMode}
          onChange={(hangMode) => void updateSettings({ hangMode })}
          options={[
            { value: "separate", label: "Separate strings" },
            { value: "stacked", label: "One string" },
          ]}
        />
      </div>

      <div className={`strip-row${stacked ? " strip-row-stacked" : ""}`}>
        {slots.map((slot, i) => {
          const c = findCharm(charms, slot.charmId);
          const selected = target === i;
          return (
            <div className="strip-card" key={i} data-selected={selected}>
              {stacked && <span className="strip-thread" aria-hidden="true" />}
              <button
                type="button"
                className="strip-art"
                aria-pressed={selected}
                aria-label={`${c.name}. Choose a charm below to replace it.`}
                title="Select, then pick a charm below to replace it"
                onClick={() => targetSlotStore.set(selected ? 0 : i)}
              >
                <img src={c.thumbnail} alt="" draggable={false} />
              </button>
              <span className="strip-name">{c.name}</span>
              {!stacked || i === 0 ? (
                <input
                  className="slider strip-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={slot.anchorX}
                  aria-label={`${c.name} position, left to right`}
                  onChange={(e) => void setSlotAnchor(i, Number(e.target.value))}
                />
              ) : (
                <span className="field-note">#{i + 1} on the string</span>
              )}
              <div className="strip-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${c.name} ${stacked ? "up" : "left"}`}
                  disabled={i === 0}
                  onClick={() => void moveSlot(i, -1)}
                >
                  <ChevronIcon size={13} style={{ transform: stacked ? "rotate(-90deg)" : "rotate(180deg)" }} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${c.name} ${stacked ? "down" : "right"}`}
                  disabled={i === slots.length - 1}
                  onClick={() => void moveSlot(i, 1)}
                >
                  <ChevronIcon size={13} style={{ transform: stacked ? "rotate(90deg)" : undefined }} />
                </button>
                {i > 0 && (
                  <button type="button" className="icon-btn" aria-label={`Remove ${c.name}`} onClick={() => void removeSlot(i)}>
                    <CloseIcon size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {slots.length <= MAX_EXTRA_SLOTS && (
          <button
            type="button"
            className="strip-add"
            onClick={() => {
              void addSlot().then(() => targetSlotStore.set(slots.length));
            }}
          >
            <PlusIcon size={18} />
            <span>Add charm</span>
          </button>
        )}
      </div>
      <p className="help">
        {target > 0 || slots.length > 1
          ? `Selected: ${findCharm(charms, slots[target]?.charmId ?? settings.activeCharmId).name}. Pick any charm below to hang it there.`
          : "Pick any charm below to hang it. Add more to hang several at once."}{" "}
        <button type="button" className="link" onClick={() => go("apps")}>
          Hang an app
        </button>
      </p>
    </section>
  );
}
