import { useState } from "react";
import { backend, type Route } from "../../ipc/backend";
import { updateSettings } from "../../state/stores";
import { PageHeader } from "../components/Controls";
import { ChevronIcon } from "../components/Icons";
import { useAppInfo } from "../hooks";
import { useElapsed } from "../components/UpdateBanner";
import { Privacy } from "./Privacy";

export function About({ go }: { go: (r: Route) => void }) {
  const info = useAppInfo();
  const [checking, setChecking] = useState(false);
  const elapsed = useElapsed(checking);
  const [result, setResult] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setResult(null);
    try {
      const found = await backend.checkForUpdates();
      setResult(found ? null : "You're on the latest version.");
    } catch (err) {
      setResult(typeof err === "string" ? err : "Couldn't check for updates.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="view">
      <PageHeader title="About" subtitle="A tiny thing for your desktop." />

      <section className="panel about-card">
        <div>
          <p className="wordmark-small" style={{ fontSize: "1.6rem" }}>
            Dangle
          </p>
          <p className="help" style={{ marginTop: 2 }}>
            {info ? `Version ${info.version} · ${info.os} · ${info.arch}` : "Loading…"}
          </p>
          {result && <p className="help">{result}</p>}
        </div>
        <button type="button" className="btn" onClick={() => void check()} disabled={checking}>
          {checking ? `Checking…${elapsed > 0 ? ` ${elapsed} s` : ""}` : "Check for updates"}
        </button>
      </section>

      <div className="group" style={{ marginTop: 18 }}>
        {[
          { label: "Send feedback", hint: "Report a bug or suggest an idea", onClick: () => go("feedback") },
          { label: "Downloads on GitHub", hint: "Release notes and installers", onClick: () => void backend.openReleases() },
          { label: "Replay introduction", hint: "See the welcome screens again", onClick: () => void updateSettings({ onboardingComplete: false }) },
        ].map((row, i) => (
          <button
            key={row.label}
            type="button"
            className="setting"
            style={{
              width: "100%",
              border: 0,
              borderTop: i ? "1px solid var(--line)" : 0,
              background: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onClick={row.onClick}
          >
            <span className="setting-text">
              <span className="setting-label">{row.label}</span>
              <span className="setting-desc">{row.hint}</span>
            </span>
            <ChevronIcon />
          </button>
        ))}
      </div>

      <Privacy embedded />
    </div>
  );
}
