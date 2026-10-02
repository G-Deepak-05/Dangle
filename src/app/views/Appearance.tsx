import { useEffect, useState } from "react";
import { BUILTIN_COLLECTIONS } from "../../charms/builtin";
import {
  BEADS,
  HOOKS,
  MAX_THREAD_LENGTH,
  MIN_THREAD_LENGTH,
  THREAD_COLORS,
  type Beads,
  type Finish,
  type Hook,
  type RopeStyle,
  type ThreadColor,
} from "../../charms/types";
import { backend, events, type DisplayInfo, type Route } from "../../ipc/backend";
import type { CharmSize, PhysicsProfileName } from "../../physics/profiles";
import { paletteFor } from "../../render/rope";
import {
  DEFAULT_SETTINGS,
  type GlowLevel,
  type MouseMode,
  type RopeType,
  type RotateMode,
  type Settings,
} from "../../state/settings";
import { previewHeight, ropeFor, stackFor, stageConfigFor, updateSettings } from "../../state/stores";
import { CharmPreview } from "../components/CharmPreview";
import { PageHeader, Segmented } from "../components/Controls";
import { confirmDialog } from "../components/Dialog";
import { RopeSwatch } from "../components/Icons";
import { useActiveCharm, useCharms, useSettings } from "../hooks";
import { KEYS } from "../platform";

const FINISH_OPTIONS: { value: Finish; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "glossy", label: "Glossy" },
  { value: "matte", label: "Matte" },
  { value: "sticker", label: "Sticker" },
];

const HOOK_LABELS: Record<Hook, string> = {
  clip: "Clip",
  pin: "Pin",
  bow: "Bow",
  suction: "Suction",
  nail: "Nail",
  none: "None",
};

const BEAD_LABELS: Record<Beads, string> = { none: "None", pearl: "Pearls", wood: "Wood", glass: "Glass", star: "Stars" };

const PHYSICS_HELP: Record<PhysicsProfileName, string> = {
  calm: "Settles quickly with small, soft swings.",
  normal: "A natural, balanced swing.",
  bouncy: "Lively. Swings longer and reacts more.",
};

/** Everything "Reset to default" restores: how charms look and move, not what hangs. */
const LOOK_KEYS: (keyof Settings)[] = [
  "size",
  "charmScale",
  "opacity",
  "glow",
  "finish",
  "shadow",
  "hook",
  "threadLength",
  "threadColor",
  "beads",
  "ropeType",
  "physics",
  "mouseMode",
  "anchorX",
  "anchorY",
  "rotate",
];

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  ends,
  valueText,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  ends: [string, string];
  valueText: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label} <span className="field-note">{valueText}</span>
      </label>
      <div className="slider-row">
        <span className="slider-end">{ends[0]}</span>
        <input
          id={id}
          className="slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={valueText}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-end">{ends[1]}</span>
      </div>
    </div>
  );
}

