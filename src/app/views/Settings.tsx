import { KEYCAPS } from "../platform";
import { backend, type Route } from "../../ipc/backend";
import { updateSettings } from "../../state/stores";
import type { Settings as SettingsShape } from "../../state/settings";
import { Keys, PageHeader, Segmented, SettingRow, ToggleRow } from "../components/Controls";
import { ChevronIcon } from "../components/Icons";
import { useAppInfo, useSettings, useUpdate } from "../hooks";
import { useState } from "react";
import { useElapsed } from "../components/UpdateBanner";
import { sounds } from "../../audio/sounds";

export function Settings({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const s = useSettings();
  const info = useAppInfo();
  const update = useUpdate();
  const [checking, setChecking] = useState(false);
  const elapsed = useElapsed(checking);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const checkNow = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const found = await backend.checkForUpdates();
      setCheckResult(found ? null : "You're on the latest version.");
    } catch (err) {
      setCheckResult(typeof err === "string" ? err : "Couldn't check for updates.");
    } finally {
      setChecking(false);
    }
  };
  const set = (patch: Partial<SettingsShape>) => void updateSettings(patch);

  return (
    <div className="view">
      <PageHeader title="Settings" subtitle="How Dangle behaves on your computer." />

      <h2 className="eyebrow group-title" style={{ marginTop: 4 }}>
        Desktop
      </h2>
      <div className="group">
        <ToggleRow
          id="login"
          label="Start at login"
          description="Your charm is waiting when you sign in."
          checked={s.startAtLogin}
          onChange={(v) => set({ startAtLogin: v })}
        />
        <ToggleRow
          id="show"
          label="Show Dangle"
          description="Hang your charms on the desktop."
          checked={!s.hidden}
          onChange={(v) => set({ hidden: !v })}
        />
        <SettingRow id="layer" label="Window" description="On the desktop hangs charms over your wallpaper, behind your windows.">
          <Segmented<"top" | "desktop">
            label="Window"
            value={s.alwaysOnTop ? "top" : "desktop"}
            onChange={(v) => set({ alwaysOnTop: v === "top" })}
            options={[
              { value: "top", label: "Always on top" },
              { value: "desktop", label: "On the desktop" },
            ]}
          />
        </SettingRow>
        <ToggleRow
          id="spaces"
          label="Show on all desktops"
          description="Follows you across Spaces."
          checked={s.allSpaces}
          onChange={(v) => set({ allSpaces: v })}
        />
        <ToggleRow
          id="fullscreen"
          label="Hide when an app is full screen"
          description="Stays out of the way of videos, games, and presentations."
          checked={s.hideWhenFullscreen}
          onChange={(v) => set({ hideWhenFullscreen: v })}
        />
      </div>

      <h2 className="eyebrow group-title">Charm</h2>
      <div className="group">
        <ToggleRow
          id="remember"
          label="Remember position"
          description="Put the charm back where you left it after a restart."
          checked={s.rememberPosition}
          onChange={(v) => set({ rememberPosition: v })}
        />
        <ToggleRow
          id="inactive"
          label="Rest when you’re away"
          description="Stop the idle sway after a minute without input."
          checked={s.pauseWhenInactive}
          onChange={(v) => set({ pauseWhenInactive: v })}
        />
        <ToggleRow
          id="reduce"
          label="Reduce motion"
          description="Small, quickly settling movement."
          checked={s.reduceMotion}
          onChange={(v) => set({ reduceMotion: v })}
        />
        <ToggleRow
          id="pause"
          label="Pause charm"
          description="Freeze it in place. Clicks pass straight through."
          checked={s.paused}
          onChange={(v) => set({ paused: v })}
        />
      </div>

      <h2 className="eyebrow group-title">Sound</h2>
      <div className="group">
        <ToggleRow
          id="sound"
          label="Sound effects"
          description="Each charm makes its own sound when you grab and fling it."
          checked={s.soundEnabled}
          onChange={(v) => set({ soundEnabled: v })}
        />
        {s.soundEnabled && (
          <SettingRow id="volume" label="Volume">
            <div className="row" style={{ alignItems: "center", width: 190 }}>
              <input
                className="slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.soundVolume}
                aria-labelledby="volume-label"
                aria-valuetext={`${Math.round(s.soundVolume * 100)} percent`}
                onChange={(e) => set({ soundVolume: Number(e.target.value) })}
                onPointerUp={() => sounds.play("bell", "release", 0.7)}
              />
            </div>
          </SettingRow>
        )}
      </div>

      <h2 className="eyebrow group-title">Keyboard</h2>
      <div className="group">
        <SettingRow id="kb-toggle" label="Show or hide charm">
          <Keys keys={KEYCAPS.toggle} />
        </SettingRow>
        <SettingRow id="kb-settings" label="Open settings">
          <Keys keys={KEYCAPS.settings} />
        </SettingRow>
        <SettingRow id="kb-reel" label="Lengthen or shorten the string">
          <Keys keys={KEYCAPS.reel} />
        </SettingRow>
      </div>

      <h2 className="eyebrow group-title">Updates</h2>
      <div className="group">
        <ToggleRow
          id="updates"
          label="Check for updates automatically"
          description="Looks for a newer version on GitHub every hour. Nothing about you is sent."
          checked={s.checkForUpdates}
          onChange={(v) => set({ checkForUpdates: v })}
        />
        <SettingRow
          id="version"
          label={info ? `Version ${info.version}` : "Version"}
          description={checkResult ?? (update ? `Dangle ${update.version} is available.` : undefined)}
        >
          <button type="button" className="btn" onClick={() => void checkNow()} disabled={checking}>
            {checking ? `Checking…${elapsed > 0 ? ` ${elapsed} s` : ""}` : "Check now"}
          </button>
        </SettingRow>
      </div>

      {import.meta.env.DEV && (
        <>
          <h2 className="eyebrow group-title">Developer</h2>
          <div className="group">
            <ToggleRow
              id="debug"
              label="Physics debug overlay"
              description="FPS, position, velocity, angle, and state on the desktop charm."
              checked={s.debugOverlay}
              onChange={(v) => set({ debugOverlay: v })}
            />
          </div>
        </>
      )}

      <h2 className="eyebrow group-title">More</h2>
      <div className="group">
        <button
          type="button"
          className="setting"
          style={{ width: "100%", border: 0, background: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => {
            void backend.resetPosition();
            onToast("Charm moved back to its spot");
          }}
        >
          <span className="setting-label">Reset position</span>
        </button>
        <button
          type="button"
          className="setting"
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--line)", background: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => set({ onboardingComplete: false })}
        >
          <span className="setting-label">Replay introduction</span>
        </button>
        <button
          type="button"
          className="setting"
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--line)", background: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => go("feedback")}
        >
          <span className="setting-label">Send feedback</span>
          <ChevronIcon />
        </button>
        <button
          type="button"
          className="setting"
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--line)", background: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => go("privacy")}
        >
          <span className="setting-label">Privacy</span>
          <ChevronIcon />
        </button>
      </div>

      <div className="footer">
        <span>Dangle {info?.version ?? ""}</span>
        <button type="button" className="btn btn-danger" onClick={() => void backend.quit()}>
          Quit Dangle
        </button>
      </div>
    </div>
  );
}
