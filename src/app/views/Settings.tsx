import { backend, type Route } from "../../ipc/backend";
import { updateSettings } from "../../state/stores";
import type { Settings as SettingsShape } from "../../state/settings";
import { BackBar, SettingRow, ToggleRow } from "../components/Controls";
import { ChevronIcon } from "../components/Icons";
import { useSettings } from "../hooks";

export function Settings({ go, onToast }: { go: (r: Route) => void; onToast: (msg: string) => void }) {
  const s = useSettings();
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
          <kbd>⌘ ⌥ D</kbd>
        </SettingRow>
        <SettingRow id="kb-settings" label="Open settings">
          <kbd>⌘ ⌥ ,</kbd>
        </SettingRow>
        <SettingRow id="kb-reel" label="Lengthen or shorten the string">
          <kbd>⌥ drag</kbd>
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
          onClick={() => go("privacy")}
        >
          <span className="setting-label">Privacy</span>
          <ChevronIcon />
        </button>
      </div>

      <div className="footer">
        <span>Dangle 0.1.0</span>
        <button type="button" className="btn btn-danger" onClick={() => void backend.quit()}>
          Quit Dangle
        </button>
      </div>
    </div>
  );
}
