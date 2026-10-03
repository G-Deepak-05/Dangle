import { useEffect, useState } from "react";
import { backend } from "../../ipc/backend";
import { updateProgressStore } from "../../state/stores";
import { useUpdate, useUpdateProgress } from "../hooks";

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/** Seconds since `active` last became true; 0 while inactive. */
export function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    if (!active) return;
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return seconds;
}

/**
 * Shows every step of an update — checking, downloading, installing — so nothing ever
 * looks stuck, and a "Restart to update" prompt once a verified release is waiting.
 */
export function UpdateBanner() {
  const update = useUpdate();
  const progress = useUpdateProgress();
  const [error, setError] = useState<string | null>(null);
  const phase = progress?.phase;
  const elapsed = useElapsed(phase === "checking" || phase === "installing" || phase === "downloading");

  const install = async () => {
    setError(null);
    try {
      await backend.installUpdate();
    } catch (err) {
      setError(typeof err === "string" ? err : "The update couldn't be installed.");
      updateProgressStore.set(null);
    }
  };
  const retryCheck = () => {
    updateProgressStore.set(null);
    void backend.checkForUpdates().catch(() => undefined);
  };

  if (phase === "checking") {
    return (
      <Banner
        title="Checking for updates…"
        detail={
          elapsed >= 10
            ? `Still trying (${elapsed} s). GitHub is slow to reach from your network.`
            : `Contacting GitHub${elapsed > 0 ? ` · ${elapsed} s` : ""}`
        }
        bar={null}
      />
    );
  }
  if (phase === "downloading" && progress) {
    const pct = progress.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null;
    return (
      <Banner
        title={`Downloading Dangle ${update?.version ?? ""}`.trim()}
        detail={
          progress.total
            ? `${mb(progress.downloaded)} of ${mb(progress.total)} MB · ${pct}%`
            : progress.downloaded > 0
              ? `${mb(progress.downloaded)} MB`
              : `Starting download${elapsed > 0 ? ` · ${elapsed} s` : ""}`
        }
        bar={pct}
      />
    );
  }
  if (phase === "installing") {
    return <Banner title="Installing update…" detail="Dangle will restart by itself in a moment." bar={null} />;
  }
  if (phase === "failed" && !update) {
    return (
      <Banner
        title="Couldn't check for updates"
        detail="GitHub didn't answer. Check your connection and try again."
        action={
          <button type="button" className="btn" onClick={retryCheck}>
            Try again
          </button>
        }
      />
    );
  }
  if (!update) return null;

  return (
    <Banner
      title={`Dangle ${update.version} is ready`}
      detail={error ?? "Restart to get the latest charms and fixes."}
      action={
        <button type="button" className="btn btn-primary" onClick={() => void install()}>
          {error ? "Try again" : "Restart to update"}
        </button>
      }
    />
  );
}

/** `bar`: a percentage for a filling bar, null for an indeterminate one, undefined for none. */
function Banner({
  title,
  detail,
  bar,
  action,
}: {
  title: string;
  detail: string;
  bar?: number | null;
  action?: React.ReactNode;
}) {
  const busy = bar !== undefined;
  return (
    <div className="update-banner" role="status" aria-live="polite" aria-busy={busy}>
      <div className="update-banner-row">
        {busy && <span className="update-spinner" aria-hidden />}
        <div className="update-banner-text">
          <strong>{title}</strong>
          <span>{detail}</span>
        </div>
        {action}
      </div>
      {busy && (
        <div
          className={`update-bar${bar === null ? " is-indeterminate" : ""}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={bar ?? undefined}
        >
          <div style={bar === null ? undefined : { width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