export function Appearance(_: { go: (r: Route) => void }) {
  const settings = useSettings();
  const charm = useActiveCharm();
  const charms = useCharms();
  const rope = ropeFor(settings, charm);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    void backend.listDisplays().then(setDisplays).catch(() => setDisplays([]));
    const unlisten = events.displaysChanged(setDisplays);
    return () => void unlisten.then((u) => u());
  }, []);

  const set = (patch: Partial<Settings>) => {
    void updateSettings(patch);
    setNudge((n) => n + 1);
  };

  const reset = async () => {
    const ok = await confirmDialog({
      title: "Reset appearance?",
      body: "Size, string, finish, motion, and position go back to how they were when Dangle was installed. Your charms stay.",
      confirmLabel: "Reset",
    });
    if (!ok) return;
    const patch = Object.fromEntries(LOOK_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])) as Partial<Settings>;
    set({ ...patch, ropeByCharm: {} });
  };

  return (
    <div className="view">
      <PageHeader title="Appearance" subtitle="How your charms look, hang, and move.">
        <button type="button" className="btn" onClick={() => void reset()}>
          Reset to default
        </button>
      </PageHeader>

      <div className="appearance-layout">
        <div className="appearance-preview">
          <CharmPreview
            config={{ ...stageConfigFor(settings, charm), stack: stackFor(settings, charms) }}
            height={Math.min(640, Math.max(300, previewHeight(settings, charms)))}
            label={`Preview of ${charm.name}`}
            nudgeKey={nudge}
            onThreadLengthCommit={(threadLength) => void updateSettings({ threadLength })}
          >
            <p className="stage-hint stage-hint-top">{KEYS.reelHint} and drag to pull out more string</p>
          </CharmPreview>
        </div>

        <div className="appearance-controls">
          <section className="panel">
            <h2 className="panel-title">Position</h2>
            <Slider
              id="anchor-x"
              label="Horizontal position"
              value={settings.anchorX}
              min={0}
              max={1}
              step={0.005}
              ends={["Left", "Right"]}
              valueText={`${Math.round(settings.anchorX * 100)}%`}
              onChange={(anchorX) => void updateSettings({ anchorX })}
            />
            <Slider
              id="anchor-y"
              label="Vertical position"
              value={settings.anchorY}
              min={0}
              max={0.45}
              step={0.005}
              ends={["Top", "Lower"]}
              valueText={settings.anchorY === 0 ? "From the top edge" : `${Math.round(settings.anchorY * 100)}% down`}
              onChange={(anchorY) => void updateSettings({ anchorY })}
            />
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
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => void updateSettings({ anchorX: DEFAULT_SETTINGS.anchorX, anchorY: 0, displayId: null })}
            >
              Reset position
            </button>
          </section>

          <section className="panel">
            <h2 className="panel-title">Charm</h2>
            <div className="field">
              <div className="field-label">Size</div>
              <Segmented<CharmSize>
                label="Size"
                value={settings.size}
                onChange={(size) => set({ size })}
                options={[
                  { value: "small", label: "Small" },
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                ]}
              />
            </div>
            <Slider
              id="charm-scale"
              label="Fine size"
              value={settings.charmScale}
              min={0.6}
              max={1.8}
              step={0.05}
              ends={["Smaller", "Bigger"]}
              valueText={`${Math.round(settings.charmScale * 100)}%`}
              onChange={(charmScale) => void updateSettings({ charmScale })}
            />
            <Slider
              id="own-size"
              label={`Size of ${charm.name}`}
              value={settings.scaleByCharm[charm.id] ?? 1}
              min={0.4}
              max={2.5}
              step={0.05}
              ends={["Smaller", "Bigger"]}
              valueText={`${Math.round((settings.scaleByCharm[charm.id] ?? 1) * 100)}%`}
              onChange={(v) => void updateSettings({ scaleByCharm: { ...settings.scaleByCharm, [charm.id]: v } })}
            />
            <p className="help" style={{ marginTop: -4 }}>
              Tip: scroll or pinch over any charm on your desktop to resize just that one.
            </p>
            <Slider
              id="opacity"
              label="Opacity"
              value={settings.opacity}
              min={0.25}
              max={1}
              step={0.05}
              ends={["Faint", "Solid"]}
              valueText={`${Math.round(settings.opacity * 100)}%`}
              onChange={(opacity) => void updateSettings({ opacity })}
            />
            <div className="field">
              <div className="field-label">Glow</div>
              <Segmented<GlowLevel>
                label="Glow"
                value={settings.glow}
                onChange={(glow) => set({ glow })}
                options={[
                  { value: "off", label: "Off" },
                  { value: "soft", label: "Soft" },
                  { value: "strong", label: "Strong" },
                ]}
              />
            </div>
            <div className="field">
              <div className="field-label">Finish</div>
              <Segmented<Finish>
                label="Finish"
                value={settings.finish === "glow" ? "classic" : settings.finish}
                onChange={(finish) => set({ finish })}
                options={FINISH_OPTIONS}
              />
              <label className="checkbox-row">
                <input type="checkbox" checked={settings.shadow} onChange={(e) => set({ shadow: e.target.checked })} />
                <span>Soft shadow</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">String</h2>
            <div className="field">
              <div className="field-label">
                Style <span className="field-note">for {charm.name}</span>
              </div>
              <Segmented<RopeStyle>
                label="String style"
                value={rope}
                onChange={(r) => set({ ropeByCharm: { ...settings.ropeByCharm, [charm.id]: r } })}
                options={(["minimal", "thread", "cord", "chain"] as RopeStyle[]).map((r) => ({
                  value: r,
                  label: r[0].toUpperCase() + r.slice(1),
                  icon: <RopeSwatch style={r} />,
                }))}
              />
            </div>
            <Slider
              id="thread-length"
              label="Length"
              value={settings.threadLength}
              min={MIN_THREAD_LENGTH}
              max={MAX_THREAD_LENGTH}
              step={0.05}
              ends={["Short", "Long"]}
              valueText={`${Math.round(settings.threadLength * 100)}%`}
              onChange={(threadLength) => void updateSettings({ threadLength })}
            />
            <div className="field">
              <div className="field-label">Color</div>
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
              <div className="field-label">Hook</div>
              <div className="segmented segmented-wrap" role="radiogroup" aria-label="Hook">
                {HOOKS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    role="radio"
                    className="segment"
                    aria-checked={settings.hook === h}
                    onClick={() => set({ hook: h })}
                  >
                    {HOOK_LABELS[h]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field-label">Rope type</div>
              <Segmented<RopeType>
                label="Rope type"
                value={settings.ropeType}
                onChange={(ropeType) => set({ ropeType })}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "elastic", label: "Elastic" },
                ]}
              />
              <p className="help">Elastic stretches like a bungee when you pull, then springs back.</p>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Motion</h2>
            <div className="field">
              <div className="field-label">Swing</div>
              <Segmented<PhysicsProfileName>
                label="Swing"
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
            <div className="field">
              <div className="field-label">Mouse interaction</div>
              <Segmented<MouseMode>
                label="Mouse interaction"
                value={settings.mouseMode}
                onChange={(mouseMode) => void updateSettings({ mouseMode })}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "reactive", label: "Reactive" },
                ]}
              />
              <p className="help">Reactive: flick the cursor past a charm and it swings away from it.</p>
            </div>
            <div className="field">
              <div className="field-label">Auto-rotate</div>
              <Segmented<RotateMode>
                label="Auto-rotate"
                value={settings.rotate}
                onChange={(rotate) => void updateSettings({ rotate })}
                options={[
                  { value: "off", label: "Off" },
                  { value: "hourly", label: "Every hour" },
                  { value: "daily", label: "Every day" },
                ]}
              />
              {settings.rotate !== "off" && (
                <select
                  className="select"
                  style={{ marginTop: 8 }}
                  aria-label="Rotate through"
                  value={settings.rotateSource}
                  onChange={(e) => void updateSettings({ rotateSource: e.target.value })}
                >
                  <option value="favorites">Your favorites ({settings.favorites.length})</option>
                  <option value="all">All charms</option>
                  {BUILTIN_COLLECTIONS.map((c) => (
                    <option key={c.id} value={`collection:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                  {settings.userCollections.map((c) => (
                    <option key={c.id} value={`collection:${c.id}`}>
                      {c.name} (yours)
                    </option>
                  ))}
                </select>
              )}
              <p className="help">Swaps the main charm on its own for a little surprise.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
