import { KEYS } from "../platform";
import { useEffect, useState } from "react";
import {
  BEADS,
  MAX_THREAD_LENGTH,
  MIN_THREAD_LENGTH,
  THREAD_COLORS,
  type Beads,
  type RopeStyle,
  type ThreadColor,
} from "../../charms/types";
import { backend, events, type DisplayInfo, type Route } from "../../ipc/backend";
import type { CharmSize, PhysicsProfileName } from "../../physics/profiles";
import { paletteFor } from "../../render/rope";
import { ropeFor, stageConfigFor, updateSettings } from "../../state/stores";
import { CharmPreview } from "../components/CharmPreview";
import { BackBar, Segmented } from "../components/Controls";
import { RopeSwatch } from "../components/Icons";
import { useActiveCharm, useSettings } from "../hooks";

const PHYSICS_HELP: Record<PhysicsProfileName, string> = {
  calm: "Settles quickly with small, soft swings.",
  normal: "A natural, balanced swing.",
  bouncy: "Lively. Swings longer and reacts more.",
};

const BEAD_LABELS: Record<Beads, string> = {
  none: "None",
  pearl: "Pearls",
  wood: "Wood",
  glass: "Glass",
  star: "Stars",
};

export function Customize({ go }: { go: (r: Route) => void }) {
  const settings = useSettings();
  const charm = useActiveCharm();
  const rope = ropeFor(settings, charm);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    void backend.listDisplays().then(setDisplays).catch(() => setDisplays([]));
    const unlisten = events.displaysChanged(setDisplays);
    return () => void unlisten.then((u) => u());
  }, []);

  const set = (patch: Parameters<typeof updateSettings>[0]) => {
    void updateSettings(patch);
    setNudge((n) => n + 1);
  };

  const setRope = (r: RopeStyle) => set({ ropeByCharm: { ...settings.ropeByCharm, [charm.id]: r } });
  const lengthPct = Math.round(settings.threadLength * 100);

  return (
    <div className="view">
      <BackBar title="Customize" onBack={() => go("home")} />

      <CharmPreview
        config={stageConfigFor(settings, charm)}
        height={Math.round(Math.min(340, 170 + 70 * settings.threadLength))}
        label={`Preview of ${charm.name}`}
        nudgeKey={nudge}
        onThreadLengthCommit={(threadLength) => void updateSettings({ threadLength })}
      >
        <p className="stage-hint">{KEYS.reelHint} and drag to pull out more string</p>
      </CharmPreview>

      <div className="field">
        <div className="field-label">Charm size</div>
        <Segmented<CharmSize>
          label="Charm size"
          value={settings.size}
          onChange={(size) => set({ size })}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
        />
      </div>

      <div className="field">
        <div className="field-label">
          String <span className="field-note">for {charm.name}</span>
        </div>
        <Segmented<RopeStyle>
          label="String style"
          value={rope}
          onChange={setRope}
          options={(["minimal", "thread", "cord", "chain"] as RopeStyle[]).map((r) => ({
            value: r,
            label: r[0].toUpperCase() + r.slice(1),
            icon: <RopeSwatch style={r} />,
          }))}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="thread-length">
          String length <span className="field-note">{lengthPct}%</span>
        </label>
        <input
          id="thread-length"
          className="slider"
          type="range"
          min={MIN_THREAD_LENGTH}
          max={MAX_THREAD_LENGTH}
          step={0.05}
          value={settings.threadLength}
          aria-valuetext={`${lengthPct} percent`}
          onChange={(e) => void updateSettings({ threadLength: Number(e.target.value) })}
        />
        <div className="slider-ends">
          <span>Short</span>
          <span>Long</span>
        </div>
      </div>

      <div className="field">
        <div className="field-label">String color</div>
        <div className="swatches" role="radiogroup" aria-label="String color">
          {THREAD_COLORS.map((c: ThreadColor) => {
            const pal = paletteFor(rope, c);
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={settings.threadColor === c}
                aria-label={c === "classic" ? "Classic (matches the string style)" : c}
                title={c[0].toUpperCase() + c.slice(1)}
                className="swatch"
                style={{ background: `linear-gradient(135deg, ${pal.main} 55%, ${pal.light} 55%)` }}
                onClick={() => set({ threadColor: c })}
              />
            );
          })}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Beads</div>
        <Segmented<Beads>
          label="Beads"
          value={settings.beads}
          onChange={(beads) => set({ beads })}
          options={BEADS.map((b) => ({ value: b, label: BEAD_LABELS[b] }))}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="position">
          Position
        </label>
        <input
          id="position"
          className="slider"
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={settings.anchorX}
          aria-valuetext={`${Math.round(settings.anchorX * 100)} percent from the left`}
          onChange={(e) => void updateSettings({ anchorX: Number(e.target.value) })}
        />
        <div className="slider-ends">
          <span>Left</span>
          <span>Right</span>
        </div>
      </div>

      {displays.length > 1 && (
        <div className="field">
          <label className="field-label" htmlFor="display">
            Display
          </label>
          <select
            id="display"
            className="select"
            value={settings.displayId ?? displays.find((d) => d.isPrimary)?.id ?? ""}
            onChange={(e) => void updateSettings({ displayId: e.target.value })}
          >
            {displays.map((d, i) => (
              <option key={d.id} value={d.id}>
                {d.isPrimary ? "Primary display" : `Display ${i + 1}`}
                {/^monitor #/i.test(d.label) ? "" : ` — ${d.label}`} ({d.width}×{d.height})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <div className="field-label">Motion</div>
        <Segmented<PhysicsProfileName>
          label="Motion"
          value={settings.physics}
          onChange={(physics) => set({ physics })}
          options={[
            { value: "calm", label: "Calm" },
            { value: "normal", label: "Normal" },
            { value: "bouncy", label: "Bouncy" },
          ]}
        />
        <p className="help">
          {settings.reduceMotion ? "Reduce Motion is on, so swings stay small." : PHYSICS_HELP[settings.physics]}
        </p>
      </div>

      <div className="row" style={{ marginTop: 22 }}>
        <button type="button" className="btn btn-ghost" onClick={() => void backend.resetPosition()}>
          Reset position
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => set({ threadLength: 1, threadColor: "classic", beads: "none" })}
        >
          Reset string
        </button>
      </div>
    </div>
  );
}
