import { THIS_DEVICE } from "../platform";
import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from "react";
import type { Charm, RopeStyle } from "../../charms/types";
import {
  dataUrlToBase64,
  ImageImportError,
  prepareImage,
  readImageFile,
  type PreparedImage,
  type SourceImage,
} from "../../imaging/process";
import { backend, type Route } from "../../ipc/backend";
import { refreshCustomCharms, stageConfigFor, updateSettings } from "../../state/stores";
import { CharmPreview } from "../components/CharmPreview";
import { BackBar, Segmented, ToggleRow } from "../components/Controls";
import { AlertIcon, CheckIcon, RopeSwatch, UploadIcon } from "../components/Icons";
import { useSettings } from "../hooks";
import { SOUND_LABELS, SOUND_MATERIALS, sounds, type SoundMaterial } from "../../audio/sounds";
import { bulkImport, type BulkProgress } from "../../imaging/bulk";
import { libraryFilterStore } from "../../state/ui";
import { promptDialog } from "../components/Dialog";

type Phase = "empty" | "loading" | "ready" | "saving";

function nameFromFile(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const cleaned = base.slice(0, 40);
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : "My charm";
}

export function CreateCharm({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const settings = useSettings();
  const [phase, setPhase] = useState<Phase>("empty");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [cutBackground, setCutBackground] = useState(true);
  const [name, setName] = useState("");
  const [scale, setScale] = useState(1);
  const [rope, setRope] = useState<RopeStyle>("thread");
  const [sound, setSound] = useState<SoundMaterial>("soft");
  const [bulk, setBulk] = useState<BulkProgress | null>(null);
  const [anchor, setAnchor] = useState({ x: 0.5, y: 0.05 });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => () => source?.bitmap.close(), [source]);

  useEffect(() => {
    if (!source) return;
    const next = prepareImage(source, cutBackground);
    setPrepared(next);
    setAnchor(next.suggestedAnchor);
  }, [source, cutBackground]);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("loading");
    try {
      const img = await readImageFile(file);
      setSource(img);
      setCutBackground(img.backgroundRemovable);
      setName(nameFromFile(file));
      setPhase("ready");
    } catch (err) {
      setError(err instanceof ImageImportError ? err.message : "Something went wrong reading that image.");
      setPhase(source ? "ready" : "empty");
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) void load(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const previewCharm: Charm | null = useMemo(
    () =>
      prepared && {
        id: "custom-preview",
        name: name || "My charm",
        category: "custom",
        tags: [],
        image: prepared.dataUrl,
        thumbnail: prepared.dataUrl,
        defaultScale: scale,
        ropeStyle: rope,
        anchorOffset: anchor,
        metadata: { source: "custom" },
      },
    [prepared, name, scale, rope, anchor],
  );

  const choose = async () => {
    setError(null);
    try {
      const picked = await backend.pickImage();
      if (!picked) return;
      const bytes = Uint8Array.from(atob(picked.base64), (c) => c.charCodeAt(0));
      await load(new File([bytes], picked.name));
    } catch (err) {
      setError(typeof err === "string" ? err : "That file couldn't be opened.");
    }
  };

  const importMany = async () => {
    setError(null);
    let picked: { name: string; base64: string }[];
    try {
      picked = await backend.pickImages();
    } catch (err) {
      setError(typeof err === "string" ? err : "Those files couldn't be opened.");
      return;
    }
    if (picked.length === 0) return;
    const name = await promptDialog({ title: "Name this collection", initial: "My collection", confirmLabel: "Create" });
    if (!name) return;
    setBulk({ done: 0, total: picked.length });
    try {
      const result = await bulkImport(picked, name, setBulk);
      if (result.imported === 0) {
        setError("None of those images could be used. Try PNG, WebP, or JPEG files.");
        return;
      }
      onToast(
        `Made ${result.imported} charm${result.imported === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} skipped)` : ""}`,
      );
      libraryFilterStore.set({ kind: "user", id: result.collectionId });
      go("library");
    } finally {
      setBulk(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void load(e.dataTransfer.files[0]);
  };

  const pickAnchor = (e: MouseEvent<HTMLDivElement>) => {
    if (!prepared) return;
    const box = e.currentTarget.getBoundingClientRect();
    const aspect = prepared.canvas.width / prepared.canvas.height;
    const w = aspect >= 1 ? box.width : box.height * aspect;
    const h = aspect >= 1 ? box.width / aspect : box.height;
    const left = (box.width - w) / 2;
    const top = (box.height - h) / 2;
    const x = Math.min(1, Math.max(0, (e.clientX - box.left - left) / w));
    const y = Math.min(1, Math.max(0, (e.clientY - box.top - top) / h));
    setAnchor({ x, y });
  };

  const dotStyle = () => {
    if (!prepared) return {};
    const aspect = prepared.canvas.width / prepared.canvas.height;
    const w = aspect >= 1 ? 100 : 100 * aspect;
    const h = aspect >= 1 ? 100 / aspect : 100;
    return {
      left: `${(100 - w) / 2 + anchor.x * w}%`,
      top: `${(100 - h) / 2 + anchor.y * h}%`,
    };
  };

  const save = async () => {
    if (!prepared) return;
    setPhase("saving");
    setError(null);
    try {
      const saved = await backend.saveCustomCharm({
        name: name.trim() || "My charm",
        ropeStyle: rope,
        anchorOffset: anchor,
        defaultScale: scale,
        sound,
        pngBase64: dataUrlToBase64(prepared.dataUrl),
      });
      await refreshCustomCharms();
      await updateSettings({ activeCharmId: saved.id });
      onToast(`${saved.name} is hanging now`);
      go("home");
    } catch (err) {
      setError(typeof err === "string" ? err : "Dangle couldn't save that charm. Please try again.");
      setPhase("ready");
    }
  };

  const errorBox = error && (
    <div className="notice notice-error" role="alert">
      <AlertIcon />
      <span>{error}</span>
    </div>
  );

  if (!previewCharm || !prepared) {
    return (
      <div className="view">
        <BackBar title="Create a charm" onBack={() => go("home")} />
        <div
          className="dropzone"
          data-over={dragOver}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {phase === "loading" ? <div className="spinner" aria-label="Preparing image" /> : <UploadIcon size={26} />}
          <p className="dropzone-title">{phase === "loading" ? "Preparing your image…" : "Drop an image here"}</p>
          <p>A PNG or WebP with a transparent background works best. JPEG is fine too.</p>
          <button type="button" className="btn btn-primary" onClick={() => void choose()} disabled={phase === "loading"}>
            Choose a file
          </button>
        </div>
        {errorBox}

        <div className="bulk-card">
          <div>
            <p className="custom-title">Make a whole collection</p>
            <p className="custom-sub">
              {bulk
                ? `Preparing ${Math.min(bulk.done + 1, bulk.total)} of ${bulk.total}…`
                : "Pick up to 60 images at once. Each becomes a charm, grouped into one collection you can share as a pack."}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => void importMany()} disabled={!!bulk}>
            {bulk ? <span className="spinner" aria-label="Importing" /> : "Choose images"}
          </button>
        </div>
        <div className="notice">
          <CheckIcon />
          <span>Your image is processed on {THIS_DEVICE} and stored only here. Nothing is uploaded.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <BackBar title="Create a charm" onBack={() => go("home")} />

      <CharmPreview
        config={{ ...stageConfigFor(settings, previewCharm), rope, scale, sound }}
        height={280}
        label={`Preview of ${previewCharm.name}`}
      >
        <p className="stage-hint">Give it a swing</p>
      </CharmPreview>
      {errorBox}

      <div className="field">
        <label className="field-label" htmlFor="charm-name">
          Name
        </label>
        <input
          id="charm-name"
          className="input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="field">
        <div className="group">
          {source?.hasAlpha ? (
            <div className="setting">
              <span className="setting-label">Transparent background</span>
              <span className="field-note" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <CheckIcon size={14} /> Detected
              </span>
            </div>
          ) : (
            <ToggleRow
              id="cut-bg"
              label="Remove background"
              description={
                source?.backgroundRemovable
                  ? "Cuts away the plain backdrop around your image."
                  : "The background is too busy to remove automatically."
              }
              checked={cutBackground && !!source?.backgroundRemovable}
              onChange={(v) => source?.backgroundRemovable && setCutBackground(v)}
            />
          )}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="charm-scale">
          Size <span className="field-note">{Math.round(scale * 100)}%</span>
        </label>
        <input
          id="charm-scale"
          className="slider"
          type="range"
          min={0.6}
          max={1.5}
          step={0.05}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <div className="field-label">String</div>
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
        <label className="field-label" htmlFor="charm-sound">
          Sound
        </label>
        <div className="row">
          <select
            id="charm-sound"
            className="select"
            value={sound}
            onChange={(e) => {
              const next = e.target.value as SoundMaterial;
              setSound(next);
              sounds.play(next, "release", 0.8);
            }}
          >
            {SOUND_MATERIALS.map((m) => (
              <option key={m} value={m}>
                {SOUND_LABELS[m]}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => sounds.play(sound, "release", 0.8)}>
            Play
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">Hang point</div>
        <div className="row" style={{ alignItems: "center", gap: 14 }}>
          <div
            className="hangpoint"
            onClick={pickAnchor}
            role="button"
            tabIndex={0}
            aria-label="Click where the string should attach"
            onKeyDown={(e) => {
              const step = 0.02;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const m = moves[e.key];
              if (!m) return;
              e.preventDefault();
              setAnchor((a) => ({
                x: Math.min(1, Math.max(0, a.x + m[0])),
                y: Math.min(1, Math.max(0, a.y + m[1])),
              }));
            }}
          >
            <img src={prepared.dataUrl} alt="" />
            <span className="hangpoint-dot" style={dotStyle()} />
          </div>
          <div>
            <p className="help" style={{ marginTop: 0 }}>
              Click the spot where the string should attach. Arrow keys nudge it.
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => setAnchor(prepared.suggestedAnchor)}>
              Auto
            </button>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => void choose()}>
          Choose another
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={phase === "saving"}>
          {phase === "saving" ? "Saving…" : "Save & hang"}
        </button>
      </div>
    </div>
  );
}
