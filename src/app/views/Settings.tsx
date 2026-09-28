import { KEYS } from "../platform";
import { backend, type Route } from "../../ipc/backend";
import { updateSettings } from "../../state/stores";
import type { Settings as SettingsShape } from "../../state/settings";
import { BackBar, SettingRow, ToggleRow } from "../components/Controls";
import { ChevronIcon } from "../components/Icons";
import { useAppInfo, useSettings, useUpdate } from "../hooks";
import { useState } from "react";
import { UpdateBanner } from "../components/UpdateBanner";

export function Settings({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const s = useSettings();
  const info = useAppInfo();
  const update = useUpdate();
  const [checking, setChecking] = useState(false);
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
      <BackBar title="Settings" onBack={() => go("home")} />

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
          id="ontop"
          label="Always on top"
          description="Keep the charm above other windows."
          checked={s.alwaysOnTop}
          onChange={(v) => set({ alwaysOnTop: v })}
        />
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
        <ToggleRow id="hidden" label="Hide charm" checked={s.hidden} onChange={(v) => set({ hidden: v })} />
      </div>

      <h2 className="eyebrow group-title">Keyboard</h2>
      <div className="group">
        <SettingRow id="kb-toggle" label="Show or hide charm">
          <kbd>{KEYS.toggle}</kbd>
        </SettingRow>
        <SettingRow id="kb-settings" label="Open settings">
          <kbd>{KEYS.settings}</kbd>
        </SettingRow>
        <SettingRow id="kb-reel" label="Lengthen or shorten the string">
          <kbd>{KEYS.reel}</kbd>
        </SettingRow>
      </div>

      <h2 className="eyebrow group-title">Updates</h2>
      <div className="group">
        <ToggleRow
          id="updates"
          label="Check for updates automatically"
          description="Looks for a newer version on GitHub every few hours. Nothing about you is sent."
          checked={s.checkForUpdates}
          onChange={(v) => set({ checkForUpdates: v })}
        />
        <SettingRow
          id="version"
          label={info ? `Version ${info.version}` : "Version"}
          description={checkResult ?? (update ? `Dangle ${update.version} is available.` : undefined)}
        >
          <button type="button" className="btn" onClick={() => void checkNow()} disabled={checking}>
            {checking ? "Checking…" : "Check now"}
          </button>
        </SettingRow>
      </div>
      {update && (
        <div style={{ marginTop: 10 }}>
          <UpdateBanner />
        </div>
      )}

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
